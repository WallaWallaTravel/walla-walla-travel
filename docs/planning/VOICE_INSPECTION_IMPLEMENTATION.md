# 🎤 Voice Interface Implementation Plan

**Status:** In Progress  
**Started:** November 5, 2025  
**Estimated Completion:** 15-20 hours

---

## 🎯 Goal

Add voice-driven inspection capability as an **overlay/option** for drivers. Drivers can choose between:
- ✅ **Checkbox Mode** (existing - tap through checklist)
- 🎤 **Voice Mode** (new - speak through inspection)

---

## 🏗️ Architecture

### **Voice Recognition Strategy:**
1. **Primary:** Deepgram API (online, high accuracy)
2. **Fallback:** Web Speech API (browser-based, lower accuracy)
3. **Future:** Whisper.cpp (offline, requires more setup)

### **Text-to-Speech:**
- Web Speech API (built into browsers)
- No additional cost
- Works offline

---

## 📦 Phase 1: Basic Voice Interface (6-8 hours)

### **1.1 Voice Hook** (2 hours)
**File:** `lib/hooks/useVoiceRecognition.ts`

```typescript
interface VoiceRecognitionReturn {
  isListening: boolean
  transcript: string
  confidence: number
  startListening: () => void
  stopListening: () => void
  isSupported: boolean
  error: string | null
}
```

**Features:**
- [x] Web Speech API integration
- [ ] Start/stop recording
- [ ] Real-time transcript
- [ ] Confidence scoring
- [ ] Error handling
- [ ] Browser compatibility check

---

### **1.2 Text-to-Speech Hook** (1 hour)
**File:** `lib/hooks/useTextToSpeech.ts`

```typescript
interface TextToSpeechReturn {
  speak: (text: string) => Promise<void>
  stop: () => void
  isSpeaking: boolean
  isSupported: boolean
}
```

**Features:**
- [ ] Web Speech Synthesis API
- [ ] Voice selection
- [ ] Rate/pitch control
- [ ] Queue management

---

### **1.3 Voice Inspector Component** (3-4 hours)
**File:** `components/inspections/VoiceInspector.tsx`

```typescript
<VoiceInspector
  items={inspectionItems}
  onComplete={(results) => saveInspection(results)}
  onCancel={() => switchToCheckboxMode()}
/>
```

**UI Features:**
- [ ] Large microphone button
- [ ] Visual feedback (listening indicator)
- [ ] Current item being inspected
- [ ] Progress indicator
- [ ] Skip/repeat buttons
- [ ] Emergency stop button

---

## 📦 Phase 2: Enhanced Voice Interface (4-6 hours)

### **2.1 Command Parser** (2 hours)
**File:** `lib/voice/command-parser.ts`

**Supported Commands:**
```
"Pass" / "Good" / "OK" / "Yes" → Mark as pass
"Fail" / "No" / "Problem" / "Issue" → Mark as fail
"Note: [text]" → Add note
"Repeat" / "Say again" → Repeat question
"Skip" → Skip this item
"Cancel" / "Stop" → Exit voice mode
```

**Features:**
- [ ] Natural language processing
- [ ] Fuzzy matching
- [ ] Multi-language support (future)
- [ ] Custom commands

---

### **2.2 Deepgram Integration** (2-3 hours)
**File:** `lib/voice/deepgram-client.ts`

**Why Deepgram?**
- ✅ High accuracy (95%+)
- ✅ Real-time streaming
- ✅ Affordable ($0.0059/min)
- ✅ Command-optimized models
- ✅ Good for noisy environments

**Implementation:**
```typescript
const deepgram = createDeepgramClient(apiKey)
const stream = deepgram.transcription.live({
  model: 'nova-2',
  language: 'en-US',
  punctuate: true,
  interim_results: true
})
```

**Features:**
- [ ] API client setup
- [ ] Streaming transcription
- [ ] WebSocket connection
- [ ] Error handling
- [ ] Fallback to Web Speech API

---

### **2.3 Voice Settings** (1 hour)
**File:** `app/driver-portal/settings/voice/page.tsx`

**Settings:**
- [ ] Voice recognition provider (Deepgram / Web Speech)
- [ ] TTS voice selection
- [ ] Speech rate (slow/normal/fast)
- [ ] Confirmation mode (immediate / confirm each)
- [ ] Background noise threshold
- [ ] Auto-advance timeout

---

## 📦 Phase 3: Offline Voice (5-7 hours) - FUTURE

### **3.1 Whisper.cpp Integration**
**Complexity:** High  
**Benefits:** Works completely offline

**Requirements:**
- WASM build of Whisper
- ~40MB model download
- IndexedDB for model storage
- Web Workers for processing

**Decision:** Skip for MVP, add later if needed

---

## 🎨 UI/UX Design

### **Voice Mode Toggle**
Location: Top of inspection page

```
┌─────────────────────────────────┐
│  Checkbox Mode  |  Voice Mode   │
│       ✓         |      🎤       │
└─────────────────────────────────┘
```

---

### **Voice Inspector UI**
```
┌─────────────────────────────────────┐
│    Pre-Trip Inspection (Voice)      │
├─────────────────────────────────────┤
│                                     │
│         Progress: 5/24              │
│      ████████░░░░░░░░░ 21%         │
│                                     │
│       🎤 Listening...               │
│                                     │
│   "Check brake lights"              │
│                                     │
│  Say: Pass, Fail, or Note           │
│                                     │
│     You said: "Pass"                │
│     Confidence: 95%                 │
│                                     │
│  [◀ Back]  [Stop 🛑]  [Skip ▶]     │
│                                     │
└─────────────────────────────────────┘
```

---

### **Command Confirmation UI**
```
┌─────────────────────────────────────┐
│   You said: "Fail"                  │
│   Confidence: 87%                   │
│                                     │
│   ✓ Confirm   ✗ Retry   ⏭ Skip    │
└─────────────────────────────────────┘
```

---

## 💰 Cost Analysis

### **Deepgram Pricing:**
```
Pay-as-you-go: $0.0059 per minute
$125 credit: 21,186 minutes (353 hours)

Average inspection: 5-10 minutes
Cost per inspection: $0.03 - $0.06

Monthly usage (50 inspections):
- Minutes: 250-500
- Cost: $1.50 - $3.00
```

### **Comparison:**
| Provider | Cost/min | Accuracy | Offline | Notes |
|----------|----------|----------|---------|-------|
| Deepgram | $0.0059 | 95%+ | No | Best accuracy |
| Web Speech API | FREE | 80-90% | No | Built-in |
| Whisper.cpp | FREE | 90%+ | Yes | Complex setup |

**Recommendation:** Start with Deepgram + Web Speech API fallback

---

## 🧪 Testing Plan

### **Unit Tests:**
- [ ] Voice recognition hook
- [ ] TTS hook
- [ ] Command parser
- [ ] Deepgram client

### **Integration Tests:**
- [ ] Full voice inspection flow
- [ ] Fallback scenarios
- [ ] Error handling
- [ ] Offline behavior

### **User Testing:**
- [ ] Test in quiet environment
- [ ] Test in noisy truck
- [ ] Test with different accents
- [ ] Test with background noise
- [ ] Test on real devices

---

## 📊 Success Metrics

### **Target Goals:**
- **Accuracy:** >90% command recognition
- **Speed:** <3s per item (vs 5s checkbox)
- **Adoption:** 50%+ drivers prefer voice mode
- **Completion Rate:** 95%+ (vs 92% checkbox)
- **Error Rate:** <5% misunderstood commands

### **Track:**
- Voice vs checkbox usage ratio
- Average inspection time (voice vs checkbox)
- Command accuracy rate
- User satisfaction scores
- Fallback trigger rate

---

## 🚀 Implementation Steps

### **Week 1 (Day 1-3):**
- [x] Plan and design ✅
- [ ] Create voice recognition hook
- [ ] Create TTS hook
- [ ] Build basic UI
- [ ] Test Web Speech API

### **Week 1 (Day 4-5):**
- [ ] Implement command parser
- [ ] Build voice inspector component
- [ ] Add mode toggle
- [ ] Basic integration test

### **Week 2 (Day 1-3):**
- [ ] Integrate Deepgram
- [ ] Add fallback logic
- [ ] Implement settings page
- [ ] Comprehensive testing

### **Week 2 (Day 4-5):**
- [ ] Real device testing
- [ ] Bug fixes
- [ ] Documentation
- [ ] Deploy to staging

---

## 🔧 Configuration

### **Environment Variables:**
```bash
# .env.local
NEXT_PUBLIC_DEEPGRAM_API_KEY=xxx
NEXT_PUBLIC_VOICE_ENABLED=true
NEXT_PUBLIC_VOICE_PROVIDER=deepgram  # or 'webspeech'
NEXT_PUBLIC_VOICE_CONFIDENCE_THRESHOLD=0.7
```

### **Feature Flags:**
```typescript
// lib/config/features.ts
export const FEATURES = {
  VOICE_INSPECTIONS: true,
  DEEPGRAM_ENABLED: true,
  OFFLINE_VOICE: false  // Phase 3
}
```

---

## 📝 API Endpoints

### **No new endpoints needed!**
Voice is a UI enhancement that uses existing inspection APIs:
- `POST /api/inspections` (same as checkbox mode)
- Data structure is identical
- Just a different input method

---

## 🔮 Future Enhancements (Post-MVP)

### **Phase 4 (Future):**
- [ ] Multi-language support (Spanish, etc.)
- [ ] Custom voice commands per driver
- [ ] Voice-to-text notes (full sentences)
- [ ] Offline voice with Whisper.cpp
- [ ] Voice shortcuts (macros)
- [ ] Integration with other modules (time clock, expense reports)

### **Expansion to Other Features:**
Once voice is proven with inspections:
- [ ] Voice time clock ("Clock in", "Clock out")
- [ ] Voice navigation
- [ ] Voice search
- [ ] Voice assistant ("Hey Walla...")

---

## 🐛 Known Challenges

### **Technical Challenges:**
1. **Noisy Environment:** Trucks can be loud
   - **Solution:** Noise cancellation, Deepgram's noise-robust model
2. **Accent Variability:** Different drivers, different accents
   - **Solution:** Train on varied accents, fuzzy matching
3. **Network Reliability:** Deepgram needs internet
   - **Solution:** Fallback to Web Speech API, then checkbox mode

### **UX Challenges:**
1. **Command Learning Curve:** Drivers need to learn commands
   - **Solution:** Clear prompts, visual hints, tutorial
2. **Confidence in Accuracy:** "Did it hear me right?"
   - **Solution:** Show transcript, confirmation mode
3. **Preference Divide:** Some drivers may prefer checkboxes
   - **Solution:** Make it optional, easy toggle

---

## 📋 Files to Create

```
lib/
  hooks/
    useVoiceRecognition.ts          ← Web Speech API
    useTextToSpeech.ts              ← TTS
  voice/
    command-parser.ts               ← Parse voice commands
    deepgram-client.ts              ← Deepgram integration
  config/
    voice-config.ts                 ← Voice settings

components/
  inspections/
    VoiceInspector.tsx              ← Main voice UI
    VoiceModeToggle.tsx             ← Checkbox vs Voice toggle
    VoiceCommandHelp.tsx            ← Help overlay
    VoiceVisualizer.tsx             ← Audio waveform (optional)

app/
  driver-portal/
    settings/
      voice/
        page.tsx                    ← Voice settings
```

---

## ✅ Definition of Done

- [ ] Voice recognition works with >90% accuracy
- [ ] TTS reads each inspection item clearly
- [ ] Drivers can complete full inspection via voice
- [ ] Fallback to Web Speech API works
- [ ] Mode toggle is intuitive
- [ ] Settings page is functional
- [ ] Tested on 3+ real devices
- [ ] Tested in noisy environment
- [ ] Documentation complete
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] User testing completed (3+ drivers)

---

**Status:** 📝 Planning Complete → Moving to Implementation  
**Next Step:** Create voice recognition hook  
**Last Updated:** November 5, 2025  
**Maintained By:** Development Team

