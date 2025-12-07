# 🚂 Railway Deployment Guide

## Why Railway?

Railway is the **optimal deployment solution** for Walla Walla Travel because:

- ✅ **Native PostgreSQL support** - No connection pooling headaches
- ✅ **Zero cold starts** - Always-on server, not serverless
- ✅ **Simple subdomain routing** - Easy custom domains
- ✅ **Fair pricing** - $5/month starting, scales with usage
- ✅ **No 10-second timeout limits** - Perfect for complex itinerary calculations
- ✅ **Persistent connections** - Ideal for your database-heavy operations

---

## 📋 Prerequisites

1. **Railway Account**
   - Sign up at https://railway.app
   - Free $5 credit to start

2. **Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

3. **GitHub Repository** (optional but recommended)
   - Push your code to GitHub for automatic deployments

---

## 🚀 Quick Deployment (5 Minutes)

### Method 1: CLI Deployment (Fastest)

```bash
# 1. Login to Railway
railway login

# 2. Initialize project (from your project directory)
cd /Users/temp/walla-walla-final
railway init

# 3. Provision PostgreSQL database
railway add postgresql

# 4. Deploy
railway up

# 5. Generate domain
railway domain
```

**That's it!** Your app is live at `https://your-project.up.railway.app`

---

### Method 2: GitHub Integration (Recommended for Production)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Railway deployment"
   git branch -M main
   git remote add origin https://github.com/yourusername/walla-walla-travel.git
   git push -u origin main
   ```

2. **Connect to Railway**
   - Go to https://railway.app/new
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Railway auto-detects Next.js and configures everything

3. **Add PostgreSQL**
   - In your project, click "New"
   - Select "Database"
   - Choose "PostgreSQL"
   - Railway automatically connects it via `DATABASE_URL`

4. **Deploy**
   - Railway automatically deploys on every push to `main`

---

## 🔧 Environment Variables

### Required Variables

Set these in Railway Dashboard → Variables:

```bash
# Database (auto-provided if using Railway PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# Next.js
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-domain.up.railway.app

# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# JWT Secret
JWT_SECRET=your_random_secret_here

# Optional: OpenAI API
OPENAI_API_KEY=your_openai_api_key
```

### Railway-Specific Variables (Auto-Set)

Railway automatically provides:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Port your app should listen on (usually 3000)
- `RAILWAY_ENVIRONMENT` - Current environment (production/staging)

---

## 🌐 Custom Domain Setup

### Step 1: Add Domain in Railway

1. Go to your project settings
2. Click "Domains"
3. Click "Custom Domain"
4. Enter your domain: `wallawalla.travel`

### Step 2: Configure DNS

Add these records to your DNS provider (e.g., Cloudflare, Namecheap):

**For Root Domain (wallawalla.travel):**
```
Type: CNAME
Name: @
Value: your-project.up.railway.app
```

**For Subdomains:**
```
Type: CNAME
Name: staff
Value: your-project.up.railway.app

Type: CNAME
Name: driver
Value: your-project.up.railway.app

Type: CNAME
Name: business
Value: your-project.up.railway.app
```

### Step 3: Update Middleware

The middleware in `middleware.ts` will handle subdomain routing automatically:
- `wallawalla.travel` → Main site
- `staff.wallawalla.travel` → Admin/Staff portal
- `driver.wallawalla.travel` → Driver portal
- `business.wallawalla.travel` → Business portal

---

## 🗄️ Database Migration

### Option 1: Use Existing Database (Recommended)

If you already have a PostgreSQL database (Neon, Supabase, etc.):

```bash
# Set your existing DATABASE_URL in Railway
railway variables set DATABASE_URL="your_existing_connection_string"
```

### Option 2: Use Railway PostgreSQL (New Project)

```bash
# Add PostgreSQL to Railway
railway add postgresql

# Railway automatically connects it via DATABASE_URL

# Run migrations
railway run npm run db:migrate
```

### Running Migrations

```bash
# From your local machine
railway run psql -f migrations/000-create-users-table.sql
railway run psql -f migrations/001-create-bookings-table.sql
# ... etc

# Or connect directly
railway connect postgresql
# Then run your SQL files
```

---

## 📊 Monitoring & Logs

### View Logs

```bash
# Real-time logs
railway logs

# Or in Railway dashboard
# Go to your service → Deployments → Click latest deployment
```

### Metrics

Railway provides built-in metrics:
- CPU usage
- Memory usage
- Network traffic
- Request count

Access via: Project → Metrics

---

## 💰 Pricing

### Free Tier
- $5 credit per month
- Perfect for development/testing
- No credit card required

### Hobby Plan ($5/month)
- $5 included usage
- $0.000231/GB-hour for memory
- $0.000463/vCPU-hour for CPU
- ~$10-20/month for typical usage

### Pro Plan ($20/month)
- $20 included usage
- Same rates, more included
- Priority support
- Better for production

**Estimated costs for Walla Walla Travel:**
- Small operation: ~$10-15/month
- Growing business: ~$20-30/month
- High traffic: ~$50+/month

---

## 🔄 CI/CD Pipeline

Railway automatically:
1. ✅ Detects changes in GitHub
2. ✅ Runs `npm run build`
3. ✅ Deploys new version
4. ✅ Zero-downtime deployment
5. ✅ Automatic rollback on failure

### Custom Build Commands

Edit in `railway.toml`:
```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm run build && npm run db:migrate"

[deploy]
startCommand = "npm start"
```

---

## 🐛 Troubleshooting

### Build Fails

```bash
# Check build logs
railway logs --build

# Common issues:
# 1. Missing dependencies
npm install --save <missing-package>

# 2. TypeScript errors
npm run type-check

# 3. Environment variables
railway variables
```

### App Won't Start

```bash
# Check runtime logs
railway logs

# Common fixes:
# 1. Check PORT binding
# Railway provides PORT env var, Next.js uses it automatically

# 2. Database connection
railway variables | grep DATABASE_URL

# 3. Check package.json start script
"scripts": {
  "start": "next start"
}
```

### Database Connection Issues

```bash
# Test connection
railway connect postgresql

# Or from code:
railway run node -e "const { Pool } = require('pg'); const pool = new Pool(); pool.query('SELECT NOW()', (err, res) => { console.log(err, res); pool.end(); });"
```

---

## 🔐 Security Best Practices

### 1. Environment Variables
- ✅ Set sensitive values in Railway dashboard (never commit)
- ✅ Use Railway's built-in secrets management
- ✅ Rotate keys regularly

### 2. Database Security
- ✅ Railway PostgreSQL has automatic backups
- ✅ Use connection pooling for high traffic
- ✅ Enable SSL (Railway does this automatically)

### 3. API Keys
- ✅ Store in Railway variables
- ✅ Use different keys for staging/production
- ✅ Monitor usage in respective dashboards (Stripe, Resend, etc.)

---

## 📱 Testing Before Production

### Create Staging Environment

```bash
# Create new Railway project for staging
railway init --name walla-walla-staging

# Add PostgreSQL
railway add postgresql

# Deploy
railway up

# Set different environment variables
railway variables set NODE_ENV=staging
```

**Best Practice:**
- `main` branch → Production Railway project
- `staging` branch → Staging Railway project
- Test all changes in staging first

---

## 🚀 Going Live Checklist

- [ ] Deploy to Railway
- [ ] Add custom domain (wallawalla.travel)
- [ ] Configure all subdomains
- [ ] Set all environment variables
- [ ] Run database migrations
- [ ] Test all critical paths:
  - [ ] Booking creation
  - [ ] Itinerary builder
  - [ ] Payment processing
  - [ ] Email sending
  - [ ] Driver portal
  - [ ] Admin dashboard
- [ ] Set up monitoring/alerts
- [ ] Update OpenAPI spec URL in Custom GPT
- [ ] Test OpenAI integration
- [ ] Configure SSL (automatic on Railway)
- [ ] Set up automatic backups (enable in PostgreSQL settings)

---

## 📞 Support

### Railway Support
- **Documentation**: https://docs.railway.app
- **Discord**: https://discord.gg/railway
- **Email**: team@railway.app

### Quick Links
- Dashboard: https://railway.app/dashboard
- Status: https://status.railway.app
- Pricing: https://railway.app/pricing

---

## 🎯 Next Steps

1. **Deploy to Railway** (follow Quick Deployment above)
2. **Set up custom domain** (wallawalla.travel)
3. **Configure environment variables**
4. **Run database migrations**
5. **Test OpenAPI endpoint** (https://wallawalla.travel/api/openapi)
6. **Update Custom GPT** with production URL
7. **Launch!** 🚀

---

**Your app will be production-ready in ~10 minutes with Railway!**




