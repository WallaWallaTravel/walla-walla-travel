# 🎤 Voice Inspector Testing Guide

**Last Updated:** November 6, 2025  
**Component:** `components/inspections/VoiceInspector.tsx`  
**Status:** Ready for Testing

---

## 🚀 **QUICK START**

### **1. Start the Development Server**

```bash
cd /Users/temp/walla-walla-final
npm run dev
```

The app should start at `http://localhost:3000`

---

### **2. Navigate to Voice Inspector**

Since the Voice Inspector is a component, you'll need to integrate it into a page first. Here's how:

#### **Option A: Create a Test Page (Recommended)**

```bash
# Create a test page
mkdir -p app/test
```

Create `app/test/voice-inspector/page.tsx`:

```typescript
"use client";

import { useState } from 'react';
import { VoiceInspector } from '@/components/inspections/VoiceInspector';

const MOCK_INSPECTION_ITEMS = [
  { id: '1', label: 'Tire Pressure', category: 'tires' },
  { id: '2', label: 'Brake Lights', category: 'lights' },
  { id: '3', label: 'Windshield Condition', category: 'glass' },
  { id: '4', label: 'Oil Level', category: 'fluids' },
  { id: '5', label: 'Horn', category: 'safety' },
];

export default function VoiceInspectorTestPage() {
  const [showInspector, setShowInspector] = useState(false);
  const [results, setResults] = useState(null);

  const handleComplete = (inspectionResults: any) => {
    setResults(inspectionResults);
    setShowInspector(false);
    console.log('Inspection Complete:', inspectionResults);
  };

  const handleCancel = () => {
    setShowInspector(false);
    console.log('Inspection Cancelled');
  };

  if (showInspector) {
    return (
      <VoiceInspector
        items={MOCK_INSPECTION_ITEMS}
        onComplete={handleComplete}
        onCancel={handleCancel}
        vehicleName="Test Vehicle"
        inspectionType="pre_trip"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
        <h1 className="text-2xl font-bold mb-4">Voice Inspector Test</h1>
        
        {results ? (
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Last Results:</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(results, null, 2)}
            </pre>
            <button
              onClick={() => setResults(null)}
              className="mt-4 w-full bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
            >
              Clear Results
            </button>
          </div>
        ) : null}

        <button
          onClick={() => setShowInspector(true)}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          Start Voice Inspection
        </button>

        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Browser Requirements:</strong></p>
          <ul className="list-disc list-inside mt-2">
            <li>Chrome, Edge, or Safari (latest)</li>
            <li>HTTPS or localhost</li>
            <li>Microphone permissions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
```

Then visit: **`http://localhost:3000/test/voice-inspector`**

#### **Option B: Integrate into Existing Inspection Page**

If you already have an inspection page (e.g., `/app/driver/inspections/[id]/page.tsx`), add the voice mode toggle there.

---

## 🌐 **BROWSER REQUIREMENTS**

### **Supported Browsers:**
| Browser | Version | Voice Recognition | Notes |
|---------|---------|-------------------|-------|
| **Chrome** | Latest | ✅ Web Speech API | Best support |
| **Edge** | Latest | ✅ Web Speech API | Excellent |
| **Safari** | 14.1+ | ✅ Web Speech API | Good, some quirks |
| **Firefox** | Any | ❌ Not supported | Use Chrome instead |

### **Important:**
- ✅ **HTTPS Required** (or `localhost` for development)
- ✅ **Microphone Permission** must be granted
- ✅ **English (US)** language set in browser

---

## 🧪 **TESTING SCENARIOS**

### **Test 1: Basic Voice Commands** ⭐ PRIORITY

**Goal:** Test all basic voice commands

**Steps:**
1. Start voice inspection
2. Wait for "Check Tire Pressure. Say pass or fail."
3. Say: **"Pass"**
   - ✅ Should advance to next item
   - ✅ Should hear "Passed"
4. Say: **"Fail"**
   - ✅ Should advance to next item
   - ✅ Should hear "Failed"
5. Say: **"Repeat"**
   - ✅ Should repeat current item
6. Say: **"Help"**
   - ✅ Should show help dialog

**Expected Result:** All commands work correctly

---

### **Test 2: Fail with Note**

**Goal:** Test failing an item with a descriptive note

**Steps:**
1. Start voice inspection
2. Say: **"Fail crack in windshield"**
   - ✅ Should record as failed
   - ✅ Note: "crack in windshield"
   - ✅ Should hear "Failed: crack in windshield"

**Expected Result:** Note is captured and spoken back

---

### **Test 3: Low Confidence Confirmation**

**Goal:** Test unclear audio handling

**Steps:**
1. Start voice inspection
2. Speak very quietly or mumble: "paaasss"
   - ✅ Should show confirmation dialog
   - ✅ "Did you say: Pass?"
3. Say: **"Yes"** (or tap Confirm)
   - ✅ Should accept and continue

**Expected Result:** Confirmation flow works

---

### **Test 4: Unknown Commands**

**Goal:** Test error handling

**Steps:**
1. Start voice inspection
2. Say: **"Banana"** (nonsense)
   - ✅ Should hear "I didn't understand. Say pass, fail, or help."
   - ✅ Should stay on current item

**Expected Result:** Graceful error handling

---

### **Test 5: Navigation**

**Goal:** Test manual navigation

**Steps:**
1. Complete 2 items
2. Tap **"Previous"** button
   - ✅ Should go back one item
3. Tap **"Next"** button
   - ✅ Should advance one item

**Expected Result:** Navigation works alongside voice

---

### **Test 6: Cancellation**

**Goal:** Test mid-inspection cancellation

**Steps:**
1. Start voice inspection
2. Complete 2 items
3. Say: **"Cancel"** (or tap Cancel button)
   - ✅ Should exit without saving
   - ✅ `onCancel()` should be called

**Expected Result:** Clean exit

---

### **Test 7: Completion**

**Goal:** Test full inspection flow

**Steps:**
1. Start voice inspection
2. Complete all items (say "Pass" for each)
3. After last item:
   - ✅ Should hear "Inspection complete. Good job!"
   - ✅ Should return results
   - ✅ `onComplete()` should be called with results

**Expected Result:** Complete data returned

---

### **Test 8: Offline Mode**

**Goal:** Test offline functionality

**Steps:**
1. Open DevTools → Application → Service Workers
2. Check "Offline" mode
3. Start voice inspection
4. Complete inspection
   - ✅ Should work offline
   - ✅ Should save to IndexedDB
   - ✅ Should show "Offline: 1 pending" indicator
5. Uncheck "Offline"
   - ✅ Should sync automatically

**Expected Result:** Offline functionality works

---

### **Test 9: Microphone Permission**

**Goal:** Test permission handling

**Steps:**
1. Block microphone in browser settings
2. Try to start voice inspection
   - ✅ Should show permission error
   - ✅ Should provide clear instructions
3. Grant permission
4. Refresh and try again
   - ✅ Should work

**Expected Result:** Clear error messages

---

### **Test 10: Mobile Device** 📱

**Goal:** Test on actual mobile device

**Requirements:**
- Physical iPhone or Android device
- Same WiFi network as dev machine

**Steps:**
1. Get your computer's local IP:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   # Example: 192.168.1.100
   ```

2. On mobile device, visit:
   ```
   http://YOUR_IP:3000/test/voice-inspector
   ```
   Example: `http://192.168.1.100:3000/test/voice-inspector`

3. Run all tests above on mobile
4. Additional mobile checks:
   - ✅ Touch targets are large enough
   - ✅ Text is readable
   - ✅ Voice recognition works with phone mic
   - ✅ Screen doesn't sleep during inspection
   - ✅ Orientation changes handled gracefully

**Expected Result:** Works perfectly on mobile

---

## 🔍 **WHAT TO LOOK FOR**

### **✅ GOOD SIGNS:**
- Voice recognition starts immediately
- Commands are recognized accurately
- TTS speaks clearly and promptly
- UI updates in real-time
- No lag or freezing
- Progress bar updates correctly
- Results are saved correctly
- No console errors

### **❌ WARNING SIGNS:**
- Long delay before voice recognition starts
- Commands not recognized
- TTS doesn't speak
- UI freezes or lags
- Console shows errors:
  - "Missing dependency" warnings
  - "Unhandled promise rejection"
  - TTS errors
- Results not saved
- Excessive re-renders (check React DevTools)

---

## 🐛 **COMMON ISSUES & FIXES**

### **Issue: "Voice Not Supported"**

**Cause:** Browser doesn't support Web Speech API

**Fix:**
- Use Chrome, Edge, or Safari
- Update browser to latest version

---

### **Issue: Microphone Permission Denied**

**Cause:** User blocked microphone access

**Fix:**
1. Chrome: Click 🔒 in address bar → Site settings → Microphone → Allow
2. Safari: Safari menu → Settings for This Website → Microphone → Allow
3. Refresh page

---

### **Issue: Voice Recognition Doesn't Start**

**Cause:** Usually HTTPS requirement or browser bug

**Fix:**
1. Check you're on `https://` or `localhost`
2. Try incognito/private mode
3. Check browser console for errors
4. Restart browser

---

### **Issue: Commands Not Recognized**

**Cause:** Background noise, accent, or speech too fast

**Fix:**
- Speak clearly and at normal pace
- Reduce background noise
- Try different commands: "pass" vs "passed" vs "ok"
- Check microphone input level

---

### **Issue: TTS Doesn't Speak**

**Cause:** Browser audio blocked or muted

**Fix:**
1. Check system volume
2. Check browser audio isn't muted
3. Check console for TTS errors
4. Try different voice in browser settings

---

## 📱 **MOBILE TESTING CHECKLIST**

- [ ] Voice recognition works with phone mic
- [ ] TTS audio is clear
- [ ] Touch targets are large enough (min 44x44px)
- [ ] Text is readable without zooming
- [ ] Screen doesn't sleep during inspection
- [ ] Works in portrait and landscape
- [ ] Works with phone case covering mic
- [ ] Works in noisy environment (test in vehicle)
- [ ] Battery usage is reasonable
- [ ] Offline mode works
- [ ] PWA installs correctly

---

## 🎯 **TESTING PRIORITIES**

### **Phase 1: Desktop Testing (Do First)**
1. ✅ Test 1: Basic Voice Commands
2. ✅ Test 2: Fail with Note
3. ✅ Test 7: Completion

### **Phase 2: Desktop Edge Cases**
4. ✅ Test 3: Low Confidence Confirmation
5. ✅ Test 4: Unknown Commands
6. ✅ Test 5: Navigation
7. ✅ Test 6: Cancellation

### **Phase 3: Offline & Permissions**
8. ✅ Test 8: Offline Mode
9. ✅ Test 9: Microphone Permission

### **Phase 4: Real Device Testing (Most Important!)**
10. ✅ Test 10: Mobile Device
11. ✅ Test in actual vehicle with engine running
12. ✅ Test with earpiece/headset

---

## 📊 **PERFORMANCE CHECKS**

### **Using React DevTools:**

1. Install React DevTools extension
2. Open DevTools → Profiler
3. Click "Start profiling"
4. Complete an inspection
5. Click "Stop profiling"

**Check for:**
- ✅ No excessive re-renders (should be <20 renders total)
- ✅ Render times <16ms (60fps)
- ✅ No memory leaks

### **Using Chrome DevTools:**

1. Open DevTools → Performance
2. Click Record
3. Complete an inspection
4. Stop recording

**Check for:**
- ✅ No long tasks (>50ms)
- ✅ No layout thrashing
- ✅ Smooth animations

---

## 📝 **REPORTING BUGS**

If you find bugs, document:

1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Browser & version**
5. **Device (if mobile)**
6. **Console errors** (screenshot)
7. **Network tab** (if API issues)

---

## ✅ **SIGN-OFF CHECKLIST**

Before deploying to production:

- [ ] All 10 test scenarios pass
- [ ] Works in Chrome, Edge, Safari
- [ ] Works on iPhone (iOS)
- [ ] Works on Android
- [ ] Works offline
- [ ] No console errors
- [ ] No memory leaks
- [ ] Performance is good (React DevTools)
- [ ] Tested in real vehicle
- [ ] Tested with background noise
- [ ] Drivers can complete inspection in <5 minutes
- [ ] Results save correctly to database
- [ ] Email notifications work

---

## 🚀 **NEXT STEPS AFTER TESTING**

1. **If all tests pass:**
   - Deploy to staging
   - Test with real drivers
   - Collect feedback
   - Deploy to production

2. **If bugs found:**
   - Document in GitHub Issues
   - Fix critical bugs first
   - Re-test
   - Deploy when stable

---

**Happy Testing! 🎤✨**

For questions or issues, check:
- `BUGFIX_VOICE_REACT_HOOKS.md` - Recent bug fixes
- `docs/planning/VOICE_INSPECTION_IMPLEMENTATION.md` - Architecture
- `docs/completed/OFFLINE_SUPPORT_COMPLETE.md` - Offline functionality

