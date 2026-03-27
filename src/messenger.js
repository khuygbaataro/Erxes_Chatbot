/**
 * Facebook Messenger API — Мессеж илгээх функцүүд
 */

const axios = require('axios');

const GRAPH_API = 'https://graph.facebook.com/v19.0/me/messages';

/**
 * Текст мессеж илгээх
 */
async function sendTextMessage(recipientId, text) {
  // Messenger 640 тэмдэгтийн хязгаартай — урт бол хуваана
  const chunks = splitMessage(text, 640);

  for (const chunk of chunks) {
    await callSendAPI(recipientId, { text: chunk });
    if (chunks.length > 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

/**
 * Зураг илгээх (суудлын зураг гэх мэт)
 */
async function sendImageMessage(recipientId, imageUrl) {
  await callSendAPI(recipientId, {
    attachment: {
      type: 'image',
      payload: { url: imageUrl, is_reusable: true }
    }
  });
}

/**
 * Quick replies — товч сонголтууд илгээх
 */
async function sendQuickReplies(recipientId, text, replies) {
  const quickReplies = replies.map(r => ({
    content_type: 'text',
    title: r.title,
    payload: r.payload || r.title
  }));

  await axios.post(GRAPH_API, {
    recipient: { id: recipientId },
    messaging_type: 'RESPONSE',
    message: { text, quick_replies: quickReplies }
  }, {
    params: { access_token: process.env.FB_PAGE_ACCESS_TOKEN }
  });
}

/**
 * Typing indicator
 */
async function sendTypingOn(recipientId) {
  try {
    await axios.post(GRAPH_API, {
      recipient: { id: recipientId },
      sender_action: 'typing_on'
    }, {
      params: { access_token: process.env.FB_PAGE_ACCESS_TOKEN }
    });
  } catch (_) {
    // Typing indicator алдаа бол алгасна
  }
}

/**
 * Graph API дуудах
 */
async function callSendAPI(recipientId, message) {
  try {
    const response = await axios.post(GRAPH_API, {
      recipient: { id: recipientId },
      messaging_type: 'RESPONSE',
      message
    }, {
      params: { access_token: process.env.FB_PAGE_ACCESS_TOKEN }
    });
    return response.data;
  } catch (err) {
    const errorData = err.response?.data?.error;
    if (errorData) {
      console.error(`Messenger API error: ${errorData.message} (code: ${errorData.code})`);
    }
    throw err;
  }
}

/**
 * Урт мессежийг хуваах
 */
function splitMessage(text, maxLen) {
  if (text.length <= maxLen) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    // Мөр шилжүүлэг эсвэл зайгаар хуваах
    let splitAt = remaining.lastIndexOf('\n', maxLen);
    if (splitAt < maxLen * 0.3) splitAt = remaining.lastIndexOf(' ', maxLen);
    if (splitAt < maxLen * 0.3) splitAt = maxLen;

    chunks.push(remaining.substring(0, splitAt));
    remaining = remaining.substring(splitAt).trimStart();
  }
  return chunks;
}

module.exports = { sendTextMessage, sendImageMessage, sendQuickReplies, sendTypingOn };
