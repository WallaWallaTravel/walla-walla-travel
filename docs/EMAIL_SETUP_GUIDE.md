# Email Notification Setup Guide

## 📧 Overview

The system uses **Resend** for email notifications. Resend is a modern email API that's simple to set up and reliable.

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Get API Key

1. Log in to Resend dashboard
2. Go to **API Keys** section
3. Click **Create API Key**
4. Give it a name (e.g., "Walla Walla Travel - Production")
5. Copy the API key (starts with `re_`)

### Step 3: Add to Environment Variables

Add to your `.env.local` file:

```bash
RESEND_API_KEY="re_your_actual_api_key_here"
FROM_EMAIL="noreply@wallawallatravel.com"
```

### Step 4: Verify Domain (Production Only)

For production, you need to verify your domain:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `wallawallatravel.com`)
4. Add the DNS records Resend provides to your domain
5. Wait for verification (usually 5-15 minutes)

**For Development:** You can use Resend's test domain without verification.

---

## 📨 Email Types

The system sends these automated emails:

### 1. **Booking Confirmation**
- **Trigger:** New booking created
- **To:** Customer
- **Content:** Booking details, next steps

### 2. **Deposit Invoice**
- **Trigger:** Booking confirmed
- **To:** Customer
- **Content:** Invoice with payment link

### 3. **Final Invoice**
- **Trigger:** Admin approves final invoice
- **To:** Customer
- **Content:** Final invoice with tip options

### 4. **Lunch Order**
- **Trigger:** Admin approves lunch order
- **To:** Restaurant
- **Content:** Order details, dietary restrictions

### 5. **Tour Offer**
- **Trigger:** Admin creates tour offer
- **To:** Driver
- **Content:** Tour details, pay amount, accept/decline

### 6. **Tour Assignment**
- **Trigger:** Driver accepts tour
- **To:** Driver
- **Content:** Confirmation, pickup details

---

## 🧪 Testing Emails

### Development Mode

Without `RESEND_API_KEY` set, emails are logged to console:

```
⚠️  RESEND_API_KEY not configured. Email would be sent: Booking Confirmed
   To: customer@example.com
   Subject: Booking Confirmed - BK-20251031-001
```

### Test Mode

With API key set, use test email addresses:

```typescript
// These will be delivered to your Resend dashboard
const testEmail = 'test@resend.dev';
```

### Production Mode

With verified domain, emails are sent normally.

---

## 🎨 Email Templates

All email templates are in `/lib/email.ts`:

```typescript
export const EmailTemplates = {
  bookingConfirmation: (data) => ({ ... }),
  invoice: (data) => ({ ... }),
  lunchOrderToRestaurant: (data) => ({ ... }),
  tourOfferToDriver: (data) => ({ ... }),
  tourAssignmentConfirmation: (data) => ({ ... }),
};
```

### Customizing Templates

Edit the HTML in `/lib/email.ts`. Templates use inline CSS for maximum email client compatibility.

---

## 📊 Email Sending Functions

### Manual Sending

```typescript
import { sendEmail, EmailTemplates } from '@/lib/email';

// Send custom email
await sendEmail({
  to: 'customer@example.com',
  subject: 'Your Tour Details',
  html: '<h1>Hello!</h1><p>Your tour is confirmed.</p>',
});

// Use template
const template = EmailTemplates.bookingConfirmation({
  customer_name: 'John Smith',
  booking_number: 'BK-001',
  // ... other data
});

await sendEmail({
  to: 'customer@example.com',
  ...template,
});
```

### Pre-built Functions

```typescript
import {
  sendBookingConfirmation,
  sendInvoiceEmail,
  sendLunchOrderToRestaurant,
  sendTourOfferToDriver,
  sendTourAssignmentConfirmation,
} from '@/lib/email';

// Send booking confirmation
await sendBookingConfirmation(bookingData, 'customer@example.com');

// Send invoice
await sendInvoiceEmail(invoiceData, 'customer@example.com');

// Send lunch order to restaurant
await sendLunchOrderToRestaurant(orderData, 'restaurant@example.com');

// Send tour offer to driver
await sendTourOfferToDriver(offerData, 'driver@example.com');

// Send tour assignment confirmation
await sendTourAssignmentConfirmation(assignmentData, 'driver@example.com');
```

---

## 🔧 Integration Points

Emails are automatically sent from these API endpoints:

| Endpoint | Email Type | Recipient |
|----------|-----------|-----------|
| `/api/bookings` (POST) | Booking Confirmation | Customer |
| `/api/admin/approve-invoice/[id]` | Invoice | Customer |
| `/api/admin/lunch-orders/[id]/approve` | Lunch Order | Restaurant |
| `/api/admin/tour-offers` (POST) | Tour Offer | Driver |
| `/api/driver/offers/[id]/respond` | Tour Assignment | Driver |

---

## 📈 Monitoring

### Resend Dashboard

View email delivery status:
1. Log in to [Resend Dashboard](https://resend.com/emails)
2. See all sent emails, opens, clicks, bounces
3. Debug delivery issues

### Application Logs

Check server logs for email sending:

```bash
# Success
✅ Email sent: email_id_here

# Failure
❌ Email send failed: error details
```

---

## 💰 Pricing

**Free Tier:**
- 100 emails/day
- 3,000 emails/month
- Perfect for development and small operations

**Paid Plans:**
- $20/month for 50,000 emails
- $80/month for 250,000 emails

[View Pricing](https://resend.com/pricing)

---

## 🆘 Troubleshooting

### Emails Not Sending

1. **Check API Key**
   ```bash
   echo $RESEND_API_KEY
   # Should output: re_...
   ```

2. **Check Logs**
   ```bash
   # Look for email errors in server logs
   npm run dev
   ```

3. **Verify Domain** (Production)
   - Check DNS records are correct
   - Wait for propagation (up to 48 hours)

### Emails Going to Spam

1. **Verify Domain** - Required for production
2. **Add SPF/DKIM** - Resend provides these automatically
3. **Warm Up Domain** - Start with small volumes
4. **Check Content** - Avoid spam trigger words

### Rate Limits

Free tier: 100 emails/day

If you hit limits:
1. Upgrade to paid plan
2. Batch emails
3. Use email queuing

---

## 🔐 Security

### API Key Storage

✅ **DO:**
- Store in `.env.local` (never committed)
- Use environment variables in production
- Rotate keys periodically

❌ **DON'T:**
- Commit API keys to git
- Share keys in chat/email
- Use same key for dev/prod

### Email Content

- Never send passwords in email
- Use secure payment links (HTTPS)
- Include unsubscribe links (for marketing)

---

## 📚 Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Email Best Practices](https://resend.com/docs/knowledge-base/best-practices)

---

## ✅ Checklist

- [ ] Created Resend account
- [ ] Got API key
- [ ] Added to `.env.local`
- [ ] Tested in development
- [ ] Verified domain (production)
- [ ] Customized email templates
- [ ] Monitored first emails
- [ ] Set up error alerts

---

**Status:** Email system ready to use! 🎉

