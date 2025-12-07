# 📱 Real Device Testing Guide

**Last Updated:** November 2025  
**Features to Test:** Offline Support, Voice Inspections, PWA Installation

---

## 🔧 Prerequisites

### Development Environment
1. Start the dev server: `npm run dev`
2. Server should be running on `http://localhost:3000` (or your configured port)
3. For mobile testing, find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

### Production Testing
1. Deploy to staging/production
2. Ensure HTTPS is enabled (required for PWA and voice features)

---

## 📲 PWA Installation Testing

### iOS (Safari)

1. Open the app URL in Safari
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Name the app and tap **Add**
5. ✅ Verify: App icon appears on home screen
6. ✅ Verify: Opens in standalone mode (no Safari UI)
7. ✅ Verify: Splash screen appears on launch

### Android (Chrome)

1. Open the app URL in Chrome
2. Wait for the **"Add to Home Screen"** banner OR
3. Tap the **3-dot menu** → **"Install app"** or **"Add to Home Screen"**
4. Tap **Install**
5. ✅ Verify: App appears in app drawer
6. ✅ Verify: Opens in standalone mode
7. ✅ Verify: Can be uninstalled like any app

### Desktop (Chrome/Edge)

1. Look for the install icon in the address bar (+ or download icon)
2. Click to install
3. ✅ Verify: Opens in standalone window
4. ✅ Verify: Can pin to taskbar/dock

---

## 📴 Offline Testing

### Preparation
1. Log into the driver portal
2. Navigate to `/inspections/pre-trip`
3. Let the page fully load

### Test Procedure

#### Test 1: Airplane Mode
1. Enable **Airplane Mode** on device
2. ✅ Verify: Yellow "You're offline" banner appears
3. ✅ Verify: Page still loads from cache
4. Complete an inspection:
   - Enter mileage
   - Check all items
   - Add signature
   - Submit
5. ✅ Verify: "Saved offline" message appears
6. ✅ Verify: Orange badge shows "1 pending sync"

#### Test 2: Coming Back Online
1. Disable Airplane Mode
2. ✅ Verify: Blue "Syncing..." indicator appears
3. Wait 3-5 seconds
4. ✅ Verify: Badge disappears (sync complete)
5. Check server logs or database to confirm data saved

#### Test 3: Multiple Offline Inspections
1. Go offline
2. Complete 2-3 inspections
3. ✅ Verify: Badge shows correct count (e.g., "3 pending")
4. Go online
5. ✅ Verify: All sync successfully

#### Test 4: Slow/Intermittent Connection
1. Use Chrome DevTools → Network → Slow 3G
2. Complete inspection
3. ✅ Verify: Falls back to offline save if timeout
4. ✅ Verify: Auto-syncs when connection improves

---

## 🎤 Voice Testing

### Browser Compatibility

| Browser | Support Level |
|---------|---------------|
| Chrome (Desktop) | ✅ Full support |
| Chrome (Android) | ✅ Full support |
| Edge | ✅ Full support |
| Safari (iOS 14.5+) | ⚠️ Limited (TTS works, STT varies) |
| Firefox | ❌ No STT support |

### Test Procedure

#### Test 1: Voice Mode Toggle
1. Navigate to `/voice-test` (public test page) or inspection page
2. ✅ Verify: "🎤 Voice" button visible
3. Click to enter voice mode
4. ✅ Verify: Dark fullscreen interface appears
5. ✅ Verify: First item text displayed
6. ✅ Verify: TTS reads the intro and first item

#### Test 2: Voice Commands
1. Click "Start Listening"
2. ✅ Verify: Microphone permission prompt (first time)
3. ✅ Verify: Green "Listening..." indicator
4. Say **"Pass"**
5. ✅ Verify: Checkmark feedback, moves to next item
6. Say **"Fail"**
7. ✅ Verify: X feedback, moves to next item
8. Say **"Repeat"**
9. ✅ Verify: Item is read again
10. Say **"Help"**
11. ✅ Verify: Help modal appears

#### Test 3: Voice with Note
1. Say **"Fail crack in windshield"**
2. ✅ Verify: Fail recorded with note "crack in windshield"

#### Test 4: Noise Environment
Test in various conditions:
- [ ] Quiet room
- [ ] Vehicle with engine running
- [ ] Outdoor with wind
- [ ] With background music/radio

#### Test 5: Different Accents
If available, test with speakers of different accents to verify recognition accuracy.

### Troubleshooting Voice

| Issue | Solution |
|-------|----------|
| "Not supported" error | Use Chrome or Edge |
| Microphone not working | Check browser permissions |
| Poor recognition | Speak clearly, reduce background noise |
| TTS not speaking | Check volume, try different voice in settings |
| Commands not recognized | Use simpler commands: "Pass", "Fail" |

---

## 🔍 IndexedDB Verification

### Chrome DevTools
1. Open DevTools (F12)
2. Go to **Application** tab
3. Expand **IndexedDB** → **walla_walla_travel_db**
4. Check stores:
   - `pending_inspections` - Should have queued data when offline
   - `queued_requests` - Failed API calls for retry
   - `cached_data` - Cached responses
   - `sync_status` - Last sync info

### Verify Data Structure
Click on `pending_inspections` and check entries have:
- `id` (auto-generated)
- `driverId`
- `vehicleId`
- `type` (pre_trip/post_trip)
- `items` (inspection checkbox states)
- `timestamp`
- `synced` (false when pending)

---

## 📊 Service Worker Testing

### Check Registration
1. DevTools → Application → Service Workers
2. ✅ Verify: `sw.js` registered with status "activated"
3. Check "Update on reload" for development

### Check Cache
1. DevTools → Application → Cache Storage
2. Expand **walla-walla-v1**
3. ✅ Verify: Inspection pages cached
4. ✅ Verify: Static assets cached

### Force Update
1. DevTools → Application → Service Workers
2. Click **"Update"**
3. Click **"skipWaiting"** to activate immediately

---

## 📝 Test Checklist

### Pre-Testing Setup
- [ ] Fresh browser session or incognito
- [ ] Clear cache and IndexedDB
- [ ] Microphone permissions reset

### PWA Tests
- [ ] iOS installation works
- [ ] Android installation works
- [ ] Standalone mode works
- [ ] Icon appears correctly
- [ ] Theme colors correct

### Offline Tests
- [ ] Inspection page loads offline
- [ ] Form submission works offline
- [ ] Data saves to IndexedDB
- [ ] Sync indicator shows correctly
- [ ] Auto-sync when online
- [ ] Multiple pending items sync

### Voice Tests
- [ ] Voice mode toggle works
- [ ] TTS reads items aloud
- [ ] "Pass" command works
- [ ] "Fail" command works
- [ ] "Repeat" command works
- [ ] "Skip" command works
- [ ] "Help" shows commands
- [ ] "Cancel" exits voice mode
- [ ] Works in quiet environment
- [ ] Works with some background noise

### Performance Tests
- [ ] Page loads in < 3 seconds (online)
- [ ] Page loads in < 1 second (cached)
- [ ] Form submits in < 500ms (offline)
- [ ] Sync completes in < 5 seconds per item

---

## 📱 Device Matrix

Test on at least these device types:

### iOS
- [ ] iPhone (latest iOS)
- [ ] iPhone (iOS 14.5+)
- [ ] iPad

### Android
- [ ] Recent Android phone (Android 10+)
- [ ] Older Android phone (Android 8+)
- [ ] Android tablet

### Desktop
- [ ] Windows + Chrome
- [ ] Windows + Edge
- [ ] Mac + Chrome
- [ ] Mac + Safari

---

## 🐛 Known Issues

### iOS Limitations
- Safari may not support continuous voice recognition
- IndexedDB storage may be limited to 50MB
- PWA loses state after 7 days of inactivity

### Android Notes
- Chrome flags may need to be enabled for some features
- Battery saver can affect background sync

### Desktop Notes
- Service worker disabled in development mode by default
- Need HTTPS for voice features in production

---

## 📞 Support Contacts

For testing issues, contact:
- **Development Team:** dev@wallawallatravel.com
- **Emergency:** Call supervisor directly

---

## 📋 Test Results Template

```markdown
## Test Session: [DATE]
**Tester:** [NAME]
**Device:** [MODEL]
**OS:** [VERSION]
**Browser:** [BROWSER + VERSION]

### PWA Installation
- [ ] Installed successfully
- Notes: 

### Offline Mode
- [ ] All tests passed
- Issues found:

### Voice Mode
- [ ] All tests passed
- Recognition accuracy: [%]
- Issues found:

### Overall Assessment
[ ] Ready for production
[ ] Needs fixes before release

### Screenshots/Videos
[Attach any relevant media]
```

---

**Document Version:** 1.0  
**Created:** November 2025  
**Maintained By:** Development Team

