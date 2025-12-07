# 🚀 Deployment Guide - Railway

**Official Deployment Platform: Railway**

This project is deployed on Railway. Railway provides persistent server instances that work well with database connections and long-running operations.

---

## Quick Start

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize and deploy
railway init
railway add postgresql
railway up

# Add custom domain
railway domain
```

---

## Complete Documentation

**See:** [`RAILWAY_DEPLOYMENT.md`](./RAILWAY_DEPLOYMENT.md) for comprehensive deployment instructions including:

- ✅ Step-by-step setup
- ✅ Custom domain configuration
- ✅ Environment variables
- ✅ Database migration
- ✅ Subdomain routing
- ✅ Monitoring and logs
- ✅ Troubleshooting
- ✅ Pricing information

---

## Why Railway?

**Railway provides:**
- ✅ Native PostgreSQL support (no connection pooling issues)
- ✅ Zero cold starts (always-on server)
- ✅ Simple subdomain routing
- ✅ Fair pricing ($5-20/month typical)
- ✅ No timeout limits
- ✅ Persistent database connections
- ✅ Better for complex operations (itinerary building, payment processing)

---

## Quick Links

- **Railway Dashboard**: https://railway.app/dashboard
- **Documentation**: [`RAILWAY_DEPLOYMENT.md`](./RAILWAY_DEPLOYMENT.md)
- **Pricing**: https://railway.app/pricing
- **Support**: https://discord.gg/railway

---

**For detailed instructions, see [`RAILWAY_DEPLOYMENT.md`](./RAILWAY_DEPLOYMENT.md)**
