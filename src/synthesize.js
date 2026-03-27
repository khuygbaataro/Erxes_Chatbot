/**
 * Response Synthesizer — Олон intent-ийн хариултыг AI-аар нэгтгэх
 */

const Anthropic = require('@anthropic-ai/sdk');
const responses = require('./responses');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYNTHESIS_PROMPT = `Чи бол EventX Messenger chatbot. Хэрэглэгч нэг мессежинд олон асуулт асуусан. Доорх мэдээллүүдийг нэгтгэж, нэг цэгцтэй, найрсаг хариулт бич.

Дүрмүүд:
1. Бүх асуултад хариулсан байх
2. Давхардал гаргахгүй (event нэр 2 удаа бичэхгүй)
3. Мэдээллийг логик дарааллаар байрлуул
4. Товч, тодорхой, emoji хэрэглэ
5. 640 тэмдэгтээс хэтрэхгүй
6. Төгсгөлд дараагийн алхам санал болго
7. Монгол хэлээр бич
8. Зөвхөн хариултын текстийг бич, өөр юу ч нэмэхгүй`;

/**
 * Олон intent-ийн хариултыг нэгтгэх
 */
async function synthesizeResponse(userMessage, intents) {
  try {
    // Intent бүрийн мэдээллийг авах
    const intentData = intents.map(i => {
      const entities = i.entities || {};
      let response = '';

      switch (i.intent) {
        case 'event_info':
          response = responses.event_info(entities.event_name);
          break;
        case 'ticket_price':
          response = responses.ticket_price(entities.event_name);
          break;
        case 'venue_info':
          response = responses.venue_info(entities.event_name);
          break;
        case 'age_restriction':
          response = responses.age_restriction(entities.event_name);
          break;
        case 'payment_info':
          response = responses.payment_info();
          break;
        case 'operating_hours':
          response = responses.operating_hours();
          break;
        case 'refund':
          response = responses.refund();
          break;
        default:
          response = responses[i.intent] ? responses[i.intent]() : '';
      }

      return { intent: i.intent, data: response };
    });

    const prompt = `Хэрэглэгчийн мессеж: "${userMessage}"

Олдсон мэдээлэл:
${intentData.map(d => `[${d.intent}]:\n${d.data}`).join('\n\n')}

Дээрх мэдээллүүдийг нэгтгэж нэг хариулт бич.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: SYNTHESIS_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text.trim();
    console.log(`🔀 Synthesized ${intents.length} intents into one response`);
    return text;

  } catch (err) {
    console.error('Synthesis failed:', err.message);
    // Fallback: primary intent-ийн хариултыг буцаах
    const primary = intents[0];
    const entities = primary.entities || {};

    if (responses[primary.intent]) {
      return typeof responses[primary.intent] === 'function'
        ? responses[primary.intent](entities.event_name)
        : responses[primary.intent]();
    }
    return responses.unknown_retry();
  }
}

module.exports = { synthesizeResponse };
