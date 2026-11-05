/**
 * routes/videos.js
 * Educational / care video endpoints.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateUser, requireAdmin, requireServiceRole } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/videos
// List all videos with optional category and search filters.
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 12));
    const offset = (pageNumber - 1) * pageSize;

    let query = supabase
      .from('videos')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (category) query = query.eq('category', String(category).slice(0, 100));

    if (search) {
      const term = String(search).replace(/[,%()]/g, ' ').trim().slice(0, 100);
      if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[videos GET /] Supabase query failed:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      pagination: {
        total: count,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (err) {
    console.error('[videos GET /]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/videos/:id
// Get a single video by ID.
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const { data: video, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    return res.status(200).json({ success: true, data: video });
  } catch (err) {
    console.error('[videos GET /:id]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/videos   (Admin)
// Add a new video entry.
// ---------------------------------------------------------------------------
router.post(
  '/',
  authenticateUser,
  requireAdmin,
  requireServiceRole,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('youtube_url').isURL({ protocols: ['https'], require_protocol: true }).custom(value => {
      const host = new URL(value).hostname;
      if (!['youtube.com', 'www.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
        throw new Error('Video URL must be a YouTube URL.');
      }
      return true;
    }).withMessage('A valid HTTPS YouTube URL is required'),
    body('youtube_id').trim().matches(/^[A-Za-z0-9_-]{6,20}$/).withMessage('A valid YouTube video ID is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('thumbnail_url').optional().isURL(),
    body('duration').optional().trim().isLength({ max: 20 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { title, youtube_url, youtube_id, category, description, thumbnail_url, duration } =
      req.body;

    try {
      const { data: video, error } = await supabaseAdmin
        .from('videos')
        .insert({
          title,
          youtube_url,
          youtube_id,
          category,
          description: description || null,
          thumbnail_url: thumbnail_url || null,
          duration: duration || null,
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.status(201).json({
        success: true,
        message: 'Video created',
        data: video,
      });
    } catch (err) {
      console.error('[videos POST /]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /api/videos/:id   (Admin)
// Edit an existing video.
// ---------------------------------------------------------------------------
router.put(
  '/:id',
  authenticateUser,
  requireAdmin,
  requireServiceRole,
  [
    body('title').optional().trim().notEmpty(),
    body('youtube_url').optional().isURL({ protocols: ['https'], require_protocol: true }).custom(value => {
      const host = new URL(value).hostname;
      if (!['youtube.com', 'www.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
        throw new Error('Video URL must be a YouTube URL.');
      }
      return true;
    }),
    body('youtube_id').optional().trim().matches(/^[A-Za-z0-9_-]{6,20}$/),
    body('category').optional().trim().notEmpty(),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('thumbnail_url').optional().isURL(),
    body('duration').optional().trim().isLength({ max: 20 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const allowedFields = [
      'title',
      'youtube_url',
      'youtube_id',
      'category',
      'description',
      'thumbnail_url',
      'duration',
    ];
    const updates = {};

    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    try {
      const { data: video, error } = await supabaseAdmin
        .from('videos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(error.code === 'PGRST116' ? 404 : 500).json({
          success: false,
          message: error.code === 'PGRST116' ? 'Video not found' : error.message,
        });
      }

      return res.status(200).json({ success: true, message: 'Video updated', data: video });
    } catch (err) {
      console.error('[videos PUT /:id]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/videos/:id   (Admin)
// Remove a video.
// ---------------------------------------------------------------------------
router.delete('/:id', authenticateUser, requireAdmin, requireServiceRole, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('videos')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, message: 'Video deleted' });
  } catch (err) {
    console.error('[videos DELETE /:id]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
