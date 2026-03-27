# EventX Messenger Bot — Тохиргооны заавар

## 📁 Файлын бүтэц

```
eventx-bot/
├── .env.example      ← Тохиргоо загвар (.env рүү хуулна)
├── package.json      ← Dependency жагсаалт
└── src/
    ├── index.js      ← Express сервер + webhook
    ├── messenger.js  ← Facebook Messenger API дуудлагууд
    ├── intent.js     ← AI intent detection (Claude API)
    ├── bot.js        ← Bot логик + session удирдлага
    ├── responses.js  ← Хариултын загварууд (ЧИ ЭНД ЗАСНА)
    └── synthesize.js ← Олон intent нэгтгэх
```

## 🚀 Алхам 1: Сервер дээр байршуулах

```bash
# Файлуудыг сервер рүү хуулах
scp -r eventx-bot/ user@your-server:/home/user/

# Серверт холбогдох
ssh user@your-server

# Хавтас руу орох
cd eventx-bot

# .env файл үүсгэх
cp .env.example .env
nano .env   # <-- Тохиргоог бөглөнө

# Dependency суулгах
npm install

# dotenv суулгах
npm install dotenv

# Эхлүүлэх
npm start
```

## 🔑 Алхам 2: Anthropic API Key авах

1. https://console.anthropic.com руу орно
2. Бүртгүүлнэ / нэвтэрнэ
3. Settings → API Keys → Create Key
4. Key-ээ .env файлын `ANTHROPIC_API_KEY` дээр тавина

## 📘 Алхам 3: Facebook тохиргоо

### 3.1 Facebook App үүсгэх
1. https://developers.facebook.com руу орно
2. "My Apps" → "Create App" → "Business" сонгоно
3. App-ийн нэр: "EventX Bot"

### 3.2 Messenger тохиргоо
1. App Dashboard → "Add Product" → "Messenger" → "Set Up"
2. "Access Tokens" хэсэгт Facebook Page-ээ сонгоно
3. "Generate Token" дарж Page Access Token авна
4. Токенийг .env файлын `FB_PAGE_ACCESS_TOKEN` дээр тавина

### 3.3 Webhook тохиргоо
1. "Webhooks" хэсэгт "Add Callback URL" дарна
2. Callback URL: `https://YOUR_DOMAIN/webhook`
3. Verify Token: `eventx_verify_123` (.env дээрх FB_VERIFY_TOKEN-тэй ижил)
4. "Verify and Save" дарна
5. "messages" subscription-ийг идэвхжүүлнэ

### 3.4 App Secret
1. Settings → Basic → App Secret → "Show"
2. .env файлын `FB_APP_SECRET` дээр тавина

## 🧪 Алхам 4: Тест хийх

### ngrok-аар тест (domain байхгүй бол)
```bash
# Компьютер дээрээ
npx ngrok http 3000

# ngrok-ийн өгсөн URL-ийг Facebook webhook дээр тохируулна
# Жишээ: https://abc123.ngrok.io/webhook
```

### Бодит тест
1. Facebook Page руугаа Messenger-ээр мессеж бичнэ
2. Terminal дээр log харагдана
3. Bot хариулт илгээнэ

## 📝 Алхам 5: Хариултуудаа засах

`src/responses.js` файлыг нээж:

1. `DEMO_EVENTS` массивт бодит арга хэмжээнүүдээ нэмнэ
2. Хариултын текстүүдийг өөрчилнө
3. Серверийг restart хийнэ: `npm start`

## 🔜 Дараагийн алхамууд (хожим нэмнэ)

- [ ] Discord bot — ажилтанд мэдэгдэл явуулах
- [ ] Суудлын зураг — canvas-аар үүсгэж Messenger-ээр илгээх
- [ ] EventX API холболт — бодит мэдээлэл авах
- [ ] PM2 — серверийг автоматаар restart хийх
- [ ] MongoDB — session хадгалах

## ❓ Алдаа гарвал

| Алдаа | Шийдэл |
|---|---|
| "FB_PAGE_ACCESS_TOKEN дутуу" | .env файлд token тавиагүй байна |
| Webhook verify амжилтгүй | FB_VERIFY_TOKEN .env болон Facebook дээр ижил байх ёстой |
| Bot хариулахгүй | Terminal дээр log шалгах, Messenger subscription идэвхтэй эсэхийг шалгах |
| AI intent detection алдаа | ANTHROPIC_API_KEY зөв эсэхийг шалгах. Fallback keyword matching ажиллана |
