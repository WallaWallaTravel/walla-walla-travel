# Company Contact Information Update

**Date:** November 1, 2025  
**Status:** ✅ Complete

## Changes Made

### 1. Created Global Configuration File
**File:** `/lib/config/company.ts`

Centralized all company contact information:
- **Company Name:** Walla Walla Travel
- **Phone:** +1 (509) 200-8000 (clickable tel: link)
- **Email:** info@wallawalla.travel (clickable mailto: link)
- **Tagline:** Wine Country Tours & Transportation
- **Location:** Walla Walla, WA

### 2. Helper Functions
Created utility functions for easy integration:
- `getPhoneLink()` - Returns `tel:+15092008000` for one-click dialing
- `getEmailLink(subject?)` - Returns `mailto:info@wallawalla.travel` with optional subject

### 3. Updated Pages

#### Client Proposal View (`/app/proposals/[proposal_id]/page.tsx`)
- ✅ Header uses `COMPANY_INFO.name` and `COMPANY_INFO.tagline`
- ✅ Footer displays clickable phone number with icon
- ✅ Footer displays clickable email with icon
- ✅ Styled with gold accent color (#D4AF37) on dark background
- ✅ Hover effects for better UX

#### Proposal Acceptance (`/app/proposals/[proposal_id]/accept/page.tsx`)
- ✅ Footer added with clickable contact links
- ✅ Liability text uses `COMPANY_INFO.name`
- ✅ Consistent styling with proposal view

### 4. Mobile-Friendly Features
- **Phone Links:** Automatically open phone dialer on mobile devices
- **Email Links:** Open default email client with pre-filled recipient
- **Responsive Design:** Contact info adapts to screen size

### 5. Documentation
Created comprehensive documentation:
- `/docs/COMPANY_CONTACT_INFO.md` - Full guide on usage and best practices

## Visual Design

### Footer Layout
```
┌─────────────────────────────────────────────────┐
│     © 2025 Walla Walla Travel. All rights...    │
│   Wine Country Tours & Transportation | WA      │
│                                                  │
│   📞 (509) 200-8000    ✉️ info@wallawalla...   │
└─────────────────────────────────────────────────┘
```

### Color Scheme
- Background: Dark gray (#1F2937)
- Text: Light gray (#9CA3AF)
- Links: Gold (#D4AF37)
- Hover: Bright gold (#F4D03F)

## Benefits

### 1. Centralized Management
- Update contact info in ONE place
- Changes propagate to all pages automatically
- No risk of outdated information

### 2. Better User Experience
- One-click calling on mobile
- One-click email composition
- Professional, consistent presentation

### 3. Maintainability
- Easy to add new contact methods
- Simple to update for different brands
- Clear documentation for future developers

### 4. Mobile Optimization
- `tel:` links work on all mobile devices
- `mailto:` links open native email apps
- Responsive design adapts to screen size

## Testing Checklist

- [x] Phone link works on mobile (opens dialer)
- [x] Phone link works on desktop (opens phone app if available)
- [x] Email link opens default email client
- [x] Email link pre-fills recipient address
- [x] Footer displays correctly on desktop
- [x] Footer displays correctly on mobile
- [x] Contact info is consistent across pages
- [x] No linting errors
- [x] TypeScript types are correct

## Next Steps

### Immediate (Optional)
- [ ] Add company logo to header
- [ ] Add social media links to footer
- [ ] Update homepage with contact info

### Future Enhancements
- [ ] Add business hours
- [ ] Add physical address (if needed)
- [ ] Add emergency contact number
- [ ] Multi-brand support (NW Touring, Herding Cats, etc.)
- [ ] Department-specific emails (sales, support, billing)

## Files Modified

### Created
1. `/lib/config/company.ts` - Global configuration
2. `/docs/COMPANY_CONTACT_INFO.md` - Documentation
3. `/docs/CONTACT_INFO_UPDATE.md` - This summary

### Updated
1. `/app/proposals/[proposal_id]/page.tsx` - Added contact info to header/footer
2. `/app/proposals/[proposal_id]/accept/page.tsx` - Added footer with contact info

## Code Example

```typescript
// Import the config
import { COMPANY_INFO, getPhoneLink, getEmailLink } from '@/lib/config/company';

// Use in your component
<footer>
  <h1>{COMPANY_INFO.name}</h1>
  <p>{COMPANY_INFO.tagline}</p>
  
  <a href={getPhoneLink()}>
    {COMPANY_INFO.phone.formatted}
  </a>
  
  <a href={getEmailLink('Booking Inquiry')}>
    {COMPANY_INFO.email.general}
  </a>
</footer>
```

## Related Documentation
- `/docs/COMPANY_CONTACT_INFO.md` - Full usage guide
- `/lib/config/company.ts` - Source code
- `/lib/theme-config.ts` - Color theme config
- `/lib/rate-config.ts` - Pricing config

---

**Summary:** Company contact information is now centralized, mobile-friendly, and easy to maintain. All client-facing proposal pages display clickable phone and email links in a professional footer design.

