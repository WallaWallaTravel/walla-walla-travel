# Resend Domain Verification Instructions

## Verified Domains
- [x] wallawalla.travel - Verified December 26, 2025

## Pending Domains (waiting for transfer to Namecheap)
- [ ] nwtouring.com
- [ ] herdingcatswinetours.com

---

## Step-by-Step Instructions

### 1. Add Domain in Resend
1. Go to [resend.com/domains](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter the domain name (e.g., `nwtouring.com`)
4. Resend will show you DNS records to add

### 2. Add DNS Records in Namecheap

Go to Namecheap → Domain List → Manage → Advanced DNS

Add these records (copy exact values from Resend dashboard):

#### DKIM Record (Domain Verification)
| Field | Value |
|-------|-------|
| Type | TXT |
| Host | `resend._domainkey` |
| Value | (copy full value from Resend - starts with `p=MIG...`) |
| TTL | Automatic |

#### SPF MX Record
| Field | Value |
|-------|-------|
| Type | MX |
| Host | `send` |
| Value | `feedback-smtp.us-east-1.amazonses.com` (verify in Resend) |
| Priority | 10 |
| TTL | Automatic |

#### SPF TXT Record
| Field | Value |
|-------|-------|
| Type | TXT |
| Host | `send` |
| Value | `v=spf1 include:amazonses.com ~all` (verify in Resend) |
| TTL | Automatic |

#### DMARC Record (Optional but Recommended)
| Field | Value |
|-------|-------|
| Type | TXT |
| Host | `_dmarc` |
| Value | `v=DMARC1; p=none;` |
| TTL | Automatic |

### 3. Verify in Resend
1. After adding all records, click **"I've added the records"** in Resend
2. DNS propagation takes 5-60 minutes
3. Resend will automatically retry verification

### 4. Update Code (if needed)

For brand-specific emails, update the FROM address in:
- `lib/email-brands.ts` (brand email configs)
- Any API routes that specify a custom `from` address

Example:
```typescript
from: 'NW Touring <bookings@nwtouring.com>',
```

---

## Current Email Configuration

### API Key
```
RESEND_API_KEY=re_9bLij8rQ_7EVg5qoAqhBkEpd3B9CuTqFd
```

### Default FROM Address
```
Walla Walla Travel <bookings@wallawalla.travel>
```

### Key Files
- `/lib/email.ts` - Main email service
- `/lib/email-brands.ts` - Brand-specific templates
- `/app/api/booking-requests/route.ts` - Booking confirmation emails
- `/.env.local` - API key configuration

---

## Troubleshooting

### "Domain not verified" error
- Wait for DNS propagation (up to 24 hours in rare cases)
- Verify records match exactly what Resend shows
- Check for typos in the Host field

### Emails going to spam
- Ensure DMARC record is added
- Build sender reputation by sending consistently
- Avoid spam trigger words in subject lines

### Check DNS Records
```bash
# Verify DKIM
dig TXT resend._domainkey.yourdomain.com

# Verify SPF
dig TXT send.yourdomain.com
dig MX send.yourdomain.com

# Verify DMARC
dig TXT _dmarc.yourdomain.com
```
