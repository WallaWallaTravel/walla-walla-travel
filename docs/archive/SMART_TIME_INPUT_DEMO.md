# ⚡ Smart Time Input - Quick Demo Guide

## 🎯 How to Test It

1. **Navigate to:** `http://localhost:3000/admin/proposals/new`
2. **Click:** "Wine Tour" service card
3. **Find:** "Start Time" field (now has SmartTimeInput!)

---

## ⌨️ Try These Inputs:

### **Example 1: Afternoon Tour**
```
Type: 1
Preview: 01:00 PM ✓
Type: 15
Preview: 01:15 PM ✓
Press: Enter
Result: Cursor jumps to Duration field!
```

### **Example 2: Morning Tour**
```
Type: 9
Preview: 09:00 AM ✓
Type: 30
Preview: 09:30 AM ✓
```

### **Example 3: Toggle AM/PM**
```
Type: 7
Preview: 07:00 PM (default for wine tours)
Press: a
Preview: 07:00 AM ✓ (toggled!)
Press: p
Preview: 07:00 PM ✓ (toggled back!)
```

### **Example 4: Quick Duration Select**
```
After entering time, press Enter
See: Quick-select buttons [5h] [5.5h] [6h] [6.5h]
Click: 6h
Result: Selected with burgundy background!
```

### **Example 5: Fast Entry**
```
Type: 115
Result: 01:15 PM ✓
Press: Enter
Click: 6h
Result: Wine tour configured in ~3 seconds! ⚡
```

---

## 🎨 Visual States to Check:

**1. Empty State:**
- Gray border
- Placeholder: "Type time (e.g., 115, 930)"
- Helper: "Quick entry: 115 = 1:15 PM, 930 = 9:30 AM"

**2. Typing State:**
- Focused (burgundy border with pink ring)
- Helper: "Keep typing... (e.g., 115 for 1:15 PM)"

**3. Valid Time:**
- Live preview on right: "01:15 PM"
- Clear button (✕) appears
- Helper: "Press [a] for AM, [p] for PM, or [Enter] to continue"

**4. Duration Buttons:**
- Four buttons in a row
- Active button has burgundy background
- Hover shows gray background on inactive buttons

---

## 🧪 Edge Cases to Test:

**Invalid Times:**
```
Type: 99
Result: Error message "Invalid time format"

Type: 2575
Result: Error message "Invalid time format"
```

**Clearing:**
```
Type: 115
Click: ✕ button
Result: Field clears, focus remains

Type: 115
Press: Escape
Result: Field clears, focus lost
```

**Service Type Awareness:**
```
Wine Tour:
  Type: 1 → 01:00 PM ✓ (afternoon default)
  Type: 9 → 09:00 AM ✓ (morning default)

Transfer (test with airport transfer):
  Type: 6 → 06:00 AM ✓ (early pickup default)
  Type: 9 → 09:00 PM ✓ (late return default)
```

---

## 📊 Performance Test:

**Old Method (time picker):**
1. Click hour field
2. Scroll to 1
3. Click minute field
4. Scroll to 15
5. Click PM
**Time: ~7-10 seconds**

**New Method (SmartTimeInput):**
1. Type `115`
2. Press Enter
**Time: ~1.5 seconds** ⚡

**Result: 5-7x faster!** 🚀

---

## ✅ What to Look For:

- ✓ Typing feels instant
- ✓ Preview updates live
- ✓ AM/PM makes sense for service type
- ✓ Enter key advances to next field
- ✓ Quick-select buttons are clickable
- ✓ Active button is highlighted
- ✓ Clear button works
- ✓ Escape key clears and blurs
- ✓ Helper text is informative
- ✓ No console errors

---

## 🎉 Success Indicators:

1. **Speed:** Can enter time in 1-2 seconds
2. **Accuracy:** AM/PM is usually correct
3. **Flow:** Tab/Enter navigation feels natural
4. **Visual:** Burgundy/gold theme matches app
5. **Feedback:** Always know what's happening

---

**Enjoy the speed boost!** ⚡🚀

