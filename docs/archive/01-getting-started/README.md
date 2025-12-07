# 🚀 Getting Started

Welcome to Walla Walla Travel platform!

---

## ⚡ Quick Start (5 minutes)

### **1. Clone & Install**
```bash
git clone [repository]
cd walla-walla-final
npm install
```

### **2. Environment Setup**
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### **3. Database Setup**
```bash
# Connect to your PostgreSQL database
psql $DATABASE_URL < migrations/schema.sql
psql $DATABASE_URL < migrations/performance-indexes.sql
```

### **4. Run Development Server**
```bash
npm run dev
```

Visit: http://localhost:3000

---

## 📋 Prerequisites

- **Node.js:** 18.x or higher
- **PostgreSQL:** 14.x or higher
- **npm:** 9.x or higher
- **Railway CLI:** (for deployment)

---

## 🔧 Detailed Setup

### **Environment Variables**

Required variables in `.env.local`:

```env
# Database
DATABASE_URL=postgresql://...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Authentication
JWT_SECRET=your-secret-key

# Email (Resend)
RESEND_API_KEY=your-key

# Payments (Stripe)
STRIPE_SECRET_KEY=your-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-key

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key
```

See `.env.example` for complete list.

---

## 🧪 Verify Setup

```bash
# Run tests
npm test

# Check database connection
npm run db:check

# Lint code
npm run lint
```

---

## 🚢 Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

See: `../07-operations/deployment.md` for details.

---

## 📖 Next Steps

1. **[Architecture Overview](../02-architecture/README.md)** - Understand the system
2. **[API Reference](../03-api-reference/README.md)** - Explore APIs
3. **[Development Guide](../04-development/README.md)** - Start building

---

## 🆘 Troubleshooting

**Database connection fails?**
- Check `DATABASE_URL` in `.env.local`
- Verify PostgreSQL is running
- Check network/firewall

**Build errors?**
- Clear `.next` folder: `rm -rf .next`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node version: `node -v`

**Port already in use?**
- Change port: `PORT=3001 npm run dev`
- Kill process: `lsof -ti:3000 | xargs kill`

More help: `../04-development/troubleshooting.md`

---

**Status:** ✅ Complete  
**Last Updated:** November 15, 2025




