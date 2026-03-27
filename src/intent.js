/**
 * AI Intent Detection — Claude API ашиглан intent таних
 */

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Чи бол EventX тасалбар захиалах Messenger chatbot-ын intent classifier. Хэрэглэгчийн мессежийг шинжилж, бүх intent-үүдийг олно.

Intent жагсаалт:
- greeting: Мэндчилгээ, анхны мессеж
- event_list: Ямар арга хэмжээ байгааг асуух
- event_info: Тодорхой нэг арга хэмжээний мэдээлэл (цаг, газар, уран бүтээлчид)
- ticket_price: Тасалбарын үнэ асуух
- booking_start: Тасалбар захиалах / худалдаж авах хүсэлт
- select_zone: Бүс сонгох (VIP, Standard гэх мэт)
- select_seat: Тодорхой суудал сонгох (A1, B3 гэх мэт pattern)
- confirm_booking: Захиалга баталгаажуулах (тийм, за, ok)
- cancel_booking: Захиалга цуцлах (үгүй, болих, буцах)
- payment_select: Төлбөрийн хэлбэр сонгох (QPay, банк гэх мэт)
- payment_info: Төлбөрийн ерөнхий мэдээлэл асуух
- payment_issue: Төлбөр хийсэн ч баталгаажаагүй, давхар төлсөн
- refund: Тасалбар буцаах, мөнгө буцаалт
- ticket_transfer: Тасалбар бусдад шилжүүлэх, суудал солих, upgrade
- ticket_check: Захиалсан тасалбар шалгах, QR код, и-тасалбар
- group_booking: 10+ тасалбар, бөөн захиалга, корпоратив
- venue_info: Заалны байршил, зогсоол, орц, замын зааварчилгаа
- age_restriction: Насны хязгаар, хүүхэд оруулах эсэх
- technical_issue: Вебсайт/апп ажиллахгүй, алдаа, bug
- complaint: Гомдол, санал хүсэлт, сэтгэл ханамжгүй
- human_agent: Ажилтантай шууд ярих хүсэлт
- operating_hours: Ажиллах цагийн мэдээлэл
- unknown: Дээрх intent-үүдийн алинд ч хамаарахгүй

Чухал дүрмүүд:
1. Монгол, англи, кирилл, латин холимог бичсэн байж болно
2. Үсгийн алдаа, товчлол байж болно (жишээ: "тслбр" = төлбөр)
3. НЭГ МЕССЕЖИНД ОЛОН INTENT байж болно! Бүгдийг intents массивт оруул
4. Нэг intent байвал ганцыг нь оруул
5. primary_intent дээр хамгийн чухлыг тавь

Зөвхөн JSON хариул, өөр юу ч бичэхгүй:
{"intents": [{"intent": "intent_id", "confidence": 0.0-1.0, "entities": {}}], "primary_intent": "intent_id"}`;

// Few-shot жишээнүүд — чи Intent Lab-аас export хийсэн жишээнүүдээ энд оруулна
const FEW_SHOT = [
  { role: 'user', content: 'сайн байна уу' },
  { role: 'assistant', content: '{"intents": [{"intent": "greeting", "confidence": 0.98, "entities": {}}], "primary_intent": "greeting"}' },
  { role: 'user', content: 'The Hu үнэ хэд вэ цаг нь хэд вэ' },
  { role: 'assistant', content: '{"intents": [{"intent": "ticket_price", "confidence": 0.93, "entities": {"event_name": "The Hu"}}, {"intent": "event_info", "confidence": 0.91, "entities": {"event_name": "The Hu"}}], "primary_intent": "ticket_price"}' },
  { role: 'user', content: 'tkts hden we' },
  { role: 'assistant', content: '{"intents": [{"intent": "ticket_price", "confidence": 0.82, "entities": {}}], "primary_intent": "ticket_price"}' },
  { role: 'user', content: 'тасалбар авмаар байна' },
  { role: 'assistant', content: '{"intents": [{"intent": "booking_start", "confidence": 0.95, "entities": {}}], "primary_intent": "booking_start"}' },
  { role: 'user', content: 'мөнгөө шилжүүлсэн тасалбар ирсэнгүй' },
  { role: 'assistant', content: '{"intents": [{"intent": "payment_issue", "confidence": 0.93, "entities": {}}], "primary_intent": "payment_issue"}' },
  { role: 'user', content: 'хаана болох юм бэ хүүхэдтэйгээ очиж болох уу' },
  { role: 'assistant', content: '{"intents": [{"intent": "venue_info", "confidence": 0.90, "entities": {}}, {"intent": "age_restriction", "confidence": 0.89, "entities": {}}], "primary_intent": "venue_info"}' },
];

/**
 * Мессежээс intent таних
 * @param {string} message - Хэрэглэгчийн мессеж
 * @param {object} context - Одоогийн session context (booking flow step гэх мэт)
 * @returns {object} { intents: [...], primary_intent: "..." }
 */
async function detectIntent(message, context = {}) {
  try {
    // Context rule: Booking flow-ийн дунд байвал
    const override = checkContextOverride(message, context);
    if (override) return override;

    const messages = [
      ...FEW_SHOT,
      { role: 'user', content: message }
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages
    });

    const text = response.content[0].text.trim();
    const result = JSON.parse(text);

    console.log(`🧠 Intent: ${result.primary_intent} (${result.intents.length} total)`);
    return result;

  } catch (err) {
    console.error('AI intent detection failed:', err.message);
    // Fallback: keyword matching
    return keywordFallback(message);
  }
}

/**
 * Context override — Booking flow дунд байхад
 */
function checkContextOverride(message, context) {
  if (!context.currentStep) return null;

  const lower = message.toLowerCase().trim();

  switch (context.currentStep) {
    case 'select_seat':
      if (/^[a-z]\d{1,3}$/i.test(lower)) {
        return {
          intents: [{ intent: 'select_seat', confidence: 0.99, entities: { seat_id: message.toUpperCase() } }],
          primary_intent: 'select_seat'
        };
      }
      break;

    case 'confirm':
      const yesWords = ['тийм', 'за', 'зөв', 'ok', 'yes', 'болно', 'тийм ээ', 'confirm'];
      const noWords = ['үгүй', 'буцах', 'өөр', 'болих', 'no', 'cancel'];
      if (yesWords.some(w => lower.includes(w))) {
        return { intents: [{ intent: 'confirm_booking', confidence: 0.95, entities: {} }], primary_intent: 'confirm_booking' };
      }
      if (noWords.some(w => lower.includes(w))) {
        return { intents: [{ intent: 'cancel_booking', confidence: 0.90, entities: {} }], primary_intent: 'cancel_booking' };
      }
      break;

    case 'payment':
      if (lower.includes('qpay') || lower === '1') {
        return { intents: [{ intent: 'payment_select', confidence: 0.95, entities: { method: 'qpay' } }], primary_intent: 'payment_select' };
      }
      if (lower.includes('social') || lower === '2') {
        return { intents: [{ intent: 'payment_select', confidence: 0.95, entities: { method: 'socialpay' } }], primary_intent: 'payment_select' };
      }
      if (lower.includes('банк') || lower.includes('bank') || lower === '3') {
        return { intents: [{ intent: 'payment_select', confidence: 0.95, entities: { method: 'bank' } }], primary_intent: 'payment_select' };
      }
      if (lower.includes('карт') || lower.includes('card') || lower === '4') {
        return { intents: [{ intent: 'payment_select', confidence: 0.95, entities: { method: 'card' } }], primary_intent: 'payment_select' };
      }
      break;
  }
  return null;
}

/**
 * Keyword fallback — AI ажиллахгүй бол
 */
function keywordFallback(message) {
  const lower = message.toLowerCase();
  const keywords = {
    greeting: ['сайн байна уу', 'сайн уу', 'hello', 'hi', 'мэнд'],
    event_list: ['ямар арга хэмжээ', 'ямар концерт', 'юу болох', 'жагсаалт'],
    event_info: ['хэзээ', 'хаана', 'цаг', 'газар', 'мэдээлэл'],
    ticket_price: ['үнэ', 'хэд', 'хэдээр', 'price'],
    booking_start: ['захиалах', 'захиалга', 'авах', 'авъя', 'buy', 'book'],
    payment_info: ['төлбөр', 'төлөх', 'qpay', 'банк', 'карт'],
    payment_issue: ['төлсөн', 'баталгаажаагүй', 'ирсэнгүй'],
    refund: ['буцаалт', 'буцаах', 'цуцлах', 'refund'],
    ticket_check: ['шалгах', 'миний тасалбар', 'qr'],
    group_booking: ['бөөнөөр', 'олноор', 'групп'],
    venue_info: ['зогсоол', 'хаяг', 'орц', 'байршил'],
    age_restriction: ['хүүхэд', 'нас', 'хязгаар'],
    technical_issue: ['ажиллахгүй', 'алдаа', 'error'],
    complaint: ['гомдол', 'муу', 'тааламжгүй'],
    human_agent: ['ажилтан', 'хүн', 'оператор', 'тусламж'],
    operating_hours: ['ажиллах цаг', 'хэдэн цагт']
  };

  for (const [intent, words] of Object.entries(keywords)) {
    if (words.some(w => lower.includes(w))) {
      return {
        intents: [{ intent, confidence: 0.70, entities: {} }],
        primary_intent: intent
      };
    }
  }

  return {
    intents: [{ intent: 'unknown', confidence: 0.50, entities: {} }],
    primary_intent: 'unknown'
  };
}

module.exports = { detectIntent };
