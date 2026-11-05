/**
 * Private Supabase Storage-backed educational video library.
 */

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateUser, requireAdmin, requireServiceRole } = require('../middleware/auth');

const router = express.Router();
const BUCKET = 'pet-care-videos';
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 60;
const CATEGORIES = new Set([
  'Dog Care',
  'Cat Care',
  'Pet Nutrition',
  'Pet Training',
  'Pet Health',
  'Vaccination Awareness',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES, files: 2, fields: 8, parts: 10 },
  fileFilter: (_req, file, callback) => {
    if (!['video', 'thumbnail'].includes(file.fieldname)) {
      return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
    callback(null, true);
  },
});

function receiveFiles(req, res, next) {
  upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }])(
    req,
    res,
    error => {
      if (!error) return next();
      if (error instanceof multer.MulterError) {
        const message = error.code === 'LIMIT_FILE_SIZE'
          ? 'Video files must be no larger than 100 MB.'
          : 'The uploaded files are invalid or exceed the upload limits.';
        return res.status(400).json({ success: false, message });
      }
      console.error('[pet-care-videos upload]', error);
      return res.status(500).json({ success: false, message: 'Could not receive the uploaded files.' });
    }
  );
}

function fileSignatureIsValid(file, kind) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const bytes = file.buffer;

  if (kind === 'video') {
    if (file.size > MAX_VIDEO_BYTES) return false;
    if (extension === '.webm') {
      return file.mimetype === 'video/webm' &&
        bytes.length >= 4 &&
        bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    }
    if (['.mp4', '.mov'].includes(extension)) {
      const supportedMime = extension === '.mov'
        ? file.mimetype === 'video/quicktime'
        : file.mimetype === 'video/mp4';
      return supportedMime &&
        bytes.length >= 8 &&
        bytes.toString('ascii', 4, 8) === 'ftyp';
    }
    return false;
  }

  if (file.size > MAX_THUMBNAIL_BYTES) return false;
  if (extension === '.jpg' || extension === '.jpeg') {
    return file.mimetype === 'image/jpeg' &&
      bytes.length >= 3 &&
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (extension === '.png') {
    return file.mimetype === 'image/png' &&
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (extension === '.webp') {
    return file.mimetype === 'image/webp' &&
      bytes.length >= 12 &&
      bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
}

function validateMetadata(body, { creating = false, files = {} } = {}) {
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const category = String(body.category || '').trim();
  const visibility = body.is_public === undefined ? 'true' : String(body.is_public);
  const videoFile = files.video?.[0];
  const thumbnailFile = files.thumbnail?.[0];

  if (!title || title.length > 160) return { error: 'Enter a title between 1 and 160 characters.' };
  if (description.length > 3000) return { error: 'Description must be 3,000 characters or fewer.' };
  if (!CATEGORIES.has(category)) return { error: 'Choose a supported pet-care video category.' };
  if (!['true', 'false'].includes(visibility)) return { error: 'Video visibility must be public or private.' };
  if (creating && !videoFile) return { error: 'Choose a video file to upload.' };
  if (videoFile && !fileSignatureIsValid(videoFile, 'video')) {
    return { error: 'Use a valid MP4, WebM, or MOV video file (maximum 100 MB).' };
  }
  if (thumbnailFile && !fileSignatureIsValid(thumbnailFile, 'thumbnail')) {
    return { error: 'Use a valid JPEG, PNG, or WebP thumbnail (maximum 5 MB).' };
  }

  return {
    values: {
      title,
      description: description || null,
      category,
      is_public: visibility === 'true',
    },
    videoFile,
    thumbnailFile,
    removeThumbnail: body.remove_thumbnail === 'true',
  };
}

async function uploadObject(file, folder) {
  const extension = path.extname(file.originalname).toLowerCase();
  const objectPath = `${folder}/${crypto.randomUUID()}${extension}`;
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(objectPath, file.buffer, {
    contentType: file.mimetype,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return objectPath;
}

async function removeObjects(objectPaths) {
  const paths = objectPaths.filter(Boolean);
  if (!paths.length) return null;
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove(paths);
  return error;
}

async function signRecord(record, storageClient) {
  const signedVideo = await storageClient.storage
    .from(BUCKET)
    .createSignedUrl(record.video_url, SIGNED_URL_SECONDS);
  if (signedVideo.error) throw new Error(`Could not create a video playback link: ${signedVideo.error.message}`);

  let signedThumbnailUrl = null;
  if (record.thumbnail_url) {
    const signedThumbnail = await storageClient.storage
      .from(BUCKET)
      .createSignedUrl(record.thumbnail_url, SIGNED_URL_SECONDS);
    if (signedThumbnail.error) {
      throw new Error(`Could not create a thumbnail link: ${signedThumbnail.error.message}`);
    }
    signedThumbnailUrl = signedThumbnail.data.signedUrl;
  }

  return {
    ...record,
    video_url: signedVideo.data.signedUrl,
    thumbnail_url: signedThumbnailUrl,
  };
}

async function signRecords(records, storageClient) {
  return Promise.all(records.map(record => signRecord(record, storageClient)));
}

function reportStorageFailure(res, error, action) {
  console.error(`[pet-care-videos ${action}]`, error);
  return res.status(500).json({ success: false, message: `Could not ${action} pet-care video.` });
}

router.get('/admin', authenticateUser, requireAdmin, requireServiceRole, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('pet_care_videos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false, message: 'Could not load the admin video library.' });

    return res.status(200).json({ success: true, data: await signRecords(data || [], supabaseAdmin) });
  } catch (error) {
    return reportStorageFailure(res, error, 'load admin library');
  }
});

router.get('/', async (req, res) => {
  try {
    const { category, page = '1', limit = '24' } = req.query;
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 24));
    const offset = (pageNumber - 1) * pageSize;
    let query = supabase
      .from('pet_care_videos')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (category) query = query.eq('category', String(category).slice(0, 80));

    const { data, error, count } = await query;
    if (error) {
      console.error('[pet-care-videos GET /] Supabase query failed:', error.message);
      return res.status(500).json({ success: false, message: 'Could not load pet-care videos.' });
    }
    return res.status(200).json({
      success: true,
      data: await signRecords(data || [], supabase),
      pagination: {
        total: count || 0,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    return reportStorageFailure(res, error, 'load public library');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pet_care_videos')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_public', true)
      .maybeSingle();
    if (error) return res.status(500).json({ success: false, message: 'Could not load this video.' });
    if (!data) return res.status(404).json({ success: false, message: 'Video not found.' });
    return res.status(200).json({ success: true, data: await signRecord(data, supabase) });
  } catch (error) {
    return reportStorageFailure(res, error, 'load video');
  }
});

router.post('/', authenticateUser, requireAdmin, requireServiceRole, receiveFiles, async (req, res) => {
  const parsed = validateMetadata(req.body, { creating: true, files: req.files || {} });
  if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });

  const uploadedPaths = [];
  let recordSaved = false;
  try {
    const videoPath = await uploadObject(parsed.videoFile, 'videos');
    uploadedPaths.push(videoPath);
    let thumbnailPath = null;
    if (parsed.thumbnailFile) {
      thumbnailPath = await uploadObject(parsed.thumbnailFile, 'thumbnails');
      uploadedPaths.push(thumbnailPath);
    }

    const { data, error } = await supabaseAdmin
      .from('pet_care_videos')
      .insert({
        ...parsed.values,
        video_url: videoPath,
        thumbnail_url: thumbnailPath,
      })
      .select('*')
      .single();
    if (error) {
      const cleanupError = await removeObjects(uploadedPaths);
      if (cleanupError) console.error('[pet-care-videos create cleanup]', cleanupError.message);
      return res.status(500).json({ success: false, message: 'Video files were uploaded, but their catalog record could not be saved.' });
    }
    recordSaved = true;

    return res.status(201).json({
      success: true,
      message: 'Pet-care video uploaded.',
      data: await signRecord(data, supabaseAdmin),
    });
  } catch (error) {
    if (!recordSaved) {
      const cleanupError = await removeObjects(uploadedPaths);
      if (cleanupError) console.error('[pet-care-videos create cleanup]', cleanupError.message);
    }
    return reportStorageFailure(res, error, 'upload video');
  }
});

router.put('/:id', authenticateUser, requireAdmin, requireServiceRole, receiveFiles, async (req, res) => {
  const parsed = validateMetadata(req.body, { files: req.files || {} });
  if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
  if (parsed.removeThumbnail && parsed.thumbnailFile) {
    return res.status(400).json({ success: false, message: 'Choose either a new thumbnail or remove the current one.' });
  }

  const { data: current, error: readError } = await supabaseAdmin
    .from('pet_care_videos')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (readError) return res.status(500).json({ success: false, message: 'Could not load the video to edit.' });
  if (!current) return res.status(404).json({ success: false, message: 'Video not found.' });

  const uploadedPaths = [];
  let recordUpdated = false;
  const updates = { ...parsed.values };
  try {
    if (parsed.videoFile) {
      updates.video_url = await uploadObject(parsed.videoFile, 'videos');
      uploadedPaths.push(updates.video_url);
    }
    if (parsed.thumbnailFile) {
      updates.thumbnail_url = await uploadObject(parsed.thumbnailFile, 'thumbnails');
      uploadedPaths.push(updates.thumbnail_url);
    } else if (parsed.removeThumbnail) {
      updates.thumbnail_url = null;
    }

    const { data, error } = await supabaseAdmin
      .from('pet_care_videos')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) {
      const cleanupError = await removeObjects(uploadedPaths);
      if (cleanupError) console.error('[pet-care-videos edit cleanup]', cleanupError.message);
      return res.status(500).json({ success: false, message: 'Video changes could not be saved.' });
    }
    recordUpdated = true;

    const replacedPaths = [];
    if (parsed.videoFile) replacedPaths.push(current.video_url);
    if (parsed.thumbnailFile || parsed.removeThumbnail) replacedPaths.push(current.thumbnail_url);
    const cleanupError = await removeObjects(replacedPaths);
    if (cleanupError) {
      console.error('[pet-care-videos edit old-file cleanup]', cleanupError.message);
      return res.status(500).json({
        success: false,
        message: 'Video details were saved, but an older storage file could not be removed.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Pet-care video updated.',
      data: await signRecord(data, supabaseAdmin),
    });
  } catch (error) {
    if (!recordUpdated) {
      const cleanupError = await removeObjects(uploadedPaths);
      if (cleanupError) console.error('[pet-care-videos edit cleanup]', cleanupError.message);
    }
    return reportStorageFailure(res, error, 'update video');
  }
});

router.delete('/:id', authenticateUser, requireAdmin, requireServiceRole, async (req, res) => {
  try {
    const { data: current, error: readError } = await supabaseAdmin
      .from('pet_care_videos')
      .select('id, video_url, thumbnail_url')
      .eq('id', req.params.id)
      .maybeSingle();
    if (readError) return res.status(500).json({ success: false, message: 'Could not load the video to delete.' });
    if (!current) return res.status(404).json({ success: false, message: 'Video not found.' });

    const { error: deleteError } = await supabaseAdmin
      .from('pet_care_videos')
      .delete()
      .eq('id', req.params.id);
    if (deleteError) return res.status(500).json({ success: false, message: 'Could not delete the video record.' });

    const storageError = await removeObjects([current.video_url, current.thumbnail_url]);
    if (storageError) {
      console.error('[pet-care-videos delete storage cleanup]', storageError.message);
      return res.status(500).json({
        success: false,
        message: 'The catalog record was deleted, but a storage file could not be removed.',
      });
    }
    return res.status(200).json({ success: true, message: 'Video record and storage files deleted.' });
  } catch (error) {
    return reportStorageFailure(res, error, 'delete video');
  }
});

module.exports = router;
