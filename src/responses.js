/**
 * Response Templates — Intent бүрийн хариулт
 * 
 * TODO: event_list, event_info, ticket_price зэрэг dynamic хариултуудыг
 * EventX API-аас бодит мэдээлэл авч солих хэрэгтэй.
 * Одоогоор hardcode жишээ мэдээлэлтэй.
 */

// ============================================
// TODO: Энд EventX-ийн бодит мэдээллийг оруулна
// Хожим API-аас авч солино
// ============================================
const DEMO_EVENTS = [
  {
    name: 'The Hu — Live Concert',
    date: '2026.04.15',
    time: '19:00',
    venue: 'Төв цэнгэлдэх хүрээлэн',
    zones: { 'VIP': '150,000₮', 'Premium': '100,000₮', 'Standard': '60,000₮' },
    age_limit: '16+',
    door_open: '17:30'
  },
  {
    name: 'Camerton — 20 жилийн ой',
    date: '2026.05.01',
    time: '18:00',
    venue: 'UB Palace',
    zones: { 'VIP': '200,000₮', 'Standard': '80,000₮' },
    age_limit: 'Хязгааргүй',
    door_open: '16:30'
  }
];

function findEvent(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  return DEMO_EVENTS.find(e => e.name.toLowerCase().includes(lower));
}

// ============================================
// Хариултууд
// ============================================

const responses = {

  greeting() {
    return `Сайн байна уу! 🎵 EventX-д тавтай морил!

Би танд дараах зүйлсээр туслах боломжтой:

1️⃣ Тасалбар захиалах
2️⃣ Арга хэмжээний мэдээлэл авах
3️⃣ Төлбөрийн мэдээлэл
4️⃣ Буцаалт / солилт
5️⃣ Миний тасалбар шалгах

Юугаар туслах вэ? 😊`;
  },

  event_list() {
    const list = DEMO_EVENTS.map((e, i) => `${i + 1}️⃣ ${e.name}\n   📅 ${e.date} | 📍 ${e.venue}`).join('\n\n');
    return `🎵 Идэвхтэй арга хэмжээнүүд:\n\n${list}\n\nДэлгэрэнгүй мэдээлэл авах бол арга хэмжээний нэрийг бичнэ үү.`;
  },

  event_info(eventName) {
    const event = findEvent(eventName);
    if (!event) return `"${eventName}" арга хэмжээ олдсонгүй. "Арга хэмжээнүүд" гэж бичвэл жагсаалт харуулна.`;

    const prices = Object.entries(event.zones).map(([z, p]) => `   • ${z}: ${p}`).join('\n');
    return `🎵 ${event.name}

📅 Огноо: ${event.date}
🕐 Эхлэх: ${event.time}
🚪 Хаалга нээх: ${event.door_open}
📍 Байршил: ${event.venue}
👶 Насны хязгаар: ${event.age_limit}

🎫 Тасалбарын үнэ:
${prices}

Захиалах бол "Захиалах" гэж бичнэ үү! 🎶`;
  },

  event_info_ask() {
    return `Аль арга хэмжээний талаар асууж байна вэ? Нэрийг нь хэлнэ үү.\n\nЖагсаалт харах бол "Арга хэмжээнүүд" гэж бичээрэй.`;
  },

  ticket_price(eventName) {
    const event = findEvent(eventName);
    if (!event) return `"${eventName}" арга хэмжээ олдсонгүй. "Арга хэмжээнүүд" гэж бичнэ үү.`;

    const prices = Object.entries(event.zones).map(([z, p]) => `   • ${z}: ${p}`).join('\n');
    return `🎫 ${event.name} — Тасалбарын үнэ:\n\n${prices}\n\n💡 Үнэд НӨАТ, үйлчилгээний хураамж орсон.\n\nЗахиалах бол "Захиалах" гэж бичнэ үү!`;
  },

  ticket_price_ask() {
    return `Аль арга хэмжээний үнийг мэдэхийг хүсэж байна вэ?`;
  },

  booking_start() {
    const list = DEMO_EVENTS.map((e, i) => `${i + 1}️⃣ ${e.name}`).join('\n');
    return `Тасалбар захиалъя! 🎶\n\nАль арга хэмжээ?\n\n${list}`;
  },

  select_zone(eventName) {
    const event = findEvent(eventName);
    if (!event) return `Аль арга хэмжээний тасалбар авах вэ?`;

    const zones = Object.entries(event.zones).map(([z, p]) => `   • ${z}: ${p}`).join('\n');
    return `${event.name} — Бүс сонгоно уу:\n\n${zones}\n\nАль бүсийг сонгох вэ? (VIP, Premium, Standard гэж бичнэ үү)`;
    // TODO: Суудлын бүсийн зураг илгээх
  },

  select_seat(bookingData) {
    return `${bookingData.zone || ''} бүсийн суудлууд:\n\n🟩 Сул | 🟥 Захиалсан\n\nСуудлаа сонгоно уу (жишээ: A3, B5)`;
    // TODO: Суудлын зураг илгээх
  },

  confirm_booking(bookingData) {
    return `Захиалга баталгаажуулна уу:\n━━━━━━━━━━━━━━━\n🎵 ${bookingData.eventName || 'Арга хэмжээ'}\n📍 ${bookingData.zone || 'Бүс'} — ${bookingData.seatId || 'Суудал'}\n━━━━━━━━━━━━━━━\n\n✅ Тийм — Баталгаажуулах\n❌ Үгүй — Өөр суудал сонгох`;
  },

  reselect_seat(bookingData) {
    return `Тэгье! Өөр суудал сонгоно уу (жишээ: A3, B5)`;
  },

  cancel_booking() {
    return `Захиалга цуцлагдлаа. Дахин захиалах бол "Захиалах" гэж бичнэ үү 😊`;
  },

  payment_select() {
    return `Захиалга баталгаажлаа! 🎉\n\nТөлбөрийн хэлбэрээ сонгоно уу:\n\n1️⃣ QPay — QR код\n2️⃣ SocialPay — Аппаар\n3️⃣ Банк шилжүүлэг\n4️⃣ Карт онлайн (Visa/MC)`;
  },

  payment_method(method, bookingData) {
    switch (method) {
      case 'qpay':
        return `📱 QPay төлбөр:\n\n[QR код энд гарна]\n\n⏰ 15 минутын дотор хүчинтэй.\nТөлбөр баталгаажсан даруйд и-тасалбар ирнэ.`;
      case 'socialpay':
        return `📱 SocialPay төлбөр:\n\nДанс: XXXX-XXXX\nГүйлгээний утга: EVX-XXXXX\n\n⏰ 30 минутын дотор шилжүүлнэ үү.`;
      case 'bank':
        return `🏦 Банк шилжүүлэг:\n\nБанк: Хаан банк\nДанс: XXXX-XXXX-XXXX\nНэр: EventX ХХК\nГүйлгээний утга: EVX-XXXXX\n\n⚠️ Гүйлгээний утга заавал!\n⏰ 2 цагийн дотор.`;
      case 'card':
        return `💳 Карт онлайн:\n\n[Төлбөрийн линк энд гарна]\n\nVisa, Mastercard дэмждэг.\n⏰ 15 минутын дотор хүчинтэй.`;
      default:
        return this.payment_select();
    }
  },

  payment_info() {
    return `💳 Төлбөрийн боломжит хэлбэрүүд:\n\n📱 QPay — QR код уншуулах (хамгийн хурдан)\n📱 SocialPay — Аппаар шилжүүлэх\n🏦 Банк шилжүүлэг — Дансны мэдээлэл өгнө\n💳 Карт онлайн — Visa / Mastercard\n\n✅ Төлбөр баталгаажсан даруйд и-тасалбар Messenger-ээр ирнэ.\n\nЗахиалах бол "Захиалах" гэж бичнэ үү!`;
  },

  payment_issue() {
    return `⚠️ Төлбөрийн асуудал гарсанд уучлаарай.\n\nДараах мэдээллийг бичнэ үү:\n• Захиалгын дугаар (EVX-XXXXX)\n• Төлбөрийн хэлбэр\n• Төлсөн огноо, цаг\n\nМанай ажилтан шалгаж удахгүй хариулна!`;
  },

  refund() {
    return `🔄 Буцаалтын бодлого:\n\n✅ 72+ цагийн өмнө → 100% буцаалт\n⚠️ 24-72 цаг → 50% буцаалт\n❌ 24 цагаас дотор → Буцаалт хийгдэхгүй\n\nЗахиалгын дугаараа бичнэ үү (EVX-XXXXX).`;
  },

  ticket_transfer() {
    return `🔄 Тасалбар солих/шилжүүлэх:\n\n👤 Нэр шилжүүлэх: 24+ цагийн өмнө\n💺 Суудал солих: Сул суудал байвал\n⬆️ Бүс upgrade: Зөрүү төлбөрөөр\n\nЗахиалгын дугаараа бичнэ үү!`;
  },

  ticket_check() {
    return `🎫 Тасалбараа шалгахын тулд:\n\n1️⃣ Захиалгын дугаар (EVX-12345)\n2️⃣ Утасны дугаар\n3️⃣ И-мэйл\n\nАль нэгийг нь оруулна уу.`;
  },

  group_booking() {
    return `👥 Бөөн захиалгын хөнгөлөлт:\n\n• 10-19: 10%\n• 20-49: 15%\n• 50+: Тусгай үнэ\n\nБорлуулалтын багтай холбож өгье! 👨‍💼`;
  },

  venue_info(eventName) {
    const event = findEvent(eventName);
    if (!event) return `Аль арга хэмжээний байршлын мэдээлэл хэрэгтэй вэ?`;

    return `📍 ${event.venue}\n\n🚪 Хаалга нээх: ${event.door_open}\n🚗 Зогсоол: Байдаг (эрт ирэхийг зөвлөж байна)\n\n💡 Орц дээр тасалбарын QR код шалгана.`;
  },

  age_restriction(eventName) {
    const event = findEvent(eventName);
    if (!event) {
      return `Арга хэмжээ бүрт өөр:\n• Ихэнх концерт: 16+\n• Гэр бүлийн шоу: Хязгааргүй\n• Шөнийн арга хэмжээ: 18+\n\nАль арга хэмжээ вэ?`;
    }
    return `👶 ${event.name} — Насны хязгаар: ${event.age_limit}`;
  },

  technical_issue() {
    return `⚠️ Техникийн асуудал гарсанд уучлаарай!\n\nЮу болсныг дэлгэрэнгүй бичнэ үү. Манай техникийн баг шалгаж хариулна!`;
  },

  complaint() {
    return `Таны санал хүсэлтийг хүлээж авлаа 🙏\n\nХариуцлагатай ажилтан удахгүй хариулна. Асуудлаа дэлгэрэнгүй бичнэ үү.`;
  },

  human_agent() {
    return `Ажилтантай холбож өгье 👨‍💼\n\n⏰ Ажлын цаг: 09:00 - 22:00\n📞 Утас: +976 XXXX-XXXX\n\nАсуудлаа бичвэл ажилтанд дамжуулна.`;
  },

  operating_hours() {
    return `⏰ Үйлчилгээний цаг:\n\n🤖 Chatbot: 24/7\n👨‍💼 Ажилтан: 09:00 - 22:00 (өдөр бүр)\n📞 Утас: 09:00 - 18:00 (ажлын өдрүүд)`;
  },

  unknown_retry() {
    return `Уучлаарай, ойлгож чадсангүй 😅\n\n1️⃣ Тасалбар захиалах\n2️⃣ Арга хэмжээний мэдээлэл\n3️⃣ Төлбөрийн асуудал\n4️⃣ Буцаалт / солилт\n5️⃣ Ажилтантай холбогдох`;
  },

  unknown_escalate() {
    return `Ажилтантай холбож өгье! Түр хүлээнэ үү 👨‍💼`;
  },

  escalate_generic() {
    return `Таны асуултыг манай ажилтанд дамжуулсан. Удахгүй хариулна 👨‍💼`;
  }
};

module.exports = responses;
