# 📱 Mobile Testing Setup Guide

## 🚀 **Quick Fix for "Server Not Found" on Mobile**

### **Problem:**
When trying to access `http://192.168.x.x:3000` from your phone, you get a connection error because Next.js only listens on `localhost` by default.

### **Solution:**
Start the dev server with network access enabled.

---

## ✅ **STEP-BY-STEP SETUP**

### **Step 1: Stop Current Dev Server**
If `npm run dev` is running, press `Ctrl+C` to stop it.

### **Step 2: Start Server with Network Access**

```bash
cd /Users/temp/walla-walla-final
npm run dev -- --hostname 0.0.0.0
```

You should see:
```
✓ Ready in 2.3s
○ Local:        http://localhost:3000
○ Network:      http://192.168.x.x:3000
```

### **Step 3: Get Your Computer's IP Address**

**On Mac:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
```

**Or simpler:**
- Look at the terminal output after running `npm run dev -- --hostname 0.0.0.0`
- Find the "Network:" line - that's your IP!

Example output:
```
○ Network:      http://192.168.1.105:3000
```

### **Step 4: Open on Your Phone**

1. Make sure your phone is on the **same WiFi network** as your computer
2. Open browser on phone
3. Go to the Network address from Step 3
4. Example: `http://192.168.1.105:3000/test/voice-inspector`

---

## 🔧 **Alternative: Create NPM Script (Recommended)**

Make it easier by adding a script to `package.json`:

### **Add this to package.json:**

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:mobile": "next dev --hostname 0.0.0.0",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### **Then just run:**
```bash
npm run dev:mobile
```

---

## 📱 **Complete Testing Flow**

### **1. Start Server for Mobile**
```bash
npm run dev -- --hostname 0.0.0.0
```

### **2. Note Your IP**
Look for the "Network:" line in the terminal output.

### **3. On Your Phone:**
- Connect to same WiFi
- Open browser (Chrome or Safari)
- Go to: `http://YOUR_IP:3000/test/voice-inspector`
- Example: `http://192.168.1.105:3000/test/voice-inspector`

### **4. Grant Permissions:**
- Allow microphone when prompted
- Test voice commands!

---

## 🐛 **Still Not Working? Try These:**

### **Issue 1: Firewall Blocking Connection**

**Mac Firewall:**
```bash
# Check if firewall is on
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# If it's on, allow Node:
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
```

**Or via System Settings:**
1. System Settings → Network → Firewall
2. Click "Options"
3. Allow incoming connections for "Node"

### **Issue 2: Wrong Network**

Make sure **both devices are on the same WiFi**:
- Not on guest network
- Not using VPN
- Not using cellular data

Check on phone:
- Settings → WiFi → Should match computer's WiFi name

### **Issue 3: Port 3000 Already in Use**

If port 3000 is blocked, use a different port:
```bash
npm run dev -- --hostname 0.0.0.0 --port 3001
```

Then visit: `http://YOUR_IP:3001/test/voice-inspector`

### **Issue 4: Wrong IP Address**

Double-check your IP:
```bash
# Mac - shows all network interfaces
ifconfig

# Look for "inet" under "en0" (WiFi) or "en1" (Ethernet)
# Should be something like: 192.168.x.x or 10.0.x.x
```

---

## ✅ **Verification Checklist**

Before testing on phone, verify:

- [ ] Server started with `--hostname 0.0.0.0`
- [ ] Terminal shows "Network:" line with IP
- [ ] Phone on same WiFi as computer
- [ ] Phone not using VPN
- [ ] Mac firewall allows Node
- [ ] Correct IP address (192.168.x.x or 10.0.x.x)
- [ ] Using correct port (default 3000)

---

## 🎯 **Quick Test**

### **From Your Computer:**
1. Visit: `http://192.168.x.x:3000` (use YOUR IP)
2. If it works on computer, it should work on phone
3. If it doesn't work on computer either, check firewall

### **From Your Phone:**
1. Open Safari or Chrome
2. Type the full address: `http://192.168.x.x:3000/test/voice-inspector`
3. Should load the test page
4. Grant microphone permission
5. Test voice commands!

---

## 📊 **Network Troubleshooting**

### **Check if port is accessible:**

**From your computer:**
```bash
# Get your IP
MY_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
echo "Your IP: $MY_IP"

# Test if server is listening
curl http://$MY_IP:3000
# Should return HTML, not "Connection refused"
```

### **Check from phone:**

**Method 1: Simple ping test**
- Install "Network Analyzer" app (iOS) or "Fing" app (Android)
- Scan network for your computer's IP
- Should show port 3000 as "open"

**Method 2: Browser test**
- Try just: `http://192.168.x.x:3000` (without /test/voice-inspector)
- Should see Next.js home page
- If it loads, then add: `/test/voice-inspector`

---

## 🌐 **HTTPS Alternative (Advanced)**

If you need HTTPS for testing (some features require it):

### **Option 1: Use ngrok**
```bash
# Install ngrok
brew install ngrok

# In one terminal:
npm run dev

# In another terminal:
ngrok http 3000

# Use the HTTPS URL on your phone
# Example: https://abc123.ngrok.io/test/voice-inspector
```

### **Option 2: Use Tailscale**
```bash
# Install Tailscale on both devices
brew install tailscale

# Access via Tailscale IP
# Works from anywhere, not just local network
```

---

## 📱 **Recommended Testing Setup**

### **For Quick Local Testing:**
```bash
npm run dev -- --hostname 0.0.0.0
```
Then use: `http://YOUR_IP:3000`

### **For HTTPS Testing:**
```bash
ngrok http 3000
```
Then use the ngrok HTTPS URL

### **For Long-term Testing:**
- Deploy to Railway (gets real HTTPS)
- Test on actual production URL

---

## 🎉 **Success Indicators**

You'll know it's working when:
- ✅ Phone loads the test page
- ✅ See "Start Voice Inspection" button
- ✅ No connection errors
- ✅ Microphone permission prompt appears
- ✅ Voice commands work
- ✅ TTS speaks through phone

---

## 📝 **Quick Reference**

```bash
# Start server for mobile testing
npm run dev -- --hostname 0.0.0.0

# Get your IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Test from computer
curl http://YOUR_IP:3000

# Then on phone, visit:
http://YOUR_IP:3000/test/voice-inspector
```

---

**Need more help? Let me know what error you're seeing!** 🚀

