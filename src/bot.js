/**
 * Bot Logic — Мессеж боловсруулах, session удирдах, хариулт үүсгэх
 */

const { detectIntent } = require('./intent');
const { synthesizeResponse } = require('./synthesize');
const responses = require('./responses');

// Session хадгалах (production-д Redis ашигла)
const sessions = new Map();

// Session timeout: 30 минут
const SESSION_TIMEOUT = 30 * 60 * 1000;

/**
 * Session авах / үүсгэх
 */
function getSession(senderId) {
  let session = sessions.get(senderId);
  if (!session || Date.now() - session.lastActive > SESSION_TIMEOUT) {
    session = {
      senderId,
      currentStep: null,       // Booking flow-ийн алхам
      bookingData: {},         // Захиалгын мэдээлэл
      unknownCount: 0,         // Unknown intent тоолох
      lastActive: Date.now()
    };
    sessions.set(senderId, session);
  }
  session.lastActive = Date.now();
  return session;
}

/**
 * Мессеж боловсруулах — гол функц
 */
async function handleMessage(senderId, text) {
  const session = getSession(senderId);

  // Захиалга цуцлах keyword шалгах
  const cancelWords = ['болих', 'цуцлах', 'буцах', 'cancel'];
  if (session.currentStep && cancelWords.some(w => text.toLowerCase().includes(w))) {
    session.currentStep = null;
    session.bookingData = {};
    return responses.cancel_booking();
  }

  // Intent таних
  const result = await detectIntent(text, { currentStep: session.currentStep });
  const { intents, primary_intent } = result;

  // Unknown тоолох
  if (primary_intent === 'unknown') {
    session.unknownCount++;
    if (session.unknownCount >= 2) {
      session.unknownCount = 0;
      return responses.unknown_escalate();
      // TODO: Discord руу мэдэгдэл явуулах
    }
    return responses.unknown_retry();
  }
  session.unknownCount = 0;

  // Олон intent → нэгтгэж хариулах
  if (intents.length > 1) {
    const autoIntents = intents.filter(i => !isEscalateIntent(i.intent));
    const escalateIntents = intents.filter(i => isEscalateIntent(i.intent));

    let reply = '';

    if (autoIntents.length > 0) {
      // AI-аар нэгтгэх
      reply = await synthesizeResponse(text, autoIntents);
    }

    if (escalateIntents.length > 0) {
      // TODO: Discord руу дамжуулах
      console.log(`⚠️ Escalate intents: ${escalateIntents.map(i => i.intent).join(', ')}`);
      if (reply) {
        reply += '\n\n👨‍💼 Нэмэлт асуудлыг манай ажилтанд дамжуулсан. Удахгүй хариулна.';
      } else {
        reply = responses.escalate_generic();
      }
    }

    return reply || responses.unknown_retry();
  }

  // Нэг intent — шууд хариулах
  return handleSingleIntent(primary_intent, intents[0], session, text);
}

/**
 * Нэг intent боловсруулах
 */
function handleSingleIntent(intentId, intentData, session, originalText) {
  const entities = intentData.entities || {};

  switch (intentId) {
    // ===== Мэндчилгээ =====
    case 'greeting':
      return responses.greeting();

    // ===== Арга хэмжээний жагсаалт =====
    case 'event_list':
      return responses.event_list();

    // ===== Арга хэмжээний мэдээлэл =====
    case 'event_info':
      if (entities.event_name) {
        return responses.event_info(entities.event_name);
      }
      return responses.event_info_ask();

    // ===== Тасалбарын үнэ =====
    case 'ticket_price':
      if (entities.event_name) {
        return responses.ticket_price(entities.event_name);
      }
      return responses.ticket_price_ask();

    // ===== Захиалга эхлүүлэх =====
    case 'booking_start':
      session.currentStep = 'select_event';
      session.bookingData = {};
      if (entities.event_name) {
        session.bookingData.eventName = entities.event_name;
        session.currentStep = 'select_zone';
        return responses.select_zone(entities.event_name);
      }
      return responses.booking_start();

    // ===== Бүс сонгох =====
    case 'select_zone':
      if (entities.zone) {
        session.bookingData.zone = entities.zone;
        session.currentStep = 'select_seat';
        return responses.select_seat(session.bookingData);
      }
      return responses.select_zone(session.bookingData.eventName);

    // ===== Суудал сонгох =====
    case 'select_seat':
      if (entities.seat_id) {
        session.bookingData.seatId = entities.seat_id;
        session.currentStep = 'confirm';
        return responses.confirm_booking(session.bookingData);
      }
      return responses.select_seat(session.bookingData);

    // ===== Баталгаажуулах =====
    case 'confirm_booking':
      session.currentStep = 'payment';
      return responses.payment_select();

    // ===== Цуцлах =====
    case 'cancel_booking':
      if (session.currentStep === 'confirm') {
        session.currentStep = 'select_seat';
        return responses.reselect_seat(session.bookingData);
      }
      session.currentStep = null;
      session.bookingData = {};
      return responses.cancel_booking();

    // ===== Төлбөр =====
    case 'payment_select':
      session.currentStep = null;
      return responses.payment_method(entities.method, session.bookingData);

    case 'payment_info':
      return responses.payment_info();

    case 'payment_issue':
      // TODO: Discord руу дамжуулах
      return responses.payment_issue();

    // ===== Буцаалт, солилт =====
    case 'refund':
      return responses.refund();

    case 'ticket_transfer':
      return responses.ticket_transfer();

    // ===== Тасалбар шалгах =====
    case 'ticket_check':
      return responses.ticket_check();

    // ===== Бөөн захиалга =====
    case 'group_booking':
      // TODO: Discord руу дамжуулах
      return responses.group_booking();

    // ===== Байршил =====
    case 'venue_info':
      return responses.venue_info(entities.event_name);

    // ===== Насны хязгаар =====
    case 'age_restriction':
      return responses.age_restriction(entities.event_name);

    // ===== Техникийн асуудал =====
    case 'technical_issue':
      // TODO: Discord руу дамжуулах
      return responses.technical_issue();

    // ===== Гомдол =====
    case 'complaint':
      // TODO: Discord руу дамжуулах
      return responses.complaint();

    // ===== Ажилтантай холбогдох =====
    case 'human_agent':
      // TODO: Discord руу дамжуулах
      return responses.human_agent();

    // ===== Ажиллах цаг =====
    case 'operating_hours':
      return responses.operating_hours();

    // ===== Тодорхойгүй =====
    default:
      return responses.unknown_retry();
  }
}

/**
 * Escalate хийх intent мөн эсэх
 */
function isEscalateIntent(intentId) {
  return ['payment_issue', 'technical_issue', 'complaint', 'human_agent', 'group_booking'].includes(intentId);
}

module.exports = { handleMessage };
