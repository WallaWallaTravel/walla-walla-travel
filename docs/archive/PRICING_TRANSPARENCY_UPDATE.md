# Pricing Transparency & Communication Update

**Date:** November 1, 2025  
**Status:** ✅ Complete

## Overview
Enhanced proposal pages to clearly communicate the hourly rate pricing structure, tasting fee exclusions, and billing process to set proper client expectations.

## Business Rules Clarified

### 1. Hourly Rate Pricing
- Tours are priced at an **hourly rate** (not flat rate)
- Estimates are based on **6 hours** (best estimate)
- Final invoice reflects **actual tour duration**
- **5-hour minimum** applies to all tours

### 2. Tasting Fees
- **NOT included** in tour pricing
- Paid directly to wineries by guests
- Typical range: **$20-$40 per person**

### 3. Final Billing
- Invoice sent **48 hours after tour concludes**
- Calculated based on **actual hours**
- Includes any applicable adjustments

## Changes Made

### 1. Client Proposal View (`/app/proposals/[proposal_id]/page.tsx`)

#### Added "Important Pricing Information" Section
New blue info box with clear bullet points:

```
✓ Hourly Rate Pricing: Explains estimate vs. actual billing
✓ Tastings Not Included: Clarifies tasting fees are separate ($20-$40/person)
✓ 5-Hour Minimum: States minimum tour duration
✓ Final Invoice: Explains when and how final bill is calculated
```

**Visual Design:**
- Blue accent color (#3B82F6) for information
- Info icon for visual clarity
- Border-left design for emphasis
- Bullet points for easy scanning

#### Updated Duration Label
```typescript
// Before
<strong>Duration:</strong> 6 hours

// After
<strong>Estimated Duration:</strong> 6 hours
```

#### Updated Pricing Section Header
```typescript
// Before
<h3>Investment</h3>

// After
<h3>Estimated Investment</h3>
<p className="italic">Based on 6 hours. Final invoice will reflect actual tour duration.</p>
```

### 2. Proposal Acceptance Page (`/app/proposals/[proposal_id]/accept/page.tsx`)

#### Updated Booking Summary
```typescript
// Before
<h3>Booking Summary</h3>
<span>Tour Total</span>

// After
<h3>Booking Summary</h3>
<p className="italic">Estimated pricing based on hourly rate. Final invoice will reflect actual tour duration.</p>
<span>Estimated Tour Total</span>
```

## Key Messaging

### What Clients See

1. **On Proposal Page:**
   - Large, prominent info box explaining pricing structure
   - Clear statement that tastings are extra
   - Explanation of 5-hour minimum
   - Details about final invoice timing

2. **During Acceptance:**
   - Reminder that pricing is estimated
   - Clear labeling of "Estimated Tour Total"
   - Confirmation of hourly rate structure

3. **Throughout Experience:**
   - Consistent use of "Estimated" language
   - Clear communication about actual billing

## Benefits

### 1. Transparency
- Clients understand pricing structure upfront
- No surprises when final invoice arrives
- Clear expectations about tasting fees

### 2. Legal Protection
- Documentation that client was informed
- Clear terms accepted during booking
- Reduces disputes over final billing

### 3. Professional Communication
- Sets proper expectations
- Demonstrates attention to detail
- Builds trust with clients

### 4. Operational Clarity
- Drivers know to track actual hours
- Admin knows final invoice will differ from estimate
- Accounting understands billing process

## Example Scenario

**Proposal Estimate:**
- 6 hours @ $105/hour (Thu-Sat, 3-4 guests)
- Subtotal: $630
- Tax: $56.07
- **Total: $686.07**

**Actual Tour:**
- 7 hours (tour ran longer due to traffic/extra winery)
- 7 hours @ $105/hour = $735
- Tax: $65.42
- **Final Invoice: $800.42**

**Client Experience:**
- ✅ Saw "Estimated Investment" on proposal
- ✅ Read info box explaining hourly billing
- ✅ Acknowledged during acceptance
- ✅ No surprise when final invoice is higher

## Related Files

### Updated
1. `/app/proposals/[proposal_id]/page.tsx` - Client proposal view
2. `/app/proposals/[proposal_id]/accept/page.tsx` - Acceptance flow

### Related Documentation
- `/docs/ACTUAL_PRICING_STRUCTURE.md` - Business pricing rules
- `/lib/rate-config.ts` - Hourly rate configuration
- `/docs/PROPOSAL_ENHANCEMENTS_SPEC.md` - Proposal system design

## Testing Checklist

- [x] Info box displays correctly on proposal page
- [x] All pricing sections say "Estimated"
- [x] Tasting fee exclusion is clearly stated
- [x] 5-hour minimum is mentioned
- [x] Final invoice timing is explained
- [x] Acceptance page shows estimate disclaimer
- [x] Mobile responsive design
- [x] No linting errors
- [x] Clear, professional language

## Future Enhancements

### Potential Additions
- [ ] Add tasting fee estimator tool
- [ ] Link to sample final invoice
- [ ] Add FAQ section about billing
- [ ] Include testimonials about transparency
- [ ] Add "What's Included" vs "What's Not" comparison table

### Invoice System Integration
When building the invoicing system, ensure:
- [ ] Final invoice shows estimated vs. actual hours
- [ ] Clear breakdown of hourly rate calculation
- [ ] Reference to original proposal estimate
- [ ] Explanation of any differences

## Communication Templates

### For Admin/Sales Team
When creating proposals, emphasize:
- "This is an estimate based on 6 hours"
- "Tasting fees are separate and paid to wineries"
- "Final invoice reflects actual tour time"
- "5-hour minimum ensures quality experience"

### For Drivers
Remind drivers to:
- Track actual tour hours accurately
- Note start and end times
- Report any significant time variations
- Communicate delays to clients proactively

---

**Summary:** Proposals now clearly communicate hourly rate pricing, tasting fee exclusions, and billing process. This transparency builds trust, sets proper expectations, and reduces potential disputes over final invoicing.

