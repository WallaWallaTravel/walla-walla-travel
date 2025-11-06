# 🚀 QUICK START - For New Claude Sessions

**ALWAYS READ FIRST:** `/Users/temp/walla-walla-final/MASTER_STATUS.md`

---

## 💬 Starting a New Chat?

**Paste this into the new chat:**

```
I'm continuing work on Walla Walla Travel driver app.

Please read these 2 files:
1. /Users/temp/walla-walla-final/MASTER_STATUS.md
2. /Users/temp/walla-walla-final/MOBILE_UI_COMPLETE.md

Current situation: [tell Claude what you're working on]
Last thing I did: [what command/action you just took]
What happened: [the result]

What should I do next?
```

---

## 🎯 Key Facts (For Quick Reference)

### Project Location:
```
/Users/temp/walla-walla-final
```
**ONLY work here!** Don't create new projects.

### Dev Server:
```bash
cd /Users/temp/walla-walla-final
npm run dev
# Currently on port 3002
```

### Test on Phone:
```
http://192.168.1.18:3002
Login: driver@test.com / test123456
```

### Current State:
- ✅ Mobile UI components complete
- 🚧 Login needs testing
- ⚠️ Supabase still in code (needs removal)
- ⏳ Dashboard not built yet

---

## 🔥 Critical Rules

### ✅ DO:
1. Read MASTER_STATUS.md at start of every chat
2. Update MASTER_STATUS.md after changes
3. Work ONLY in `/Users/temp/walla-walla-final`
4. Test on phone after changes
5. One step at a time

### ❌ DON'T:
1. Create new projects/folders
2. Make assumptions about what's built
3. Skip documentation updates
4. Work in multiple locations
5. Lose track of progress

---

## 📋 When Stuck

1. Check MASTER_STATUS.md - what's the current state?
2. Check MOBILE_UI_COMPLETE.md - what's already built?
3. Ask user: "What command did you run and what happened?"
4. Take ONE action at a time
5. Update MASTER_STATUS.md with results

---

## 🎓 Key Documents

| File | Purpose |
|------|---------|
| `MASTER_STATUS.md` | Current state, what's working/broken |
| `MOBILE_UI_COMPLETE.md` | Mobile components (complete!) |
| `TDD_VICTORY.md` | Testing system info |
| `package.json` | Dependencies (has Supabase - needs removal) |

---

## 💡 Mobile Requirements (Owner)

- 48px+ touch targets ✅
- 16px+ font (no iOS zoom) ✅
- Bottom action zones ✅
- One-thumb usable ✅
- Simple, elegant design ✅
- Unified dashboard ⏳

---

**Last Updated:** October 11, 2025  
**Keep MASTER_STATUS.md updated!**
