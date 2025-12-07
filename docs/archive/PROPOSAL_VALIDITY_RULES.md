# Proposal Validity Rules

**Date:** November 1, 2025  
**Status:** ✅ Documented

## Business Rules

### Initial Proposal
- **Validity Period:** 7 calendar days from when proposal is sent
- **Example:** Proposal sent Monday, June 1 → Valid until Monday, June 8

### Revised Proposal
- **Validity Period:** 2 business days from when revised proposal is sent
- **Business Days:** Monday-Friday (excludes weekends and holidays)
- **Example:** 
  - Revised proposal sent Monday → Valid until Wednesday
  - Revised proposal sent Friday → Valid until Tuesday (skips weekend)

## Implementation Notes

### When Creating Proposal
```typescript
// Initial proposal
const validUntil = addDays(new Date(), 7);
```

### When Editing/Revising Proposal
```typescript
// Revised proposal - add 2 business days
const validUntil = addBusinessDays(new Date(), 2);
```

### Business Day Calculation
- Skip Saturday and Sunday
- Optionally skip federal holidays
- Use a date utility library (e.g., `date-fns`)

## Database Field
- **Column:** `valid_until` (timestamp)
- **Set on:** Proposal creation
- **Updated on:** Proposal revision/edit
- **Used for:** Determining if proposal can be accepted

## Frontend Display
The proposal page shows:
```
This proposal is valid until [formatted date]
```

If expired, show:
```
This proposal expired on [formatted date]. 
Please contact us to request an updated proposal.
```

## Backend Logic

### On Proposal Creation
```typescript
import { addDays } from 'date-fns';

const proposal = {
  // ... other fields
  valid_until: addDays(new Date(), 7),
  status: 'draft'
};
```

### On Proposal Send (First Time)
```typescript
import { addDays } from 'date-fns';

await updateProposal(proposalId, {
  valid_until: addDays(new Date(), 7),
  status: 'sent',
  sent_at: new Date()
});
```

### On Proposal Revision/Edit
```typescript
import { addBusinessDays } from 'date-fns';

await updateProposal(proposalId, {
  valid_until: addBusinessDays(new Date(), 2),
  status: 'sent', // or 'revised'
  last_edited_at: new Date(),
  revision_count: proposal.revision_count + 1
});
```

### Business Day Helper (using date-fns)
```typescript
import { addBusinessDays, isWeekend } from 'date-fns';

// date-fns handles this automatically
const validUntil = addBusinessDays(new Date(), 2);
```

## Status Flow

```
draft → sent (7 days validity)
  ↓
edited → sent (2 business days validity)
  ↓
edited → sent (2 business days validity)
  ↓
accepted/declined/expired
```

## Examples

### Scenario 1: Initial Proposal
- **Sent:** Monday, June 1 at 10:00 AM
- **Valid Until:** Monday, June 8 at 11:59 PM
- **Days:** 7 calendar days

### Scenario 2: Revised on Monday
- **Revised/Sent:** Monday, June 1 at 2:00 PM
- **Valid Until:** Wednesday, June 3 at 11:59 PM
- **Days:** 2 business days (Mon → Tue → Wed)

### Scenario 3: Revised on Friday
- **Revised/Sent:** Friday, June 5 at 4:00 PM
- **Valid Until:** Tuesday, June 9 at 11:59 PM
- **Days:** 2 business days (Fri → Mon → Tue, skips weekend)

### Scenario 4: Revised on Thursday
- **Revised/Sent:** Thursday, June 4 at 11:00 AM
- **Valid Until:** Monday, June 8 at 11:59 PM
- **Days:** 2 business days (Thu → Fri → Mon, skips weekend)

## Edge Cases

### Holiday Handling
**Option 1:** Don't skip holidays (simpler)
- 2 business days = 2 weekdays, regardless of holidays

**Option 2:** Skip federal holidays (more complex)
- Use holiday calendar
- Add extra days if holiday falls within period

**Recommendation:** Start with Option 1 (simpler), add Option 2 if needed

### Same-Day Revisions
If a proposal is revised multiple times in one day:
- Each revision resets the 2-business-day clock
- Last revision time determines validity

### Timezone Considerations
- Use server timezone (Pacific Time for Walla Walla)
- Store timestamps in UTC
- Display in local timezone

## API Implementation

### Create Proposal Endpoint
```typescript
POST /api/proposals

{
  "client_name": "John Doe",
  "service_items": [...],
  // ... other fields
}

Response:
{
  "id": 123,
  "proposal_number": "PROP-2025-001",
  "valid_until": "2025-06-08T23:59:59Z", // 7 days from now
  "status": "draft"
}
```

### Send Proposal Endpoint
```typescript
POST /api/proposals/123/send

Response:
{
  "id": 123,
  "valid_until": "2025-06-08T23:59:59Z", // 7 days from send
  "status": "sent",
  "sent_at": "2025-06-01T10:00:00Z"
}
```

### Update Proposal Endpoint
```typescript
PUT /api/proposals/123

{
  "service_items": [...],
  // ... updated fields
}

Response:
{
  "id": 123,
  "valid_until": "2025-06-03T23:59:59Z", // 2 business days from edit
  "status": "sent",
  "last_edited_at": "2025-06-01T14:00:00Z",
  "revision_count": 1
}
```

## Database Schema

### Required Fields
```sql
ALTER TABLE proposals
ADD COLUMN sent_at TIMESTAMP,
ADD COLUMN last_edited_at TIMESTAMP,
ADD COLUMN revision_count INTEGER DEFAULT 0;

COMMENT ON COLUMN proposals.sent_at IS 'When proposal was first sent to client';
COMMENT ON COLUMN proposals.last_edited_at IS 'When proposal was last edited/revised';
COMMENT ON COLUMN proposals.revision_count IS 'Number of times proposal has been revised';
```

## Testing Scenarios

### Test 1: Initial Proposal
- Create proposal
- Send proposal
- Verify `valid_until` = 7 days from send date
- Verify status = 'sent'

### Test 2: Revised Proposal (Monday)
- Edit sent proposal
- Send revised proposal
- Verify `valid_until` = Wednesday (2 business days)
- Verify `revision_count` incremented

### Test 3: Revised Proposal (Friday)
- Edit sent proposal on Friday
- Send revised proposal
- Verify `valid_until` = Tuesday (skips weekend)
- Verify `last_edited_at` updated

### Test 4: Multiple Revisions
- Revise proposal 3 times
- Verify each revision resets validity to 2 business days
- Verify `revision_count` = 3

## Related Files

### To Be Updated
- `/app/api/proposals/route.ts` - Create proposal logic
- `/app/api/proposals/[proposal_id]/route.ts` - Update proposal logic
- `/app/api/proposals/[proposal_id]/send/route.ts` - Send proposal logic

### Dependencies
- `date-fns` package (install if not already present)

### Documentation
- `/docs/PROPOSAL_VALIDITY_RULES.md` - This document
- `/docs/PROPOSAL_ENHANCEMENTS_SPEC.md` - Overall proposal system

## Installation

```bash
npm install date-fns
```

## Usage Example

```typescript
import { addDays, addBusinessDays } from 'date-fns';

// Initial proposal
const initialValidUntil = addDays(new Date(), 7);

// Revised proposal
const revisedValidUntil = addBusinessDays(new Date(), 2);

console.log('Initial valid until:', initialValidUntil);
console.log('Revised valid until:', revisedValidUntil);
```

---

**Summary:** Initial proposals are valid for 7 calendar days from when sent. Revised proposals are valid for 2 business days (Monday-Friday, excluding weekends) from when the revision is sent. This gives clients a reasonable timeframe while encouraging timely decisions on revisions.

