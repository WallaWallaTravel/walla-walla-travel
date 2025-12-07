# Company Contact Information

## Overview
All company contact information is centralized in `/lib/config/company.ts` for easy management and consistency across the application.

## Configuration File
**Location:** `/lib/config/company.ts`

### Current Settings
```typescript
export const COMPANY_INFO = {
  name: 'Walla Walla Travel',
  tagline: 'Wine Country Tours & Transportation',
  
  phone: {
    display: '+1 (509) 200-8000',
    dialable: '+15092008000',
    formatted: '(509) 200-8000',
  },
  
  email: {
    general: 'info@wallawalla.travel',
    support: 'info@wallawalla.travel',
    bookings: 'info@wallawalla.travel',
  },
  
  address: {
    city: 'Walla Walla',
    state: 'WA',
    full: 'Walla Walla, WA',
  },
  
  website: {
    main: 'https://wallawalla.travel',
    booking: 'https://wallawalla.travel/book',
  },
}
```

## Helper Functions

### `getPhoneLink()`
Returns a clickable `tel:` link for one-click dialing:
```typescript
<a href={getPhoneLink()}>Call Us</a>
// Renders: <a href="tel:+15092008000">Call Us</a>
```

### `getEmailLink(subject?)`
Returns a clickable `mailto:` link with optional subject:
```typescript
<a href={getEmailLink()}>Email Us</a>
<a href={getEmailLink('Booking Inquiry')}>Email Us</a>
```

## Usage Examples

### In React Components
```typescript
import { COMPANY_INFO, getPhoneLink, getEmailLink } from '@/lib/config/company';

// Display company name
<h1>{COMPANY_INFO.name}</h1>

// Clickable phone number
<a href={getPhoneLink()}>{COMPANY_INFO.phone.formatted}</a>

// Clickable email
<a href={getEmailLink()}>{COMPANY_INFO.email.general}</a>
```

### Mobile-Friendly Links
The phone link uses the `tel:` protocol, which automatically:
- Opens the phone dialer on mobile devices
- Allows one-click calling
- Works on desktop with apps like Skype, FaceTime, etc.

The email link uses the `mailto:` protocol, which:
- Opens the default email client
- Pre-fills the recipient address
- Can include optional subject lines

## Where It's Used

### Client-Facing Pages
- ✅ `/app/proposals/[proposal_id]/page.tsx` - Proposal view
- ✅ `/app/proposals/[proposal_id]/accept/page.tsx` - Proposal acceptance
- 🔲 `/app/client-portal/[booking_id]/page.tsx` - Client portal (TODO)
- 🔲 `/app/page.tsx` - Homepage (TODO)

### Admin Pages
- 🔲 Admin dashboard footer (TODO)
- 🔲 Email templates (TODO)

### Email Templates
- 🔲 Booking confirmations (TODO)
- 🔲 Proposal notifications (TODO)
- 🔲 Invoice emails (TODO)

## Updating Contact Info

To update company contact information:

1. Edit `/lib/config/company.ts`
2. Update the relevant fields
3. Changes will automatically propagate to all pages using `COMPANY_INFO`

**No need to update individual pages!** This is the power of centralized configuration.

## Future Enhancements

### Planned Additions
- [ ] Multiple phone numbers (office, mobile, emergency)
- [ ] Department-specific emails (sales, support, billing)
- [ ] Complete physical address
- [ ] Social media links (Facebook, Instagram, Twitter)
- [ ] Business hours
- [ ] Emergency contact information

### Potential Features
- [ ] Multi-language support
- [ ] Different contact info per brand (Walla Walla Travel, NW Touring, etc.)
- [ ] Seasonal contact info (winter vs summer hours)

## Best Practices

1. **Always import from the config file** - Never hardcode contact info
2. **Use helper functions for links** - Ensures proper formatting
3. **Update in one place** - All changes propagate automatically
4. **Test on mobile** - Verify phone/email links work correctly
5. **Keep it DRY** - Don't repeat yourself across files

## Related Files
- `/lib/config/company.ts` - Main configuration file
- `/lib/theme-config.ts` - Color theme configuration
- `/lib/rate-config.ts` - Pricing configuration
- `/docs/COMPANY_CONTACT_INFO.md` - This documentation

