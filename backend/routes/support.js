/**
 * routes/support.js
 * Private user-to-admin support conversations.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateUser, requireAdmin, requireServiceRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateUser, requireServiceRole);

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

async function getConversation(id) {
  const { data, error } = await supabaseAdmin
    .from('support_conversations')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

function canReadConversation(req, conversation) {
  return req.user.role === 'admin' || conversation.user_id === req.user.id;
}

function getUserName(user) {
  return (
    user.profile?.name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    'PetCare user'
  );
}

router.get('/conversations/mine', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('support_conversations')
      .select('id, subject, status, created_at, updated_at')
      .eq('user_id', req.user.id)
      .eq('status', 'open')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[support GET /conversations/mine]', error);
      return res.status(500).json({ success: false, message: 'Could not load your support conversation.' });
    }

    return res.status(200).json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[support GET /conversations/mine]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post(
  '/conversations',
  [body('message').trim().notEmpty().isLength({ max: 2000 })],
  async (req, res) => {
    if (!validate(req, res)) return;
    const message = req.body.message.trim();

    try {
      const { data: conversation, error: conversationError } = await supabaseAdmin
        .from('support_conversations')
        .insert({
          user_id: req.user.id,
          user_name: getUserName(req.user),
          user_email: req.user.email || '',
          subject: message.slice(0, 100),
          status: 'open',
        })
        .select()
        .single();

      if (conversationError) {
        console.error('[support POST /conversations] Conversation insert failed:', conversationError);
        return res.status(500).json({ success: false, message: 'Could not start your support conversation.' });
      }

      const { data: supportMessage, error: messageError } = await supabaseAdmin
        .from('support_messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: req.user.id,
          sender_role: 'user',
          content: message,
        })
        .select()
        .single();

      if (messageError) {
        const { error: cleanupError } = await supabaseAdmin
          .from('support_conversations')
          .delete()
          .eq('id', conversation.id);
        if (cleanupError) console.error('[support POST /conversations] Failed to remove empty conversation:', cleanupError);
        console.error('[support POST /conversations] Initial message insert failed:', messageError);
        return res.status(500).json({ success: false, message: 'Could not send your question. Please try again.' });
      }

      return res.status(201).json({
        success: true,
        data: { conversation, message: supportMessage },
      });
    } catch (err) {
      console.error('[support POST /conversations]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const conversation = await getConversation(req.params.id);
    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    if (!canReadConversation(req, conversation)) {
      return res.status(403).json({ success: false, message: 'You cannot view this conversation.' });
    }

    const { data, error } = await supabaseAdmin
      .from('support_messages')
      .select('id, sender_id, sender_role, content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[support GET /conversations/:id/messages]', error);
      return res.status(500).json({ success: false, message: 'Could not load conversation messages.' });
    }

    return res.status(200).json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[support GET /conversations/:id/messages]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post(
  '/conversations/:id/messages',
  [body('content').trim().notEmpty().isLength({ max: 2000 })],
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const conversation = await getConversation(req.params.id);
      if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found.' });
      if (!canReadConversation(req, conversation)) {
        return res.status(403).json({ success: false, message: 'You cannot reply to this conversation.' });
      }
      if (conversation.status === 'resolved') {
        return res.status(409).json({ success: false, message: 'This conversation is resolved. Start a new conversation for more help.' });
      }

      const { error: updateError } = await supabaseAdmin
        .from('support_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversation.id);

      if (updateError) {
        console.error('[support POST /conversations/:id/messages] Timestamp update failed:', updateError);
        return res.status(500).json({ success: false, message: 'Could not update the conversation. Your message was not sent.' });
      }

      const { data: supportMessage, error: messageError } = await supabaseAdmin
        .from('support_messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: req.user.id,
          sender_role: req.user.role === 'admin' ? 'admin' : 'user',
          content: req.body.content.trim(),
        })
        .select()
        .single();

      if (messageError) {
        console.error('[support POST /conversations/:id/messages] Insert failed:', messageError);
        return res.status(500).json({ success: false, message: 'Could not send your message.' });
      }

      return res.status(201).json({ success: true, data: supportMessage });
    } catch (err) {
      console.error('[support POST /conversations/:id/messages]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

router.get('/admin/conversations', requireAdmin, async (req, res) => {
  try {
    const requestedStatus = req.query.status || 'open';
    if (!['open', 'resolved', 'all'].includes(requestedStatus)) {
      return res.status(400).json({ success: false, message: 'Status must be open, resolved, or all.' });
    }

    let query = supabaseAdmin
      .from('support_conversations')
      .select('id, user_id, user_name, user_email, subject, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (requestedStatus !== 'all') query = query.eq('status', requestedStatus);

    const { data, error } = await query;
    if (error) {
      console.error('[support GET /admin/conversations]', error);
      return res.status(500).json({ success: false, message: 'Could not load support conversations.' });
    }

    return res.status(200).json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[support GET /admin/conversations]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.patch(
  '/admin/conversations/:id/status',
  requireAdmin,
  [body('status').isIn(['open', 'resolved'])],
  async (req, res) => {
    if (!validate(req, res)) return;

    try {
      const { data, error } = await supabaseAdmin
        .from('support_conversations')
        .update({ status: req.body.status, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select('id, status, updated_at')
        .single();

      if (error) {
        console.error('[support PATCH /admin/conversations/:id/status]', error);
        return res.status(error.code === 'PGRST116' ? 404 : 500).json({
          success: false,
          message: error.code === 'PGRST116' ? 'Conversation not found.' : 'Could not update conversation status.',
        });
      }

      return res.status(200).json({ success: true, data });
    } catch (err) {
      console.error('[support PATCH /admin/conversations/:id/status]', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
);

module.exports = router;
