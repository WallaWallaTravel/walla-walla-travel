# Proposal Display Tweaks

**Date:** November 1, 2025  
**Status:** ✅ Complete

## Changes Made

### 1. Removed "Includes tastings and lunch coordination"
**Issue:** This legacy text was showing at the bottom of service descriptions and was redundant.

**Solution:** Added filter to remove this text from descriptions:
```typescript
const cleanDescription = item.description
  .replace(/Includes tastings and lunch coordination\.?/gi, '')
  .trim();
```

**Result:** Text is automatically filtered out when displaying proposals.

### 2. Simplified Lunch Cost Section
**Before:**
```
Optional Lunch Coordination
We can arrange lunch at a local restaurant (paid directly)

Estimated lunch cost: $70.00
(4 guests × ~$15-20/person + tax)
```

**After:**
```
Estimated lunch cost: $70.00
(4 guests × ~$15-20/person + tax)
```

**Changes:**
- ❌ Removed "Optional Lunch Coordination" heading
- ❌ Removed "We can arrange lunch..." explanation
- ✅ Kept just the cost estimate
- ✅ Cleaner, more concise

### 3. Updated Proposal Validity Rules
**New Business Rules:**

**Initial Proposal:**
- Valid for **7 calendar days** from when sent

**Revised Proposal:**
- Valid for **2 business days** from when revision is sent
- Business days = Monday-Friday (excludes weekends)

**Examples:**
- Initial sent Monday → Valid until next Monday (7 days)
- Revised sent Monday → Valid until Wednesday (2 business days)
- Revised sent Friday → Valid until Tuesday (skips weekend)

## Visual Impact

### Lunch Section
**Before (3 lines):**
```
┌─────────────────────────────────────────┐
│ Optional Lunch Coordination             │
│ We can arrange lunch at a local         │
│ restaurant (paid directly)              │
│                                         │
│ Estimated lunch cost: $70.00            │
│ (4 guests × ~$15-20/person + tax)      │
└─────────────────────────────────────────┘
```

**After (1 line):**
```
┌─────────────────────────────────────────┐
│ Estimated lunch cost: $70.00            │
│ (4 guests × ~$15-20/person + tax)      │
└─────────────────────────────────────────┘
```

### Description Area
**Before:**
```
Full-day wine tour visiting premier wineries
Includes tastings and lunch coordination
```

**After:**
```
Full-day wine tour visiting premier wineries
```

## Technical Implementation

### Description Filtering
```typescript
{item.description && (() => {
  // Filter out legacy text that's now shown separately
  const cleanDescription = item.description
    .replace(/Includes tastings and lunch coordination\.?/gi, '')
    .trim();
  
  return cleanDescription ? (
    <p className="text-gray-700 mb-3">{cleanDescription}</p>
  ) : null;
})()}
```

**Features:**
- Case-insensitive matching (`/gi` flag)
- Handles with or without period
- Trims whitespace
- Returns null if description becomes empty

### Lunch Section
```typescript
{isWineTour && item.party_size && (
  <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
    <p className="text-sm text-gray-700">
      <strong>Estimated lunch cost:</strong> {formatCurrency(item.party_size * 17.50)} 
      <span className="text-gray-600"> ({item.party_size} guests × ~$15-20/person + tax)</span>
    </p>
  </div>
)}
```

**Simplified:**
- Single paragraph
- No heading
- No explanation text
- Just the essential cost information

## Benefits

### User Experience
- ✅ Less text to read
- ✅ Cleaner, more focused
- ✅ Information is more scannable
- ✅ Professional appearance

### Clarity
- ✅ No redundant information
- ✅ Cost is clear and prominent
- ✅ Doesn't over-explain obvious things

### Maintenance
- ✅ Automatic filtering of legacy text
- ✅ Works with existing proposals
- ✅ No database migration needed

## Proposal Validity Implementation

### Backend TODO
When implementing proposal creation/editing:

1. **Install date-fns:**
```bash
npm install date-fns
```

2. **On Initial Send:**
```typescript
import { addDays } from 'date-fns';

await updateProposal(proposalId, {
  valid_until: addDays(new Date(), 7),
  status: 'sent',
  sent_at: new Date()
});
```

3. **On Revision:**
```typescript
import { addBusinessDays } from 'date-fns';

await updateProposal(proposalId, {
  valid_until: addBusinessDays(new Date(), 2),
  status: 'sent',
  last_edited_at: new Date(),
  revision_count: proposal.revision_count + 1
});
```

## Related Files

### Updated
- `/app/proposals/[proposal_id]/page.tsx` - Removed text, simplified lunch section

### Created
- `/docs/PROPOSAL_VALIDITY_RULES.md` - Detailed validity rules
- `/docs/PROPOSAL_DISPLAY_TWEAKS.md` - This document

### To Be Updated (Backend)
- `/app/api/proposals/route.ts` - Add validity logic
- `/app/api/proposals/[proposal_id]/route.ts` - Add revision logic
- `/app/api/proposals/[proposal_id]/send/route.ts` - Add send logic

## Testing

### Visual Testing
- [x] "Includes tastings..." text is removed
- [x] Lunch section shows only cost estimate
- [x] No extra headings or explanations
- [x] Layout looks clean and balanced

### Functionality Testing
- [ ] Initial proposals get 7-day validity
- [ ] Revised proposals get 2-business-day validity
- [ ] Weekend days are skipped correctly
- [ ] Validity date displays correctly

---

**Summary:** Removed redundant text ("Includes tastings and lunch coordination"), simplified the lunch cost section to just show the estimate, and documented new proposal validity rules (7 days initial, 2 business days for revisions).

