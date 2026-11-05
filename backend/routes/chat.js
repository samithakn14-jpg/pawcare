/**
 * routes/chat.js
 * AI-powered PetCare Connect assistant.
 */

const express = require('express');

const router = express.Router();
const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 1200;
const SYSTEM_PROMPT = [
  'You are Pawsy, a friendly, concise, and accurate assistant for dog owners and people interested in dogs.',
  'Answer questions about dogs broadly, including breeds, puppies, training, behavior, nutrition, grooming, exercise, safety, health, senior care, adoption, and welfare. Do not limit answers to PetCare Connect website features.',
  'Answer the exact question directly in plain text. If a question is unrelated to dogs, briefly steer the conversation back to dogs or PetCare Connect.',
  'Do not invent current pet listings, fees, appointment availability, policies, or other facts not provided by the user. If you do not know a specific PetCare Connect detail, say so and direct the user to the support team.',
  'For dog health, diagnostic, medication, or emergency questions, provide general educational information only; do not diagnose or prescribe. Recommend a licensed veterinarian for symptoms or treatment decisions, and urge immediate veterinary care for possible emergencies.',
  'Keep answers brief unless the user asks for more detail.'
].join(' ');

router.post('/', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      message: 'AI chat is not configured. Please contact the site administrator.'
    });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return res.status(400).json({
      success: false,
      message: `Send between 1 and ${MAX_MESSAGES} messages.`
    });
  }

  const validMessages = messages.every(message =>
    message &&
    ['user', 'assistant'].includes(message.role) &&
    typeof message.content === 'string' &&
    message.content.trim().length > 0 &&
    message.content.length <= MAX_MESSAGE_LENGTH
  );
  if (!validMessages || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({
      success: false,
      message: 'Messages must contain valid user and assistant text, ending with a user question.'
    });
  }

  const timeout = AbortSignal.timeout(30000);
  try {
    const response = await fetch(process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: timeout,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map(({ role, content }) => ({ role, content: content.trim() }))
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      console.error(`[chat] AI provider returned HTTP ${response.status}`);
      return res.status(502).json({
        success: false,
        message: 'The AI assistant is temporarily unavailable. Please try again shortly.'
      });
    }

    const result = await response.json();
    const answer = result.choices?.[0]?.message?.content?.trim();
    if (typeof answer !== 'string' || answer.length === 0) {
      console.error('[chat] AI provider returned no answer');
      return res.status(502).json({
        success: false,
        message: 'The AI assistant could not produce an answer. Please try again.'
      });
    }

    return res.status(200).json({ success: true, answer });
  } catch (error) {
    console.error('[chat] AI request failed:', error.message);
    return res.status(502).json({
      success: false,
      message: 'The AI assistant is temporarily unavailable. Please try again shortly.'
    });
  }
});

module.exports = router;
