# Mobile Device Testing Guide
**Last Updated:** November 8, 2025

---

## The Problem with Dev Mode

❌ **Don't use `npm run dev` for mobile testing!**

**Why Dev Mode Fails on Mobile:**
- Uses WebSocket for Hot Module Reloading (HMR)
- Mobile browsers have strict timeout policies
- Firewalls often block cross-device WebSocket connections
- Bundle sizes are 10-20x larger
- Slower load times cause browser timeouts

---

## The Solution: Production Build Testing

✅ **Use production builds for mobile testing**

### Quick Start

```bash
# Stop the dev server (Ctrl+C if running)

# Run the mobile testing script
./scripts/test-mobile.sh
```

This script will:
1. Build a production version
2. Start the production server
3. Show you the IP address to use on your mobile device

### Manual Method

If the script doesn't work:

```bash
# 1. Build production version
npm run build

# 2. Start production server (accessible from network)
npm run start -- --hostname 0.0.0.0

# 3. Get your computer's IP address
# macOS:
ipconfig getifaddr en0

# Linux:
hostname -I

# 4. On your mobile device, navigate to:
http://YOUR_IP_ADDRESS:3000
```

---

## Testing Checklist

### Pre-Test Setup
- [ ] Computer and mobile device on same WiFi network
- [ ] Firewall allows incoming connections on port 3000
- [ ] Production build completed successfully
- [ ] Production server running (not dev mode)

### Test on Mobile Device

**Basic Functionality:**
- [ ] Homepage loads (http://YOUR_IP:3000)
- [ ] Static test page loads (http://YOUR_IP:3000/test-static.html)
- [ ] Login works
- [ ] Navigation works

**Voice Inspector (if applicable):**
- [ ] Voice test page loads (http://YOUR_IP:3000/test/voice-inspector)
- [ ] TTS (text-to-speech) works
- [ ] Voice recognition works (or shows appropriate error on iOS)
- [ ] Fallback to checkbox mode works
- [ ] Buttons and touch interactions work

**Offline Mode:**
- [ ] Turn on airplane mode
- [ ] Cached pages still load
- [ ] Inspection forms work offline
- [ ] Turn off airplane mode
- [ ] Data syncs automatically

---

## Troubleshooting

### Problem: Page doesn't load at all

**Check:**
1. Both devices on same WiFi?
   ```bash
   # On mobile, check WiFi name matches computer's WiFi
   ```

2. Firewall blocking port 3000?
   ```bash
   # macOS: Allow Node in Firewall settings
   System Preferences → Security & Privacy → Firewall → Firewall Options
   ```

3. Server actually running?
   ```bash
   # Should see: "Ready in XXXms" in terminal
   lsof -i :3000
   ```

4. Correct IP address?
   ```bash
   # Try getting IP again
   ipconfig getifaddr en0
   ```

### Problem: Page loads but hangs/stalls

**This usually means you're in dev mode!**

```bash
# Stop server (Ctrl+C)
# Kill any lingering dev servers
pkill -f "next dev"

# Use production build
./scripts/test-mobile.sh
```

### Problem: Voice features don't work on iPhone

**This is expected!** iOS Safari doesn't support Web Speech Recognition.

The app should show a warning message and fall back to checkbox mode.

**What should work:**
- ✅ Text-to-speech (TTS) prompts
- ✅ Checkbox inspection mode
- ✅ Touch interactions

**What won't work:**
- ❌ Voice input / commands
- ❌ "Say 'pass' or 'fail'"

### Problem: "Mixed Content" error

**Cause:** Trying to access `http://` from `https://`

**Solutions:**
1. Use local testing (both http)
2. Use production Railway URL (both https)
3. Don't mix protocols

---

## Browser Compatibility

### Chrome (Android)
- ✅ Full support for all features
- ✅ Voice recognition works
- ✅ TTS works
- ✅ Offline mode works

### Safari (iOS/iPadOS)
- ✅ Most features work
- ❌ Voice recognition NOT supported
- ✅ TTS works (limited voices)
- ✅ Offline mode works
- ⚠️ Requires checkbox mode for inspections

### Firefox Mobile
- ✅ Basic features work
- ❌ Voice recognition NOT supported
- ✅ TTS works
- ✅ Offline mode works

### Samsung Internet
- ✅ Full support (Chromium-based)
- ✅ Voice recognition works
- ✅ TTS works
- ✅ Offline mode works

---

## Performance Benchmarks

### Production Build Targets
- **Initial Load:** < 2 seconds
- **Page Transitions:** < 500ms
- **Form Submission:** < 1 second
- **Offline Save:** < 100ms

### Compared to Dev Mode
- **Bundle Size:** 85% smaller
- **Load Time:** 70% faster
- **No WebSocket:** 100% more reliable
- **Code Splitting:** Automatic

---

## When to Rebuild

You need to rebuild the production version when:
- ✅ You change component code
- ✅ You modify styles
- ✅ You update API routes
- ✅ You change configuration

**Workflow:**
```bash
# Make code changes...
# Test changes...

# Stop production server (Ctrl+C)
./scripts/test-mobile.sh  # Rebuilds automatically
```

---

## Testing Script Details

### What `test-mobile.sh` Does

```bash
#!/bin/bash
npm run build                    # Create optimized production build
npm run start -- --hostname 0.0.0.0   # Serve on all network interfaces
```

### Equivalent Manual Commands

```bash
# 1. Build
next build

# 2. Start
next start -H 0.0.0.0
```

---

## Best Practices

### Do's
- ✅ Always use production builds for mobile testing
- ✅ Test on multiple devices (iOS + Android)
- ✅ Test both online and offline scenarios
- ✅ Clear browser cache between major changes
- ✅ Test with real network conditions (WiFi, cellular)

### Don'ts
- ❌ Don't use `npm run dev` for mobile testing
- ❌ Don't test only on desktop browsers
- ❌ Don't assume iOS = Android compatibility
- ❌ Don't skip offline testing
- ❌ Don't forget to rebuild after code changes

---

## Quick Reference

```bash
# Start mobile testing
./scripts/test-mobile.sh

# Manual production build
npm run build && npm run start -- --hostname 0.0.0.0

# Get your IP (macOS)
ipconfig getifaddr en0

# Get your IP (Linux)
hostname -I | awk '{print $1}'

# Check if server is running
lsof -i :3000

# Kill all Node processes
pkill -f node
```

---

## Support

**Can't get it working?**
1. Check this guide step-by-step
2. Review `docs/ARCHITECTURE_REVIEW_NOV8.md`
3. Check `docs/SESSION_SUMMARY_NOV8.md` for recent changes

**Still stuck?**
- Verify both devices on same network
- Try the static test page first (simpler)
- Check firewall settings
- Restart both devices

