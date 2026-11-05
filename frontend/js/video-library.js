(() => {
  const config = window.PAWCARE_CONFIG;
  const videoGrid = document.getElementById('videoGrid');
  const videoStatus = document.getElementById('videoStatus');
  const videoFilters = document.getElementById('videoFilters');
  const adminSection = document.getElementById('videoAdminSection');
  const adminNotice = document.getElementById('videoAdminNotice');
  const adminGrid = document.getElementById('adminVideoGrid');
  const videoForm = document.getElementById('petCareVideoForm');
  const videoIdInput = document.getElementById('petCareVideoId');
  const videoFileInput = document.getElementById('petCareVideoFile');
  const thumbnailInput = document.getElementById('petCareVideoThumbnail');
  const saveButton = document.getElementById('savePetCareVideo');
  const cancelEditButton = document.getElementById('cancelPetCareVideoEdit');
  const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
  const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;
  const API_REQUEST_TIMEOUT_MS = 10000;
  let youtubeVideos = [];
  let storedVideos = [];
  let adminVideos = [];
  let adminToken = null;
  let currentCategory = 'all';
  let filtersListenerBound = false;
  let youtubeLoadError = '';
  let storageLoadError = '';

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

  function safeStorageUrl(value) {
    try {
      const url = new URL(value);
      const storageHost = new URL(config.SUPABASE_URL).hostname;
      return url.protocol === 'https:' && url.hostname === storageHost ? url.href : '';
    } catch {
      return '';
    }
  }

  function safeYoutubeId(video) {
    const savedId = String(video.youtube_id || '').trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(savedId)) return savedId;
    try {
      const url = new URL(video.youtube_url);
      if (!['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'].includes(url.hostname)) return '';
      const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : url.pathname.split('/').pop();
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
    } catch {
      return '';
    }
  }

  function youtubeCard(video) {
    const videoId = safeYoutubeId(video);
    if (!videoId) return '';
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    return `<div class="col-md-6 col-lg-4">
      <article class="care-video">
        <iframe src="https://www.youtube.com/embed/${videoId}" title="${escapeHtml(video.title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        <div class="care-video-content">
          <span class="topic-tag">${escapeHtml(video.category)}</span>
          <h2>${escapeHtml(video.title)}</h2>
          <p>${escapeHtml(video.description || 'No description supplied.')}</p>
          ${video.duration ? `<p class="small">Duration: ${escapeHtml(video.duration)}</p>` : ''}
          <a class="watch-link" href="${watchUrl}" target="_blank" rel="noopener noreferrer"><img class="video-thumbnail-fallback" src="${thumbnailUrl}" alt="" loading="lazy" />Open video on YouTube <i class="fas fa-arrow-up-right-from-square ms-1" aria-hidden="true"></i></a>
        </div>
      </article>
    </div>`;
  }

  function storedVideoCard(video) {
    const videoUrl = safeStorageUrl(video.video_url);
    const thumbnailUrl = safeStorageUrl(video.thumbnail_url);
    if (!videoUrl) return '';
    return `<div class="col-md-6 col-lg-4">
      <article class="care-video stored-video">
        <video controls preload="metadata" playsinline${thumbnailUrl ? ` poster="${escapeHtml(thumbnailUrl)}"` : ''} aria-label="${escapeHtml(video.title)}">
          <source src="${escapeHtml(videoUrl)}" />
          Your browser does not support HTML video playback.
        </video>
        <div class="care-video-content">
          <span class="topic-tag">${escapeHtml(video.category)}</span>
          <h2>${escapeHtml(video.title)}</h2>
          <p>${escapeHtml(video.description || 'No description supplied.')}</p>
        </div>
      </article>
    </div>`;
  }

  function renderVideos() {
    const youtubeRows = youtubeVideos.filter(video =>
      currentCategory === 'all' || video.category === currentCategory
    );
    const storedRows = storedVideos.filter(video =>
      currentCategory === 'all' || video.category === currentCategory
    );
    const cards = [
      ...youtubeRows.map(youtubeCard),
      ...storedRows.map(storedVideoCard),
    ].filter(Boolean);

    videoGrid.innerHTML = cards.join('');
    if (cards.length) {
      videoStatus.hidden = true;
      return;
    }

    videoStatus.hidden = false;
    const recordsExist = youtubeRows.length > 0 || storedRows.length > 0;
    videoStatus.textContent = recordsExist
      ? 'Video records were found, but none could be displayed. Check their YouTube IDs or uploaded file URLs.'
      : currentCategory === 'all'
        ? 'No videos have been added to the library yet.'
        : `No videos are listed for “${currentCategory}” yet.`;
  }

  function setupFilters() {
    const categories = [...new Set([
      ...youtubeVideos.map(video => video.category),
      ...storedVideos.map(video => video.category),
    ].filter(Boolean))].sort((a, b) => a.localeCompare(b));

    videoFilters.innerHTML = ['all', ...categories].map(category => {
      const label = category === 'all' ? 'All topics' : category;
      return `<button type="button" class="btn btn-sm ${category === 'all' ? 'btn-primary' : 'btn-outline-primary'}" data-video-category="${escapeHtml(category)}">${escapeHtml(label)}</button>`;
    }).join('');

    if (!filtersListenerBound) {
      videoFilters.addEventListener('click', event => {
        const button = event.target.closest('[data-video-category]');
        if (!button) return;
        currentCategory = button.dataset.videoCategory;
        videoFilters.querySelectorAll('button').forEach(item => {
          item.classList.toggle('btn-primary', item === button);
          item.classList.toggle('btn-outline-primary', item !== button);
        });
        renderVideos();
      });
      filtersListenerBound = true;
    }
  }

  function showLoadErrors() {
    const failures = [
      youtubeLoadError && `YouTube catalog: ${youtubeLoadError}`,
      storageLoadError && `Uploaded library: ${storageLoadError}`,
    ].filter(Boolean);
    if (!failures.length) return;
    videoStatus.hidden = false;
    videoStatus.textContent = failures.join(' ');
  }

  async function fetchJson(url) {
    let response;
    let result;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
    try {
      response = await fetch(url, { signal: controller.signal });
      console.info(`[videos] GET ${url} returned HTTP ${response.status}.`);
      result = await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        const message = `Request to ${url} timed out after ${API_REQUEST_TIMEOUT_MS / 1000} seconds.`;
        console.error(`[videos] ${message}`);
        throw new Error(message);
      }
      if (response) {
        const message = `The video API returned an invalid response (HTTP ${response.status}).`;
        console.error(`[videos] GET ${url} returned an invalid response:`, error);
        throw new Error(message);
      }
      console.error(`[videos] GET ${url} failed before receiving a response:`, error);
      throw new Error(`Request to ${url} failed: ${error.message}`);
    } finally {
      window.clearTimeout(timeoutId);
    }

    if (!response.ok || !result.success) {
      const error = new Error(result.message || `The video request failed (HTTP ${response.status}).`);
      console.error(`[videos] GET ${url} failed with HTTP ${response.status}:`, error);
      throw error;
    }
    return result;
  }

  async function loadPublicVideos() {
    youtubeLoadError = '';
    storageLoadError = '';
    let youtubeRendered = false;

    const storageRequest = fetchJson(`${config.API_BASE_URL}/pet-care-videos?limit=100`)
      .then(result => {
        storedVideos = Array.isArray(result.data) ? result.data : [];
        if (youtubeRendered && storedVideos.length) renderLibrary();
      })
      .catch(error => {
        storedVideos = [];
        storageLoadError = error.message;
        console.error('[videos] Uploaded library request failed:', error);
        if (youtubeRendered) showLoadErrors();
      });

    try {
      const result = await fetchJson(`${config.API_BASE_URL}/videos?limit=100`);
      youtubeVideos = Array.isArray(result.data) ? result.data : [];
    } catch (error) {
      youtubeVideos = [];
      youtubeLoadError = error.message;
      console.error('[videos] YouTube catalog request failed:', error);
    }

    const renderLibrary = () => {
      setupFilters();
      renderVideos();
      showLoadErrors();
    };

    youtubeRendered = true;
    renderLibrary();
    void storageRequest;
  }

  async function getAdminToken() {
    if (!config?.supabase) return null;
    const { data: sessionData, error: sessionError } = await config.supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const session = sessionData.session;
    if (!session?.access_token) return null;

    const { data: profile, error: profileError } = await config.supabase
      .from('users')
      .select('role, status')
      .eq('id', session.user.id)
      .single();
    if (profileError) throw new Error(`Could not verify administrator access: ${profileError.message}`);
    if (profile.role !== 'admin' || profile.status !== 'active') return null;
    return session.access_token;
  }

  async function adminRequest(path, options = {}) {
    const response = await fetch(`${config.API_BASE_URL}/pet-care-videos${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${adminToken}`,
        ...(options.headers || {}),
      },
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(`The video API returned an invalid response (HTTP ${response.status}).`);
    }
    if (!response.ok || !result.success) {
      throw new Error(result.message || `The video request failed (HTTP ${response.status}).`);
    }
    return result;
  }

  function showAdminNotice(message, type = 'danger') {
    adminNotice.className = `alert alert-${type} video-notice`;
    adminNotice.textContent = message;
  }

  function renderAdminVideos(videos) {
    if (!videos.length) {
      adminGrid.innerHTML = '<p class="text-secondary">No uploaded videos yet.</p>';
      return;
    }
    adminGrid.innerHTML = videos.map(video => {
      const videoUrl = safeStorageUrl(video.video_url);
      const posterUrl = safeStorageUrl(video.thumbnail_url);
      return `<div class="col-md-6 col-xl-4">
        <article class="video-admin-card h-100 overflow-hidden">
          ${videoUrl ? `<video controls preload="metadata"${posterUrl ? ` poster="${escapeHtml(posterUrl)}"` : ''}><source src="${escapeHtml(videoUrl)}" /></video>` : '<div class="ratio ratio-16x9 bg-light"></div>'}
          <div class="p-3">
            <span class="topic-tag">${escapeHtml(video.category)} · ${video.is_public ? 'Public' : 'Private'}</span>
            <h4 class="h6">${escapeHtml(video.title)}</h4>
            <p class="small text-secondary">${escapeHtml(video.description || 'No description supplied.')}</p>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-sm btn-outline-success" data-edit-video="${escapeHtml(video.id)}">Edit</button>
              <button type="button" class="btn btn-sm btn-outline-danger" data-delete-video="${escapeHtml(video.id)}">Delete</button>
            </div>
          </div>
        </article>
      </div>`;
    }).join('');
  }

  async function loadAdminVideos() {
    try {
      const result = await adminRequest('/admin');
      adminVideos = result.data || [];
      renderAdminVideos(adminVideos);
    } catch (error) {
      adminVideos = [];
      adminGrid.textContent = 'Uploaded videos could not be loaded.';
      showAdminNotice(error.message);
    }
  }

  function resetVideoForm() {
    videoForm.reset();
    videoIdInput.value = '';
    videoFileInput.required = true;
    saveButton.textContent = 'Upload video';
    cancelEditButton.hidden = true;
  }

  function fileTypeLooksSupported(file, type) {
    if (!file) return true;
    const extension = file.name.split('.').pop().toLowerCase();
    const rules = type === 'video'
      ? { mp4: ['video/mp4'], webm: ['video/webm'], mov: ['video/quicktime'] }
      : { jpg: ['image/jpeg'], jpeg: ['image/jpeg'], png: ['image/png'], webp: ['image/webp'] };
    return Boolean(rules[extension]?.includes(file.type));
  }

  videoForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!videoForm.reportValidity()) return;

    const videoFile = videoFileInput.files[0];
    const thumbnailFile = thumbnailInput.files[0];
    const editing = Boolean(videoIdInput.value);
    if (!editing && !videoFile) {
      showAdminNotice('Choose a video file to upload.');
      return;
    }
    if (videoFile && (videoFile.size > MAX_VIDEO_BYTES || !fileTypeLooksSupported(videoFile, 'video'))) {
      showAdminNotice('Choose a valid MP4, WebM, or MOV file no larger than 100 MB.');
      return;
    }
    if (thumbnailFile && (thumbnailFile.size > MAX_THUMBNAIL_BYTES || !fileTypeLooksSupported(thumbnailFile, 'thumbnail'))) {
      showAdminNotice('Choose a valid JPEG, PNG, or WebP thumbnail no larger than 5 MB.');
      return;
    }

    const formData = new FormData(videoForm);
    formData.set('is_public', document.getElementById('petCareVideoPublic').checked ? 'true' : 'false');
    saveButton.disabled = true;
    saveButton.textContent = editing ? 'Saving…' : 'Uploading…';
    try {
      const result = await adminRequest(editing ? `/${encodeURIComponent(videoIdInput.value)}` : '', {
        method: editing ? 'PUT' : 'POST',
        body: formData,
      });
      showAdminNotice(result.message || 'Video saved.', 'success');
      resetVideoForm();
      await Promise.all([loadPublicVideos(), loadAdminVideos()]);
    } catch (error) {
      showAdminNotice(error.message);
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = videoIdInput.value ? 'Save changes' : 'Upload video';
    }
  });

  cancelEditButton.addEventListener('click', resetVideoForm);

  adminGrid.addEventListener('click', async event => {
    const editButton = event.target.closest('[data-edit-video]');
    const deleteButton = event.target.closest('[data-delete-video]');
    if (editButton) {
      const video = adminVideos.find(item => item.id === editButton.dataset.editVideo);
      if (!video) {
        showAdminNotice('That video is no longer available. Refresh the library and try again.');
        return;
      }
      videoIdInput.value = video.id;
      document.getElementById('petCareVideoTitle').value = video.title || '';
      document.getElementById('petCareVideoDescription').value = video.description || '';
      document.getElementById('petCareVideoCategory').value = video.category;
      document.getElementById('petCareVideoPublic').checked = Boolean(video.is_public);
      videoFileInput.value = '';
      videoFileInput.required = false;
      thumbnailInput.value = '';
      saveButton.textContent = 'Save changes';
      cancelEditButton.hidden = false;
      videoForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (deleteButton) {
      const video = adminVideos.find(item => item.id === deleteButton.dataset.deleteVideo);
      if (!video || !window.confirm(`Delete “${video.title}” and its stored files? This cannot be undone.`)) return;
      deleteButton.disabled = true;
      try {
        const result = await adminRequest(`/${encodeURIComponent(video.id)}`, { method: 'DELETE' });
        showAdminNotice(result.message || 'Video deleted.', 'success');
        await Promise.all([loadPublicVideos(), loadAdminVideos()]);
      } catch (error) {
        deleteButton.disabled = false;
        showAdminNotice(error.message);
      }
    }
  });

  async function initialize() {
    if (!config?.API_BASE_URL) {
      videoStatus.textContent = 'API URL is not configured. Check frontend/js/config.js.';
      return;
    }

    await loadPublicVideos();
    try {
      adminToken = await getAdminToken();
      if (adminToken) {
        adminSection.hidden = false;
        await loadAdminVideos();
      }
    } catch (error) {
      console.error('Could not verify video administrator access:', error);
    }
  }

  initialize().catch(error => {
    console.error('Unable to initialize the video library:', error);
    videoStatus.hidden = false;
    videoStatus.textContent = `Videos could not be loaded: ${error.message}`;
  });
})();
