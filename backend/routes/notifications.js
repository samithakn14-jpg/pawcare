/**
 * routes/notifications.js
 * Notification management endpoints (authenticated users only).
 */

const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateUser, requireServiceRole } = require('../middleware/auth');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/notifications
// Get paginated notifications for the authenticated user.
// ---------------------------------------------------------------------------
router.get('/', authenticateUser, requireServiceRole, async (req, res) => {
  try {
    const { is_read, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (is_read !== undefined) {
      query = query.eq('is_read', is_read === 'true');
    }

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    // Count unread
    const { count: unreadCount, error: unreadCountError } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (unreadCountError) {
      console.error('[notifications GET /] Unread count query failed:', unreadCountError);
      return res.status(500).json({ success: false, message: 'Could not count unread notifications.' });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      unread_count: unreadCount || 0,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
      },
    });
  } catch (err) {
    console.error('[notifications GET /]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/notifications/read-all
// Mark all of the user's notifications as read.
// Must be placed BEFORE /:id/read to avoid route conflict.
// ---------------------------------------------------------------------------
router.put('/read-all', authenticateUser, requireServiceRole, async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('[notifications PUT /read-all]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/notifications/:id/read
// Mark a single notification as read.
// ---------------------------------------------------------------------------
router.put('/:id/read', authenticateUser, requireServiceRole, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: notification, error: fetchError } = await supabaseAdmin
      .from('notifications')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: updated,
    });
  } catch (err) {
    console.error('[notifications PUT /:id/read]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
