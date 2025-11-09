# Testing Instructions

## ✅ What We've Built (Days 1-5)

The core Walla Walla Valley Travel Guide is complete and working! Here's what to test:

---

## 🔑 Step 1: Add API Keys to .env.local

**Open the file:** `.env.local` in your editor

**Add these lines with your actual API keys:**

```env
# Required for AI
OPENAI_API_KEY=<paste_your_openai_key_here>

# Required for Voice
DEEPGRAM_API_KEY=<paste_your_deepgram_key_here>
```

**Note:** Replace the placeholders with your actual keys from OpenAI and Deepgram. Never commit real keys to git!

**Save the file.**

---

## 🚀 Step 2: Start the Server

```bash
cd /Users/temp/walla-walla-final
npm run dev
```

Wait for: `✓ Ready in 2.1s`

---

## 🧪 Step 3: Test the Travel Guide

### Test 1: AI Models
**URL:** http://localhost:3000/test/ai-models

- Type: "What wineries have outdoor seating?"
- Click "Test AI Model"
- **Expected:** GPT-4o responds with recommendations

### Test 2: Voice Transcription
**URL:** http://localhost:3000/test/voice-transcription

- Click "Start Recording"
- Speak clearly
- Click "Stop Recording", then "Transcribe"
- **Expected:** Deepgram transcribes your speech

### Test 3: Full Travel Guide
**URL:** http://localhost:3000/ai-directory

- Try text input: Type and send questions
- Try voice input: Record and submit audio
- **Expected:** Full chat interface with AI responses

---

## 📱 Mobile Testing (iOS)

1. Find your network IP from `npm run dev` output
2. On iPhone, go to `http://YOUR_IP:3000/ai-directory`
3. Test voice recording

---

## 🐛 Troubleshooting

**"API key not configured"**
- Check `.env.local` has both keys
- Restart dev server

**Voice not working on iOS**
- Tap the button (iOS requires user interaction)
- Check microphone permissions

---

## ✅ Success Criteria

1. GPT-4o responds to questions
2. Deepgram transcribes audio
3. Chat interface works
4. Costs are tracked (check terminal logs)
5. Second query is instant (cached!)

---

**Ready to test! 🚀**
