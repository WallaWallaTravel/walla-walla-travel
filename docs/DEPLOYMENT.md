# Deployment Guide - Vercel

**Official Deployment Platform: Vercel**

This project is deployed on Vercel, the platform built by the creators of Next.js. Vercel provides the best possible experience for Next.js applications with zero-configuration deployment.

## Quick Deploy

### 1. Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select `WallaWallaTravel/walla-walla-travel`
4. Vercel auto-detects Next.js - no configuration needed

### 2. Configure Environment Variables

Add the following environment variables in the Vercel dashboard:

**Required:**
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-32-character-secret
SESSION_SECRET=your-32-character-secret
CSRF_SECRET=your-32-character-secret
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Optional:**
```
OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=...
POSTMARK_API_KEY=...
RESEND_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
```

### 3. Deploy

Click "Deploy" - Vercel handles everything automatically.

## Features

### Automatic Deployments

- **Production:** Every push to `main` branch
- **Preview:** Every pull request gets a unique URL
- **Rollback:** One-click rollback to any previous deployment

### Custom Domain

1. Go to Project Settings → Domains
2. Add your domain (e.g., `wallawalla.travel`)
3. Update DNS records as instructed
4. SSL is automatic

### Environment Variables

Manage in Project Settings → Environment Variables:
- **Production:** Used for main branch deployments
- **Preview:** Used for PR preview deployments
- **Development:** Used for `vercel dev` locally

## Why Vercel?

**Vercel provides:**
- Zero-configuration Next.js deployment
- Automatic HTTPS/SSL
- Global CDN (90+ edge locations)
- Automatic scaling
- Preview deployments for every PR
- Built-in analytics
- DDoS protection
- 99.99% uptime SLA (Enterprise)

## Monitoring

### Built-in Tools
- **Analytics:** Project → Analytics tab
- **Logs:** Project → Deployments → View Logs
- **Speed Insights:** Real user performance data

### Optional Integrations
- Sentry (error tracking)
- DataDog (APM)
- LogDNA (logging)

## Commands

```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Deploy from CLI
vercel

# Deploy to production
vercel --prod

# Link to existing project
vercel link

# Pull environment variables locally
vercel env pull .env.local
```

## Troubleshooting

### Build Fails
1. Check build logs in Vercel dashboard
2. Ensure all required env vars are set
3. Verify `npm run build` works locally

### Function Timeouts
- Hobby: 10s limit
- Pro: 60s limit
- Enterprise: 900s limit

For long-running operations, consider background jobs or edge functions.

### Preview Deployment Issues
- Ensure PR is from the same repo (not a fork)
- Check that environment variables are set for Preview

## Useful Links

- **Dashboard:** https://vercel.com/dashboard
- **Documentation:** https://vercel.com/docs
- **Next.js on Vercel:** https://vercel.com/docs/frameworks/nextjs
- **Support:** https://vercel.com/support
