(() => {
  const state = {
    conversations: [],
    selectedConversationId: null,
    messageIds: new Set()
  };

  const elements = {
    notice: document.getElementById('notice'),
    statusFilter: document.getElementById('statusFilter'),
    conversationCount: document.getElementById('conversationCount'),
    conversationList: document.getElementById('conversationList'),
    threadSubject: document.getElementById('threadSubject'),
    threadUser: document.getElementById('threadUser'),
    threadMessages: document.getElementById('threadMessages'),
    resolveBtn: document.getElementById('resolveBtn'),
    replyForm: document.getElementById('replyForm'),
    replyInput: document.getElementById('replyInput'),
    sendReplyBtn: document.getElementById('sendReplyBtn')
  };

  function showNotice(message, isError = true) {
    elements.notice.textContent = message;
    elements.notice.className = `alert ${isError ? 'alert-warning' : 'alert-success'} notice`;
    elements.notice.style.display = 'block';
  }

  async function request(path, options = {}) {
    const client = window.PAWCARE_CONFIG?.supabase;
    if (!client) throw new Error('Sign-in is unavailable. Check the Supabase configuration.');

    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session) throw new Error('Please sign in with an admin account, then reload this page.');

    const response = await fetch(`${window.PAWCARE_CONFIG.API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session.access_token}`,
        ...(options.headers || {})
      }
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'The request failed.');
    return result.data;
  }

  function renderConversationList() {
    elements.conversationCount.textContent = String(state.conversations.length);
    elements.conversationList.replaceChildren();
    if (state.conversations.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'muted p-3 mb-0';
      empty.textContent = 'No conversations in this view.';
      elements.conversationList.append(empty);
      return;
    }

    state.conversations.forEach(conversation => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `conversation-item${conversation.id === state.selectedConversationId ? ' active' : ''}`;
      button.addEventListener('click', () => selectConversation(conversation.id));

      const subject = document.createElement('span');
      subject.className = 'conversation-subject';
      subject.textContent = conversation.subject;
      const user = document.createElement('span');
      user.className = 'conversation-meta d-block mt-1';
      user.textContent = `${conversation.user_name} · ${conversation.user_email}`;
      const details = document.createElement('span');
      details.className = 'd-flex justify-content-between align-items-center mt-2';
      const status = document.createElement('span');
      status.className = `status-pill${conversation.status === 'resolved' ? ' resolved' : ''}`;
      status.textContent = conversation.status === 'resolved' ? 'Resolved' : 'Open';
      const date = document.createElement('span');
      date.className = 'conversation-meta';
      date.textContent = new Date(conversation.updated_at).toLocaleString();
      details.append(status, date);
      button.append(subject, user, details);
      elements.conversationList.append(button);
    });
  }

  function renderMessage(message) {
    if (state.messageIds.has(message.id)) return;
    state.messageIds.add(message.id);
    const bubble = document.createElement('div');
    bubble.className = `message ${message.sender_role}`;
    const meta = document.createElement('span');
    meta.className = 'message-meta';
    meta.textContent = `${message.sender_role === 'admin' ? 'Support team' : 'User'} · ${new Date(message.created_at).toLocaleString()}`;
    const content = document.createElement('span');
    content.textContent = message.content;
    bubble.append(meta, content);
    elements.threadMessages.append(bubble);
    elements.threadMessages.scrollTop = elements.threadMessages.scrollHeight;
  }

  async function loadMessages(conversationId, clear = false) {
    const messages = await request(`/support/conversations/${encodeURIComponent(conversationId)}/messages`);
    if (clear) {
      state.messageIds.clear();
      elements.threadMessages.replaceChildren();
    }
    messages.forEach(renderMessage);
  }

  async function selectConversation(id) {
    state.selectedConversationId = id;
    state.messageIds.clear();
    renderConversationList();
    const conversation = state.conversations.find(item => item.id === id);
    if (!conversation) return;

    elements.threadSubject.textContent = conversation.subject;
    elements.threadUser.textContent = `${conversation.user_name} · ${conversation.user_email}`;
    elements.resolveBtn.hidden = false;
    elements.resolveBtn.textContent = conversation.status === 'resolved' ? 'Reopen conversation' : 'Mark resolved';
    elements.replyInput.disabled = conversation.status === 'resolved';
    elements.sendReplyBtn.disabled = conversation.status === 'resolved';
    elements.threadMessages.replaceChildren();
    try {
      await loadMessages(id);
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function loadConversations() {
    try {
      state.conversations = await request(`/support/admin/conversations?status=${encodeURIComponent(elements.statusFilter.value)}`);
      renderConversationList();
      if (state.selectedConversationId && state.conversations.some(item => item.id === state.selectedConversationId)) {
        await loadMessages(state.selectedConversationId);
      } else if (state.selectedConversationId) {
        state.selectedConversationId = null;
        elements.threadSubject.textContent = 'Select a conversation';
        elements.threadUser.textContent = '';
        elements.threadMessages.textContent = 'Choose an open question from the inbox to read and reply.';
        elements.resolveBtn.hidden = true;
        elements.replyInput.disabled = true;
        elements.sendReplyBtn.disabled = true;
      } else if (state.conversations.length) {
        await selectConversation(state.conversations[0].id);
      }
    } catch (error) {
      showNotice(error.message);
      elements.conversationList.textContent = 'Unable to load conversations.';
    }
  }

  elements.replyForm.addEventListener('submit', async event => {
    event.preventDefault();
    const content = elements.replyInput.value.trim();
    if (!content || !state.selectedConversationId) return;

    elements.sendReplyBtn.disabled = true;
    try {
      await request(`/support/conversations/${encodeURIComponent(state.selectedConversationId)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      elements.replyInput.value = '';
      elements.notice.style.display = 'none';
      await loadMessages(state.selectedConversationId);
      await loadConversations();
    } catch (error) {
      showNotice(error.message);
    } finally {
      const selected = state.conversations.find(item => item.id === state.selectedConversationId);
      elements.sendReplyBtn.disabled = !selected || selected.status === 'resolved';
    }
  });

  elements.resolveBtn.addEventListener('click', async () => {
    const conversation = state.conversations.find(item => item.id === state.selectedConversationId);
    if (!conversation) return;
    const status = conversation.status === 'resolved' ? 'open' : 'resolved';
    try {
      await request(`/support/admin/conversations/${encodeURIComponent(conversation.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      await loadConversations();
    } catch (error) {
      showNotice(error.message);
    }
  });

  elements.statusFilter.addEventListener('change', loadConversations);
  document.getElementById('refreshBtn').addEventListener('click', loadConversations);
  document.addEventListener('DOMContentLoaded', async () => {
    if (await window.AdminPortal.authorize()) {
      await loadConversations();
      window.setInterval(() => loadConversations(), 8000);
    }
  });
})();
