# Stripe Testing Guide

How to test Stripe payments locally and in preview/staging environments.

---

## Test vs. Live Mode

| Environment | Stripe Mode | Dashboard |
|-------------|-------------|-----------|
| `localhost:3000` | **Test** | https://dashboard.stripe.com/test |
| Vercel Preview | **Test** | https://dashboard.stripe.com/test |
| Production | **Live** | https://dashboard.stripe.com/ |

### Environment Variables by Mode

| Variable | Test | Live |
|----------|------|------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (test) | `whsec_...` (live) |
| `STRIPE_SECRET_KEY_WWT` | `sk_test_...` | `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY_WWT` | `pk_test_...` | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET_WWT_TEST` | `whsec_...` | N/A |
| `STRIPE_WEBHOOK_SECRET_WWT_LIVE` | N/A | `whsec_...` |

### Dual-Brand Setup

This project uses **two Stripe accounts** for two business entities:

| Brand | Stripe Account | Env Prefix |
|-------|---------------|------------|
| NW Touring & Concierge | Default | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Walla Walla Travel | WWT | `STRIPE_SECRET_KEY_WWT`, `STRIPE_WEBHOOK_SECRET_WWT_*` |

Payment routes select the correct Stripe client via `getBrandStripeClient(brandId)`.

---

## Test Card Numbers

Use these in **test mode only** (they will be rejected in live mode).

### Successful Payments

| Card Number | Brand | Notes |
|-------------|-------|-------|
| `4242 4242 4242 4242` | Visa | Always succeeds |
| `5555 5555 5555 4444` | Mastercard | Always succeeds |
| `3782 822463 10005` | Amex | Always succeeds |

- **Expiry**: Any future date (e.g., `12/34`)
- **CVC**: Any 3 digits (4 for Amex)
- **ZIP**: Any 5 digits

### Declined Cards

| Card Number | Error |
|-------------|-------|
| `4000 0000 0000 0002` | Generic decline |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0000 0000 9987` | Lost card |
| `4000 0000 0000 0069` | Expired card |
| `4000 0000 0000 0127` | Incorrect CVC |

### 3D Secure / Authentication

| Card Number | Behavior |
|-------------|----------|
| `4000 0025 0000 3155` | Requires authentication (succeeds) |
| `4000 0000 0000 3220` | Requires authentication (fails) |

### Disputes

| Card Number | Behavior |
|-------------|----------|
| `4000 0000 0000 0259` | Creates a dispute after payment |

Full reference: https://docs.stripe.com/testing#cards

---

## Local Webhook Testing

### 1. Install Stripe CLI

```bash
brew install stripe/stripe-cli/stripe
```

### 2. Log In

```bash
stripe login
```

### 3. Forward Webhooks to Local Server

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This prints a **webhook signing secret** (`whsec_...`). Copy it.

### 4. Set the Webhook Secret

Add to `.env.local`:

```
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 5. Trigger Test Events

In a separate terminal:

```bash
# Successful payment
stripe trigger payment_intent.succeeded

# Failed payment
stripe trigger payment_intent.payment_failed

# Refund
stripe trigger charge.refunded

# Dispute
stripe trigger charge.dispute.created
```

### 6. Monitor Events

```bash
# Live tail of all events
stripe events tail

# Filter to specific event types
stripe events tail --type payment_intent.succeeded
```

---

## Webhook Architecture

The webhook handler (`app/api/webhooks/stripe/route.ts`) processes:

| Event | Handler | Action |
|-------|---------|--------|
| `payment_intent.succeeded` | Routes by `metadata.payment_type` | Updates booking/proposal/ticket payment status |
| `payment_intent.payment_failed` | `handlePaymentFailed` | Logs failure, updates payment record |
| `charge.refunded` | `handleChargeRefunded` | Updates payment status to 'refunded' |
| `charge.dispute.created` | `handleDisputeCreated` | Flags payment as disputed, logs to Sentry, sends admin email |

### Webhook Secret Verification

The handler tries **4 webhook secrets** in sequence to verify the signature. This is intentional — each brand (NW Touring, WWT) has separate test and live Stripe accounts, and each account signs webhooks with its own secret:

```
STRIPE_WEBHOOK_SECRET_LIVE      → NW Touring live
STRIPE_WEBHOOK_SECRET_WWT_LIVE  → Walla Walla Travel live
STRIPE_WEBHOOK_SECRET           → NW Touring test
STRIPE_WEBHOOK_SECRET_WWT_TEST  → Walla Walla Travel test
```

The first secret that successfully verifies the signature is used. This is NOT a fallback chain — it's multi-account support.

### Payment Type Routing

`payment_intent.succeeded` routes to different handlers based on `metadata.payment_type`:

| `payment_type` | Handler | Source |
|----------------|---------|--------|
| `booking_deposit` | `handleBookingPaymentSuccess` | Booking deposit |
| `trip_proposal_deposit` | `handleTripProposalPaymentSuccess` | Trip proposal deposit |
| `shared_tour_ticket` | `handleSharedTourPaymentSuccess` | Shared tour ticket |
| `guest_share` | `handleGuestPaymentSuccess` | Individual guest payment |
| `group_payment` | `handleGroupPaymentSuccess` | Group payment |
| `driver_tip` | `handleDriverTipSuccess` | Driver tip |

---

## Idempotency

All payment routes use **idempotency keys** to prevent duplicate charges:

```typescript
stripe.paymentIntents.create(
  { amount, currency: 'usd', ... },
  { idempotencyKey: `pi_tp_${proposalId}_${amountInCents}` }
);
```

All refund operations also use idempotency keys:

```typescript
stripe.refunds.create(
  { payment_intent: piId, amount: cents, ... },
  { idempotencyKey: `refund_${piId}_${cents}` }
);
```

The webhook handler is also idempotent — it checks if a payment was already processed before updating records (e.g., `proposal.deposit_paid === true`, `ON CONFLICT DO NOTHING`).

---

## Common Testing Scenarios

### Test a Trip Proposal Deposit

1. Create a trip proposal in admin (`/admin/trip-proposals/new`)
2. Set status to "accepted" and ensure deposit amount is calculated
3. Open the client-facing URL (the `/my-trip/[token]` link)
4. Click "Pay Deposit" and use test card `4242 4242 4242 4242`
5. Verify in Stripe test dashboard that payment succeeded
6. Verify webhook updates the proposal to `deposit_paid = true`

### Test a Shared Tour Ticket

1. Create a shared tour in admin
2. Open the public tour page
3. Purchase a ticket with test card
4. Verify confirmation email sent
5. Check Stripe dashboard for the payment

### Test a Refund

1. Complete a payment (any type)
2. Use admin discount tool or cancel the booking
3. Verify refund appears in Stripe test dashboard
4. Verify webhook updates payment status to 'refunded'

### Test a Dispute

1. Pay with dispute test card `4000 0000 0000 0259`
2. Wait for Stripe to create the dispute (usually within minutes in test mode)
3. Verify `charge.dispute.created` webhook fires
4. Check that payment status is updated to 'disputed'
5. Check admin notification email

---

## Troubleshooting

### "Webhook signature verification failed"

- Ensure the signing secret matches your Stripe CLI output (local) or your Stripe Dashboard webhook endpoint secret (deployed)
- Check that you're using the correct secret for the Stripe account that sent the event

### "No webhook secrets configured"

- At least one `STRIPE_WEBHOOK_SECRET*` env var must be set
- Check `.env.local` (local) or Vercel env vars (deployed)

### Payment succeeds but DB not updated

- Check webhook logs: `stripe events tail`
- Verify the `metadata.payment_type` is set correctly on the PaymentIntent
- Check server logs for webhook handler errors

### Duplicate emails

- The webhook handler is idempotent — it checks if payment was already processed
- If you're getting duplicates, check that the idempotency guards are working (look for `wasAlreadyPaid` / `already_processed` in logs)
