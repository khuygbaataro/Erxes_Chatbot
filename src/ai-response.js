/**
 * AI Response Generator — Claude API-аар байгалийн хэлээр хариулт бичих
 * 
 * Бэлэн текст буцаахын оронд AI хэрэглэгчтэй ярилцана.
 * Intent + мэдээлэл + context-ийг AI-д өгч, байгалийн хариулт бичүүлнэ.
 */

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ============================================
// TODO: Энд EventX-ийн бодит мэдээллийг оруулна
// Хожим API-аас авч солино
// ============================================
const EVENTS_DATA = [
  {
    name: 'The Hu — Live Concert',
    date: '2026.04.15',
    time: '19:00',
    venue: 'Төв цэнгэлдэх хүрээлэн',
    address: 'УБ, Сүхбаатарын талбай 3',
    zones: { 'VIP': '150,000₮', 'Premium': '100,000₮', 'Standard': '60,000₮' },
    age_limit: '16+',
    door_open: '17:30',
    duration: '2.5 цаг',
    parking: 'Байдаг, 200 зогсоол',
    artists: 'The Hu, Зочин уран бүтээлчид'
  },
  {
    name: 'Camerton — 20 жилийн ой',
    date: '2026.05.01',
    time: '18:00',
    venue: 'UB Palace',
    address: 'УБ, Чингисийн өргөн чөлөө',
    zones: { 'VIP': '200,000₮', 'Standard': '80,000₮' },
    age_limit: 'Хязгааргүй',
    door_open: '16:30',
    duration: '3 цаг',
    parking: 'Байдаг',
    artists: 'Camerton хамтлаг'
  }
];

const SYSTEM_PROMPT = `Чи бол EventX-ийн Messenger chatbot. Чиний нэр EventX Bot. Чи хэрэглэгчидтэй Монгол хэлээр найрсаг, энгийн, товч ярилцана.

ЧИНИЙ ҮҮРЭГ:
- Тасалбар захиалахад туслах
- Арга хэмжээний мэдээлэл өгөх
- Төлбөрийн мэдээлэл өгөх
- Асуултад хариулах
- Шийдэж чадахгүй асуудлыг ажилтанд дамжуулах

ДҮРМҮҮД:
1. Монгол хэлээр ярь. Хэрэглэгч латинаар бичвэл ч Монголоор хариул
2. Товч бай — Messenger дээр урт текст уншдаггүй. 3-5 мөрөнд багтаа
3. Emoji хэрэглэ, гэхдээ хэт олон биш — 2-3 ширхэг хангалттай
4. Байгалийн ярианы хэв маягтай бай, робот шиг биш
5. Мэдэхгүй зүйлийг зохиохгүй — "мэдэхгүй байна, ажилтантай холбож өгье" гэж хэл
6. 640 тэмдэгтээс хэтрүүлэхгүй
7. Хэрэглэгч дургүйцсэн, бухимдсан бол тайвшируулж, ажилтантай холбож өгнө гэж хэл

ТӨЛБӨРИЙН МЭДЭЭЛЭЛ:
- QPay: QR код уншуулах
- SocialPay: Аппаар шилжүүлэх
- Банк шилжүүлэг: Дансны мэдээлэл өгнө
- Карт онлайн: Visa/Mastercard

БУЦААЛТЫН БОДЛОГО:
- 72+ цагийн өмнө: 100% буцаалт
- 24-72 цаг: 50% буцаалт
- 24 цагаас дотор: Буцаалт хийгдэхгүй

АЖИЛЛАХ ЦАГ:
- Chatbot: 24/7
- Ажилтан: 09:00 - 22:00
- Утас: +976 XXXX-XXXX (09:00 - 18:00)`;

/**
 * AI-аар хариулт бичүүлэх
 * @param {string} userMessage - Хэрэглэгчийн мессеж
 * @param {object} intentResult - Intent detection үр дүн
 * @param {object} session - Session мэдээлэл
 * @param {array} conversationHistory - Өмнөх яриа
 */
async function generateAIResponse(userMessage, intentResult, session, conversationHistory = []) {
  try {
    const { intents, primary_intent } = intentResult;
    const entities = intents[0]?.entities || {};

    // Intent-д тохирох мэдээлэл цуглуулах
    const contextData = gatherContext(primary_intent, entities, session);

    // System prompt + context
    const systemWithContext = `${SYSTEM_PROMPT}

ОДООГИЙН МЭДЭЭЛЭЛ:
${contextData}

ХЭРЭГЛЭГЧИЙН INTENT: ${primary_intent}
${intents.length > 1 ? `НЭМЭЛТ INTENT: ${intents.slice(1).map(i => i.intent).join(', ')}` : ''}
${session.currentStep ? `ЗАХИАЛГЫН АЛХАМ: ${session.currentStep}` : ''}
${Object.keys(session.bookingData).length > 0 ? `ЗАХИАЛГЫН МЭДЭЭЛЭЛ: ${JSON.stringify(session.bookingData)}` : ''}

Дээрх мэдээлэл дээр үндэслэн хэрэглэгчид хариулаарай.`;

    // Яриа history бэлдэх
    const messages = [];
    
    // Өмнөх яриа (сүүлийн 6 мессеж)
    const recentHistory = conversationHistory.slice(-6);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
    
    // Одоогийн мессеж
    messages.push({ role: 'user', content: userMessage });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: systemWithContext,
      messages
    });

    const reply = response.content[0].text.trim();
    console.log(`🤖 AI response generated (${reply.length} chars)`);
    return reply;

  } catch (err) {
    console.error('AI response generation failed:', err.message);
    // Fallback — бэлэн хариулт
    return getFallbackResponse(intentResult.primary_intent);
  }
}

/**
 * Intent-д тохирох context мэдээлэл цуглуулах
 */
function gatherContext(primaryIntent, entities, session) {
  const parts = [];

  // Арга хэмжээний мэдээлэл
  if (['event_info', 'ticket_price', 'booking_start', 'venue_info', 'age_restriction', 'select_zone'].includes(primaryIntent)) {
    if (entities.event_name) {
      const event = findEvent(entities.event_name);
      if (event) {
        parts.push(`АРГА ХЭМЖЭЭ: ${JSON.stringify(event, null, 2)}`);
      } else {
        parts.push(`"${entities.event_name}" нэртэй арга хэмжээ олдсонгүй.`);
      }
    }
    
    // Бүх арга хэмжээний жагсаалт
    parts.push(`ИДЭВХТЭЙ АРГА ХЭМЖЭЭНҮҮД:\n${EVENTS_DATA.map(e => `- ${e.name} (${e.date}, ${e.venue})`).join('\n')}`);
  }

  // Event list
  if (primaryIntent === 'event_list') {
    parts.push(`ИДЭВХТЭЙ АРГА ХЭМЖЭЭНҮҮД:\n${EVENTS_DATA.map(e => {
      const prices = Object.entries(e.zones).map(([z, p]) => `${z}: ${p}`).join(', ');
      return `- ${e.name}\n  📅 ${e.date} | 🕐 ${e.time} | 📍 ${e.venue}\n  🎫 ${prices}`;
    }).join('\n')}`);
  }

  // Greeting
  if (primaryIntent === 'greeting') {
    parts.push(`Хэрэглэгчийг мэндэлж, юугаар тусалж болохоо хэлээрэй. Тасалбар захиалах, мэдээлэл авах, асуулт асуух боломжтойг дурдаарай.`);
  }

  // Booking flow
  if (session.currentStep) {
    const event = findEvent(session.bookingData.eventName);
    if (event) {
      parts.push(`СОНГОСОН АРГА ХЭМЖЭЭ: ${JSON.stringify(event, null, 2)}`);
    }
    parts.push(`ЗАХИАЛГЫН ДАТА: ${JSON.stringify(session.bookingData)}`);

    switch (session.currentStep) {
      case 'select_event':
        parts.push('Хэрэглэгчээс аль арга хэмжээний тасалбар авахыг асуу.');
        break;
      case 'select_zone':
        parts.push('Хэрэглэгчид бүсүүдийг үнийн хамт харуулж, аль бүсийг сонгохыг асуу.');
        break;
      case 'select_seat':
        parts.push('Хэрэглэгчээс суудлаа сонгохыг хүс (жишээ: A3, B5). Сул суудлууд байгааг хэл.');
        break;
      case 'confirm':
        parts.push('Захиалгыг баталгаажуулахыг хүс. Мэдээллийг нэгтгэж харуулаарай.');
        break;
      case 'payment':
        parts.push('Төлбөрийн хэлбэрээ сонгохыг хүс: QPay, SocialPay, Банк шилжүүлэг, Карт.');
        break;
    }
  }

  // Escalate intents
  if (['complaint', 'technical_issue', 'payment_issue', 'human_agent', 'group_booking'].includes(primaryIntent)) {
    parts.push('Энэ асуудлыг ажилтанд дамжуулна гэж хэлээрэй. Хэрэглэгчийг тайвширууж, удахгүй хариулна гэж хэл.');
  }

  // Unknown
  if (primaryIntent === 'unknown') {
    parts.push('Хэрэглэгчийн асуултыг ойлгож чадсангүй. Эелдэгээр юугаар тусалж болохоо хэлээрэй.');
  }

  return parts.join('\n\n');
}

/**
 * Event олох
 */
function findEvent(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  return EVENTS_DATA.find(e => e.name.toLowerCase().includes(lower));
}

/**
 * AI ажиллахгүй бол fallback хариулт
 */
function getFallbackResponse(intent) {
  const fallbacks = {
    greeting: 'Сайн байна уу! 🎵 EventX-д тавтай морил! Юугаар туслах вэ?',
    event_list: 'Одоогоор The Hu концерт (04.15), Camerton 20 жилийн ой (05.01) гэсэн арга хэмжээнүүд байна.',
    ticket_price: 'Аль арга хэмжээний үнийг мэдэхийг хүсэж байна вэ?',
    booking_start: 'Тасалбар захиалъя! Аль арга хэмжээ?',
    payment_info: 'QPay, SocialPay, банк шилжүүлэг, карт онлайн зэрэг хэлбэрүүд бий.',
    refund: 'Буцаалт: 72+ цаг өмнө 100%, 24-72 цаг 50%. Захиалгын дугаараа хэлнэ үү.',
    unknown: 'Уучлаарай, ойлгож чадсангүй 😅 Тасалбар захиалах, мэдээлэл авах, ажилтантай холбогдох — юугаар туслах вэ?'
  };
  return fallbacks[intent] || fallbacks.unknown;
}

module.exports = { generateAIResponse, EVENTS_DATA, findEvent };
