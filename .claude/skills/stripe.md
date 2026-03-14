---
name: stripe
description: Stripe payment patterns, dual-brand setup, webhooks. Use when modifying payment flows, invoices, or Stripe integration.
---

## Dual Brand Architecture
- WWT + NW Touring brands configured in `lib/stripe-brands.ts`
- Each brand has its own Stripe keys and product catalog
- Brand selection happens at booking creation

## Webhook Handling
- Main route: decomposed from 1142→116 lines in `route.ts`
- 3 focused handler files for different event types
- Signature verification on every webhook (skip CSRF)
- Idempotency keys on payment intent creation

## Patterns
- Dispute lifecycle handling (dispute.created → evidence submission → resolution)
- Deposit auto-calculates 50% of subtotal (stops on manual edit)
- Deposit note blank by default

## Security
- All payment routes: `withAuth` + rate limiting
- Never log full card numbers or payment method details
- Stripe signature verification replaces CSRF on webhook routes
