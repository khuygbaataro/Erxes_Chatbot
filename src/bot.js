/**
 * Bot Logic — AI-тай ярилцдаг chatbot
 */

const { detectIntent } = require('./intent');
const { generateAIResponse } = require('./ai-response');

const sessions = new Map();
const SESSION_TIMEOUT = 30 * 60 * 1000;

function getSession(senderId) {
  let session = sessions.get(senderId);
  if (!session || Date.now() - session.lastActive > SESSION_TIMEOUT) {
    session = {
      senderId,
      currentStep: null,
      bookingData: {},
      unknownCount: 0,
      conversationHistory: [],
      lastActive: Date.now()
    };
    sessions.set(senderId, session);
  }
  session.lastActive = Date.now();
  return session;
}

function addToHistory(session, role, content) {
  session.conversationHistory.push({ role, content });
  if (session.conversationHistory.length > 10) {
    session.conversationHistory = session.conversationHistory.slice(-10);
  }
}

async function handleMessage(senderId, text) {
  const session = getSession(senderId);
  addToHistory(session, 'user', text);

  // Захиалга цуцлах
  const cancelWords = ['болих', 'цуцлах', 'буцах', 'cancel', 'bolih'];
  if (session.currentStep && cancelWords.some(w => text.toLowerCase().includes(w))) {
    session.currentStep = null;
    session.bookingData = {};
    const reply = await generateAIResponse(text,
      { intents: [{ intent: 'cancel_booking', confidence: 0.95, entities: {} }], primary_intent: 'cancel_booking' },
      session, session.conversationHistory
    );
    addToHistory(session, 'assistant', reply);
    return reply;
  }

  // Intent таних
  const result = await detectIntent(text, { currentStep: session.currentStep });
  const { intents, primary_intent } = result;

  // Unknown тоолох
  if (primary_intent === 'unknown') {
    session.unknownCount++;
  } else {
    session.unknownCount = 0;
  }

  // Booking flow session удирдлага
  updateBookingSession(primary_intent, intents[0]?.entities || {}, session);

  // Escalate
  if (['payment_issue', 'technical_issue', 'complaint', 'human_agent', 'group_booking'].includes(primary_intent)) {
    console.log(`⚠️ Escalate: ${primary_intent}`);
  }

  // AI хариулт
  const reply = await generateAIResponse(text, result, session, session.conversationHistory);
  addToHistory(session, 'assistant', reply);
  return reply;
}

function updateBookingSession(intentId, entities, session) {
  switch (intentId) {
    case 'booking_start':
      session.currentStep = 'select_event';
      session.bookingData = {};
      if (entities.event_name) {
        session.bookingData.eventName = entities.event_name;
        session.currentStep = 'select_zone';
      }
      break;
    case 'select_zone':
      if (entities.zone) {
        session.bookingData.zone = entities.zone;
        session.currentStep = 'select_seat';
      }
      break;
    case 'select_seat':
      if (entities.seat_id) {
        session.bookingData.seatId = entities.seat_id;
        session.currentStep = 'confirm';
      }
      break;
    case 'confirm_booking':
      session.currentStep = 'payment';
      break;
    case 'cancel_booking':
      if (session.currentStep === 'confirm') {
        session.currentStep = 'select_seat';
      } else {
        session.currentStep = null;
        session.bookingData = {};
      }
      break;
    case 'payment_select':
      if (entities.method) {
        session.bookingData.paymentMethod = entities.method;
        session.currentStep = null;
      }
      break;
    case 'event_info':
      if (session.currentStep === 'select_event' && entities.event_name) {
        session.bookingData.eventName = entities.event_name;
        session.currentStep = 'select_zone';
      }
      break;
  }
}

module.exports = { handleMessage };
