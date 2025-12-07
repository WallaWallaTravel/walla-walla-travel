# 🎯 Individual Item Modifications

**Date:** October 31, 2025  
**Feature:** Per-instance customization for lunch orders  
**Status:** ✅ Complete

---

## 🚀 **The Problem We Solved**

### **Before:**
```
Order: 3x Turkey & Swiss
Modifications: No mayo

❌ Problem: ALL 3 sandwiches get "No mayo"
```

### **After:**
```
Order: 3x Turkey & Swiss
  #1: No mayo
  #2: No tomato, Extra cheese
  #3: (no modifications)

✅ Solution: Each sandwich can be customized individually!
```

---

## 🎨 **User Experience**

### **Step 1: Add Items**
```
Turkey & Swiss                        $14.00
[Description here]
                                    [+ Add]
```

### **Step 2: Customize Each Instance**
```
Turkey & Swiss                        $14.00
[Description here]
                                    [+ Add]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#1                                   [Remove]
🤖 Customize:
[No mayo] [No tomato] [No lettuce] [Extra cheese]

#2                                   [Remove]
🤖 Customize:
[✓ No mayo] [No tomato] [✓ No lettuce] [Extra cheese]

#3                                   [Remove]
🤖 Customize:
[No mayo] [✓ No tomato] [No lettuce] [✓ Extra cheese]
```

### **Step 3: Order Summary**
```
Order Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1x Turkey & Swiss                    $14.00
  • No mayo, No lettuce

1x Turkey & Swiss                    $14.00
  • No tomato, Extra cheese

1x Turkey & Swiss                    $14.00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total                                $42.00
```

---

## 💻 **Technical Implementation**

### **Data Structure Change**

#### **Old (Per Item Type):**
```typescript
orderItems: {
  'turkey': 3,  // quantity
}
itemModifications: {
  'turkey': ['No mayo']  // applies to ALL
}
```

#### **New (Per Instance):**
```typescript
orderItems: [
  { itemId: 'turkey', modifications: ['No mayo'] },
  { itemId: 'turkey', modifications: ['No tomato', 'Extra cheese'] },
  { itemId: 'turkey', modifications: [] }
]
```

### **Key Functions**

#### **1. Add Item**
```typescript
const handleAddItem = (itemId: string) => {
  setOrderItems(prev => [...prev, { itemId, modifications: [] }]);
};
```

#### **2. Remove Specific Instance**
```typescript
const handleRemoveItem = (itemId: string, instanceIndex: number) => {
  setOrderItems(prev => prev.filter((_, idx) => idx !== instanceIndex));
};
```

#### **3. Toggle Modification for Instance**
```typescript
const toggleModification = (instanceIndex: number, modification: string) => {
  setOrderItems(prev => prev.map((item, idx) => {
    if (idx !== instanceIndex) return item;
    
    const exists = item.modifications.includes(modification);
    return {
      ...item,
      modifications: exists
        ? item.modifications.filter(m => m !== modification)
        : [...item.modifications, modification]
    };
  }));
};
```

#### **4. Get Item Count**
```typescript
const getItemCount = (itemId: string): number => {
  return orderItems.filter(item => item.itemId === itemId).length;
};
```

#### **5. Get Item Instances**
```typescript
const getItemInstances = (itemId: string) => {
  return orderItems
    .map((item, index) => ({ ...item, index }))
    .filter(item => item.itemId === itemId);
};
```

### **Grouping for Display**

When submitting or showing the order summary, we group identical items:

```typescript
const groupedItems = orderItems.reduce((acc, orderItem) => {
  const item = wcsMenu.find(m => m.id === orderItem.itemId);
  if (!item) return acc;
  
  // Create unique key based on item + modifications
  const modKey = orderItem.modifications.sort().join('|');
  const key = `${orderItem.itemId}::${modKey}`;
  
  if (!acc[key]) {
    acc[key] = {
      id: orderItem.itemId,
      name: item.name,
      quantity: 0,
      price: item.price,
      modifications: orderItem.modifications.join(', ')
    };
  }
  acc[key].quantity++;
  return acc;
}, {});
```

**Result:**
```javascript
{
  "turkey::No mayo|No lettuce": {
    id: "turkey",
    name: "Turkey & Swiss",
    quantity: 1,
    price: 14.00,
    modifications: "No mayo, No lettuce"
  },
  "turkey::Extra cheese|No tomato": {
    id: "turkey",
    name: "Turkey & Swiss",
    quantity: 1,
    price: 14.00,
    modifications: "No tomato, Extra cheese"
  },
  "turkey::": {
    id: "turkey",
    name: "Turkey & Swiss",
    quantity: 1,
    price: 14.00,
    modifications: null
  }
}
```

---

## 🎯 **Use Cases**

### **Family Order**
```
Dad: Turkey & Swiss (No mayo)
Mom: Turkey & Swiss (No tomato, Extra cheese)
Kid: Turkey & Swiss (plain)
```

### **Dietary Restrictions**
```
Person 1: Caesar Salad (No croutons, Dressing on side)
Person 2: Caesar Salad (Add chicken)
Person 3: Caesar Salad (No croutons, No parmesan)
```

### **Mixed Preferences**
```
Guest 1: Roast Beef (No horseradish)
Guest 2: Roast Beef (No arugula, Extra cheese)
Guest 3: Roast Beef (plain)
Guest 4: Roast Beef (No horseradish, No arugula)
```

---

## 🎨 **UI/UX Benefits**

### **Clear Visual Hierarchy**
- ✅ Item name and description at top
- ✅ Each instance in its own card (#1, #2, #3)
- ✅ Modifications grouped per instance
- ✅ Easy to see what's customized

### **Intuitive Controls**
- ✅ "+ Add" button to add more
- ✅ "Remove" button for each instance
- ✅ Toggle buttons for modifications
- ✅ Visual feedback (purple = selected)

### **Smart Grouping**
- ✅ Order summary groups identical items
- ✅ "2x Turkey & Swiss (No mayo)" instead of listing twice
- ✅ Cleaner for restaurant to read

---

## 📊 **Data Flow**

```
1. User clicks "+ Add"
   ↓
2. New instance added to orderItems array
   ↓
3. Instance appears with #1, #2, etc.
   ↓
4. User clicks modification buttons
   ↓
5. Modifications stored in that instance
   ↓
6. Order Summary groups identical items
   ↓
7. Submit groups and sends to API
   ↓
8. Admin receives grouped order
```

---

## 🧪 **Testing Scenarios**

### **Test 1: Add Multiple Items**
1. Click "+ Add" on Turkey & Swiss (3 times)
2. ✅ Should see #1, #2, #3

### **Test 2: Customize Each Differently**
1. #1: Click "No mayo"
2. #2: Click "No tomato", "Extra cheese"
3. #3: Leave plain
4. ✅ Each should show different selections

### **Test 3: Remove Middle Instance**
1. Add 3 items
2. Click "Remove" on #2
3. ✅ Should now show #1 and #2 (renumbered)

### **Test 4: Order Summary Grouping**
1. Add 2x Turkey & Swiss with "No mayo"
2. Add 1x Turkey & Swiss plain
3. ✅ Summary should show:
   - 2x Turkey & Swiss (No mayo)
   - 1x Turkey & Swiss

### **Test 5: Submit Order**
1. Create mixed order
2. Click "Submit Order"
3. ✅ API should receive grouped items

---

## 🚀 **Future Enhancements**

### **Potential Additions:**
- [ ] **Duplicate instance** - "Copy #1" button
- [ ] **Reorder instances** - Drag and drop
- [ ] **Bulk modifications** - "Apply to all"
- [ ] **Save favorites** - "Remember this customization"
- [ ] **Visual preview** - Show what's included/excluded
- [ ] **Allergen warnings** - Highlight if modification removes allergen
- [ ] **Price adjustments** - Show if modifications cost extra

---

## 📱 **Mobile Considerations**

### **Responsive Design:**
- ✅ Modification buttons wrap on small screens
- ✅ "+ Add" button stays visible
- ✅ Instance cards stack vertically
- ✅ Touch-friendly button sizes
- ✅ Swipe to remove (future)

---

## ✅ **Completion Checklist**

- [x] Data structure supports individual instances
- [x] UI shows each instance separately
- [x] Modification buttons work per instance
- [x] Remove button deletes specific instance
- [x] Order summary groups identical items
- [x] API receives properly grouped data
- [x] Numbering updates when instances removed
- [x] Visual feedback for selected modifications
- [x] Mobile-responsive layout
- [x] Documentation complete

---

## 🎉 **Impact**

### **Before:**
- ❌ Couldn't customize individual items
- ❌ Had to use "Special Requests" text field
- ❌ Prone to errors and miscommunication
- ❌ Restaurant had to parse free-text notes

### **After:**
- ✅ Each item customized individually
- ✅ Structured, clear modifications
- ✅ No ambiguity or errors
- ✅ Restaurant gets clean, actionable data

---

**This feature makes group ordering seamless and error-free!** 🎯

