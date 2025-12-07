# 🚂 Railway Deployment Guide

## Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

## Step 2: Login to Railway

```bash
railway login
```

This will open a browser window to authenticate.

## Step 3: Initialize Railway Project

```bash
cd /Users/temp/walla-walla-final
railway init
```

**When prompted:**
- Select: "Create new project"
- Name: "walla-walla-travel"

## Step 4: Add PostgreSQL Database

```bash
railway add
```

**Select:** PostgreSQL

This will provision a PostgreSQL database and automatically set environment variables.

## Step 5: Set Environment Variables

Railway will auto-set `DATABASE_URL`. You need to add others:

```bash
# Set your environment variables
railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)
railway variables set NEXTAUTH_URL=https://walla-walla-travel.up.railway.app
railway variables set NODE_ENV=production

# Add your other variables
railway variables set RESEND_API_KEY=your_resend_key
railway variables set STRIPE_SECRET_KEY=your_stripe_key
railway variables set GOOGLE_MAPS_API_KEY=your_google_key
```

**Or use the Railway dashboard:**
- Go to https://railway.app/dashboard
- Click your project
- Go to "Variables" tab
- Add all your `.env` variables

## Step 6: Run Database Migrations

```bash
# Connect to Railway database
railway run npm run db:migrate
```

**Or manually run migrations:**
```bash
# Get database URL
railway variables

# Copy DATABASE_URL and run migrations locally
DATABASE_URL="postgresql://..." npm run db:migrate
```

## Step 7: Deploy!

```bash
railway up
```

This will:
- Build your Next.js app
- Upload to Railway
- Deploy to production
- Give you a URL like: `https://walla-walla-travel.up.railway.app`

## Step 8: Test Your OpenAPI Endpoint

Once deployed, visit:
```
https://walla-walla-travel.up.railway.app/api/openapi
```

**You should see the full JSON spec!** 🎉

## Step 9: Set Up Custom Domain (Optional)

In Railway dashboard:
1. Go to Settings → Domains
2. Click "Add Domain"
3. Enter: `wallawalla.travel`
4. Follow DNS instructions
5. Add subdomains:
   - `staff.wallawalla.travel`
   - `driver.wallawalla.travel`
   - `business.wallawalla.travel`

## Step 10: Create Your Custom GPT

Now that your API is live:
1. Go to https://chat.openai.com/gpts/editor
2. Click "Configure" → "Actions" → "Import from URL"
3. Enter: `https://walla-walla-travel.up.railway.app/api/openapi`
4. **IT WILL WORK!** ✨

---

## ⏰ Setting Up Cron Jobs

Railway doesn't have built-in cron like some platforms. Use one of these options:

### Option 1: cron-job.org (Recommended - Free)

1. Go to https://cron-job.org
2. Create a free account
3. Add a new cron job:
   - **URL:** `https://walla-walla-travel.up.railway.app/api/cron/send-reminders`
   - **Schedule:** Every hour (`0 * * * *`)
   - **Method:** POST
   - **Headers:** Add `Authorization: Bearer YOUR_CRON_SECRET`
4. Set `CRON_SECRET` in Railway variables

### Option 2: Railway Cron Service

Railway offers a cron service as a separate project:

```bash
# Create a new Railway service for cron
railway init --name walla-walla-cron

# Use this Dockerfile:
# FROM alpine
# RUN apk add --no-cache curl
# CMD while true; do curl -X POST https://walla-walla-travel.up.railway.app/api/cron/send-reminders -H "Authorization: Bearer $CRON_SECRET"; sleep 3600; done
```

### Option 3: GitHub Actions (Free)

Add to `.github/workflows/cron.yml`:
```yaml
name: Cron Jobs
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger reminder emails
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/send-reminders \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

---

## 🔄 Future Deployments

After initial setup, deploying updates is simple:

```bash
# Make your changes, then:
railway up
```

Or connect to GitHub:
```bash
railway link
```

Then every `git push` auto-deploys! 🚀

---

## 💰 Pricing

- **Free**: $5 credit per month (enough for testing)
- **Developer**: $5/month (5GB RAM, 100GB storage)
- **Hobby**: ~$10-20/month (typical usage)

**You only pay for what you use.**

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Check logs
railway logs
```

### Database Connection Issues
```bash
# Verify DATABASE_URL is set
railway variables

# Test connection
railway run npm run db:verify
```

### Environment Variables Missing
```bash
# List all variables
railway variables

# Set missing ones
railway variables set KEY=value
```

---

## 📊 Monitoring

Railway dashboard shows:
- ✅ Deployments
- ✅ Logs (real-time)
- ✅ Metrics (CPU, RAM, Network)
- ✅ Database stats

---

## 🎯 What You Get

✅ Full Next.js app deployed
✅ PostgreSQL database included
✅ All API endpoints working
✅ No cold starts
✅ Real-time logs
✅ Automatic HTTPS
✅ Easy rollbacks
✅ GitHub integration

**Your OpenAPI endpoint will be live and ready for ChatGPT integration!** 🚀

