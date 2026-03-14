---
name: email-resend
description: Email templates, Resend configuration, CAN-SPAM compliance. Use when creating or modifying email notifications.
---

## Service
- Provider: Resend
- Transactional + inbound via `in.wallawalla.travel`
- 21 email templates with dark mode CSS (`@media prefers-color-scheme`)

## Templates
- Partner: registration, booking confirmed, payment received
- Customer: booking confirmation, invoice, deposit request
- Admin: contact form alerts, invoice paid notifications
- All templates: `color-scheme` meta tags, CSS class hooks for dark mode
- Outlook compatibility: table-based fallbacks

## CAN-SPAM Compliance
- `List-Unsubscribe` headers on all marketing/notification emails
- Unsubscribe system built and deployed
- Pre-send validation checks

## Retry Logic
- 3 retries at 1s/5s/15s backoff on 429 + 5xx
- Non-retryable errors fail immediately
- Fire-and-forget pattern for non-critical notifications

## Validation
- MX record + disposable domain check on email input routes
