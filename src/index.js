/**
 * EventX Messenger Bot — Main Server
 * 
 * Мессеж хүлээж авна → AI intent таниулна → хариулт илгээнэ
 */

require('dotenv').config();
const express = require('express');
const { handleMessage } = require('./bot');
const { sendTextMessage, sendTypingOn } = require('./messenger');

const app = express();
app.use(express.json());

// ============================================
// Facebook Webhook Verification
// Meta Developer Console-д webhook тохируулахад шаардлагатай
// ============================================
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    return res.status(200).send(challenge);
  }
  console.log('❌ Webhook verification failed');
  res.sendStatus(403);
});

// ============================================
// Facebook Webhook — Мессеж хүлээн авах
// ============================================

// Давхар мессеж шүүх (Facebook заримдаа ижил мессежийг 2 удаа илгээдэг)
const processedMessages = new Set();

app.post('/webhook', async (req, res) => {
  // Facebook 20 секундын дотор 200 хүлээдэг — эхлээд 200 буцааж, дараа нь process хийнэ
  res.sendStatus(200);

  const body = req.body;
  if (body.object !== 'page') return;

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      // Зөвхөн текст мессеж process хийнэ
      if (!event.message || !event.message.text) continue;
      // Өөрийн илгээсэн мессежийг алгасна
      if (event.message.is_echo) continue;

      // Давхар мессеж шүүх
      const msgId = event.message.mid;
      if (processedMessages.has(msgId)) continue;
      processedMessages.add(msgId);
      // 5 минутын дараа устгах (санах ойг хэмнэх)
      setTimeout(() => processedMessages.delete(msgId), 5 * 60 * 1000);

      const senderId = event.sender.id;
      const text = event.message.text;
      const timestamp = event.timestamp;

      console.log(`\n📩 [${new Date(timestamp).toLocaleString()}] ${senderId}: "${text}"`);

      try {
        // Typing indicator
        await sendTypingOn(senderId);

        // Bot хариулт
        const reply = await handleMessage(senderId, text);

        // Хариулт илгээх
        if (Array.isArray(reply)) {
          // Олон мессеж илгээх (жишээ: текст + зураг)
          for (const msg of reply) {
            await sendTextMessage(senderId, msg);
            // Мессеж хоорондын бага зэрэг хүлээлт (илүү байгалийн харагдуулахын тулд)
            await new Promise(r => setTimeout(r, 800));
          }
        } else {
          await sendTextMessage(senderId, reply);
        }

        console.log(`✅ Replied to ${senderId}`);
      } catch (err) {
        console.error(`❌ Error handling message from ${senderId}:`, err.message);
        try {
          await sendTextMessage(senderId, 'Уучлаарай, техникийн алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.');
        } catch (_) {}
      }
    }
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'EventX Bot ажиллаж байна ✅', uptime: process.uptime() });
});

// ============================================
// Start
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🤖 EventX Bot running on port ${PORT}`);
  console.log(`📡 Webhook URL: https://YOUR_DOMAIN/webhook`);
  console.log(`\nТохиргоо шалгах:`);
  console.log(`  FB_PAGE_ACCESS_TOKEN: ${process.env.FB_PAGE_ACCESS_TOKEN ? '✅ тохируулсан' : '❌ дутуу'}`);
  console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ тохируулсан' : '❌ дутуу'}`);
  console.log(`  FB_VERIFY_TOKEN: ${process.env.FB_VERIFY_TOKEN || 'eventx_verify_123'}`);
});
