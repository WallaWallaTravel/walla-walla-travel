# MCP Setup Guide - Dev Server Control
**Date:** October 31, 2025  
**Purpose:** Enable AI agent to control the development server

---

## 🎯 **What is MCP?**

**Model Context Protocol (MCP)** is a standardized way for AI agents to interact with external tools and services.

**With MCP, I can:**
- ✅ Start/stop the dev server programmatically
- ✅ Monitor server logs in real-time
- ✅ Check if server is responding
- ✅ Restart server automatically
- ✅ Get server status anytime

**Without MCP:**
- ❌ You have to manually start the server
- ❌ I can't verify it's running
- ❌ You get "connection refused" errors
- ❌ Slow debugging cycle

---

## 🚀 **Setup Instructions:**

### **Step 1: Enable MCP in Cursor**

**Option A: User Settings (Recommended)**
1. Open Cursor Settings (Cmd+,)
2. Search for "MCP"
3. Enable "Model Context Protocol"
4. Add MCP server config

**Option B: Workspace Settings**
1. Copy `.cursor/mcp-config.json` to `~/.cursor/mcp.json`
2. Restart Cursor

### **Step 2: Verify MCP Server**

The MCP server file is at:
```
/Users/temp/walla-walla-final/.cursor/mcp-server-dev.js
```

Make it executable:
```bash
chmod +x /Users/temp/walla-walla-final/.cursor/mcp-server-dev.js
```

### **Step 3: Test MCP Server**

Test manually:
```bash
echo '{"id":1,"method":"server.status","params":{}}' | node /Users/temp/walla-walla-final/.cursor/mcp-server-dev.js
```

Expected output:
```json
{"id":1,"result":{"running":false,"ready":false,"responding":false,"pid":null,"url":"http://localhost:3000","uptime":0}}
```

---

## 📋 **MCP Commands Available:**

### **1. Start Server**
```json
{
  "method": "server.start",
  "params": {
    "cwd": "/Users/temp/walla-walla-final"
  }
}
```

**Returns:**
```json
{
  "success": true,
  "message": "Server started successfully",
  "pid": 12345,
  "url": "http://localhost:3000"
}
```

### **2. Stop Server**
```json
{
  "method": "server.stop",
  "params": {}
}
```

### **3. Check Status**
```json
{
  "method": "server.status",
  "params": {}
}
```

**Returns:**
```json
{
  "running": true,
  "ready": true,
  "responding": true,
  "pid": 12345,
  "url": "http://localhost:3000",
  "uptime": 120
}
```

### **4. Get Logs**
```json
{
  "method": "server.logs",
  "params": {
    "limit": 50
  }
}
```

### **5. Restart Server**
```json
{
  "method": "server.restart",
  "params": {}
}
```

### **6. Check if Responding**
```json
{
  "method": "server.check",
  "params": {}
}
```

---

## 🤖 **How I'll Use It:**

### **Before Asking You to Test:**

```
AI: "Let me start the dev server..."

[Calls MCP: server.start]
[Waits for server.ready = true]
[Calls MCP: server.check]
[Verifies server is responding]

AI: "✅ Server is running at http://localhost:3000
     The payment page is ready to test!"
```

### **If Something Goes Wrong:**

```
AI: "Let me check the server status..."

[Calls MCP: server.status]
[Sees: running=false]

AI: "Server isn't running, starting it now..."

[Calls MCP: server.start]
[Waits 10 seconds]
[Calls MCP: server.check]

AI: "✅ Server started successfully!"
```

### **If Server Hangs:**

```
AI: "Let me restart the server..."

[Calls MCP: server.restart]
[Waits for ready]

AI: "✅ Server restarted!"
```

---

## 📊 **Benefits:**

### **For You:**
- ✅ Never manually start the server
- ✅ No more "connection refused" errors
- ✅ Faster development cycle
- ✅ AI handles all setup

### **For Me (AI Agent):**
- ✅ Full control over dev environment
- ✅ Can verify everything works
- ✅ Can debug server issues
- ✅ Can provide accurate status

---

## 🔧 **Troubleshooting:**

### **MCP Not Working?**

**Check 1: Is MCP enabled in Cursor?**
```
Settings → MCP → Enabled ✅
```

**Check 2: Is the MCP server file executable?**
```bash
ls -la /Users/temp/walla-walla-final/.cursor/mcp-server-dev.js
```

**Check 3: Test MCP server manually**
```bash
echo '{"id":1,"method":"server.status","params":{}}' | node /Users/temp/walla-walla-final/.cursor/mcp-server-dev.js
```

**Check 4: Check Cursor logs**
```
Help → Show Logs → Look for MCP errors
```

---

## 🎯 **Current Status:**

**Files Created:**
- ✅ `/Users/temp/walla-walla-final/.cursor/mcp-server-dev.js`
- ✅ `/Users/temp/walla-walla-final/.cursor/mcp-config.json`
- ✅ This guide

**Next Steps:**
1. Enable MCP in Cursor settings
2. Restart Cursor
3. I'll be able to control the server!

---

## 📞 **Alternative If MCP Not Available:**

If MCP isn't available in your Cursor version:

**Option A: Update Cursor**
- Download latest version
- MCP support added in recent releases

**Option B: Use CLI Wrapper**
- I'll create a simple CLI tool
- You run it once: `./dev-control start`
- It stays running and I can communicate with it

**Option C: Manual Start (Current)**
- You start server manually
- Tell me "server is running"
- I verify and proceed

---

## 🚀 **Next Action:**

**To enable MCP:**
1. Open Cursor Settings (Cmd+,)
2. Search for "MCP" or "Model Context Protocol"
3. Enable it
4. Restart Cursor
5. Tell me "MCP is enabled"

**Then I can:**
- Start the server automatically
- Verify it's working
- Run all pre-flight checks
- Give you working URLs to test

---

**Status:** ⏳ MCP server created, waiting for Cursor MCP to be enabled

**Action:** Enable MCP in Cursor settings and restart


