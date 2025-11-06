# 🚀 Walla Walla Travel - Start Here

**Welcome!** This is your single entry point to navigate the project.

---

## 👋 **I'm New Here - Where Do I Start?**

### **First Time Setup:**
1. Read **[README.md](./README.md)** - Project overview
2. Follow **[docs/current/SETUP.md](./docs/current/SETUP.md)** - Installation & running
3. Check **[CURRENT_STATUS.md](./CURRENT_STATUS.md)** - What's complete

### **Starting a New Development Session:**
1. Read **[CURRENT_CONTINUATION_PROMPT.md](./CURRENT_CONTINUATION_PROMPT.md)** - Latest context
2. Check **[TODO.md](./TODO.md)** - Current priorities
3. Review **[CHANGELOG.md](./CHANGELOG.md)** - Recent changes

---

## 🎯 **I Want To...**

### **...Understand the Project**
- **Project Vision:** [docs/PRODUCT_VISION.md](./docs/PRODUCT_VISION.md)
- **Architecture:** [docs/current/DECISIONS.md](./docs/current/DECISIONS.md)
- **Feature List:** [CURRENT_STATUS.md](./CURRENT_STATUS.md)
- **Business Requirements:** [BUSINESS_REQUIREMENTS_UPDATE.md](./BUSINESS_REQUIREMENTS_UPDATE.md)

### **...Build a Feature**
- **API Documentation:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Testing Guide:** [docs/current/TESTING.md](./docs/current/TESTING.md)
- **Contributing Guidelines:** [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Mobile Components:** [docs/current/MOBILE_COMPONENTS.md](./docs/current/MOBILE_COMPONENTS.md)

### **...Deploy or Debug**
- **Deployment:** [DEPLOYMENT-SUMMARY.md](./DEPLOYMENT-SUMMARY.md)
- **Troubleshooting:** [docs/current/TROUBLESHOOTING.md](./docs/current/TROUBLESHOOTING.md)
- **Error Monitoring:** [docs/ERROR_MONITORING_SETUP.md](./docs/ERROR_MONITORING_SETUP.md)
- **Database Issues:** [DATABASE_SETUP_FIXED.md](./DATABASE_SETUP_FIXED.md)

### **...Work on Specific Features**

#### **Invoicing System**
- Status: [docs/completed/INVOICING_COMPLETE.md](./docs/completed/INVOICING_COMPLETE.md)
- Migration: [migrations/add-invoicing-system.sql](./migrations/add-invoicing-system.sql)

#### **Proposal System**
- Overview: [docs/completed/PROPOSAL_SYSTEM_COMPLETE.md](./docs/completed/PROPOSAL_SYSTEM_COMPLETE.md)
- Enhanced Proposals: [docs/PROPOSAL_ENHANCEMENTS_SPEC.md](./docs/PROPOSAL_ENHANCEMENTS_SPEC.md)

#### **Inspections & Compliance**
- Pre-Trip: [docs/completed/COMPLETED_PRETRIP_TDD.md](./docs/completed/COMPLETED_PRETRIP_TDD.md)
- Post-Trip: [docs/completed/COMPLETED_POSTTRIP_TDD.md](./docs/completed/COMPLETED_POSTTRIP_TDD.md)
- Voice Inspections: [docs/planning/VOICE_INSPECTION_ROADMAP.md](./docs/planning/VOICE_INSPECTION_ROADMAP.md)
- FMCSA Compliance: [FMCSA_PASSENGER_COMPLIANCE.md](./FMCSA_PASSENGER_COMPLIANCE.md)

#### **Booking System**
- Calendar: [docs/completed/CALENDAR_VIEW_COMPLETE.md](./docs/completed/CALENDAR_VIEW_COMPLETE.md)
- Booking Form: [docs/completed/BOOKING_FORM_COMPLETE.md](./docs/completed/BOOKING_FORM_COMPLETE.md)
- Itinerary Builder: [docs/completed/ITINERARY_BUILDER_COMPLETE.md](./docs/completed/ITINERARY_BUILDER_COMPLETE.md)

#### **Driver Portal**
- Status: [docs/completed/DRIVER_PORTAL_COMPLETE.md](./docs/completed/DRIVER_PORTAL_COMPLETE.md)
- Time Clock: [docs/completed/TIME_CLOCK_COMPLETE.md](./docs/completed/TIME_CLOCK_COMPLETE.md)

### **...Plan Future Work**
- **Voice Inspections:** [docs/planning/VOICE_INSPECTION_ROADMAP.md](./docs/planning/VOICE_INSPECTION_ROADMAP.md)
- **Growth Systems:** [docs/GROWTH_SYSTEMS_OVERVIEW.md](./docs/GROWTH_SYSTEMS_OVERVIEW.md)
- **A/B Testing:** [docs/AB_TESTING_SOCIAL_MEDIA.md](./docs/AB_TESTING_SOCIAL_MEDIA.md)
- **Competitor Monitoring:** [docs/COMPETITOR_MONITORING_SYSTEM.md](./docs/COMPETITOR_MONITORING_SYSTEM.md)

---

## 📂 **Documentation Structure**

```
Root Level
├── START_HERE.md                    ← You are here!
├── README.md                        ← Project overview
├── CURRENT_STATUS.md                ← What's built, what's next
├── CURRENT_CONTINUATION_PROMPT.md   ← Session handoff
├── API_DOCUMENTATION.md             ← API reference
├── CHANGELOG.md                     ← Version history
└── TODO.md                          ← Current tasks

docs/
├── current/                         ← Active development
│   ├── SETUP.md
│   ├── TESTING.md
│   ├── TROUBLESHOOTING.md
│   ├── DECISIONS.md
│   └── MOBILE_COMPONENTS.md
├── completed/                       ← Finished features
│   ├── INVOICING_COMPLETE.md
│   ├── PROPOSAL_SYSTEM_COMPLETE.md
│   └── ...
├── planning/                        ← Future features
│   ├── VOICE_INSPECTION_ROADMAP.md
│   └── ...
└── archive/                         ← Historical docs
    └── ...
```

---

## 🔑 **Key URLs**

### **Local Development:**
```
Server:              http://localhost:3000
Admin Dashboard:     http://localhost:3000/admin/dashboard
Driver Portal:       http://localhost:3000/driver-portal/dashboard
Inspections:         http://localhost:3000/inspections/pre-trip
Time Clock:          http://localhost:3000/time-clock/clock-in
Calendar:            http://localhost:3000/calendar
```

### **Database:**
```bash
# Connect to Heroku Postgres
heroku pg:psql -a walla-walla-travel

# Get connection string
heroku config:get DATABASE_URL -a walla-walla-travel
```

---

## ⚡ **Quick Commands**

```bash
# Development
npm run dev                          # Start dev server
npm run build                        # Production build
npm test                             # Run tests

# Database
npm run db:verify                    # Check database connection
heroku pg:psql -a walla-walla-travel # Connect to database

# Git
git status                           # Check changes
git add .                            # Stage all changes
git commit -m "message"              # Commit
git push origin main                 # Push to GitHub
```

---

## 🆘 **Common Issues**

| Problem | Solution |
|---------|----------|
| Build fails | Check [docs/current/TROUBLESHOOTING.md](./docs/current/TROUBLESHOOTING.md) |
| Database connection error | See [DATABASE_SETUP_FIXED.md](./DATABASE_SETUP_FIXED.md) |
| Port 3000 in use | Run `lsof -ti:3000 \| xargs kill -9` |
| Environment variables | Copy `.env.local.example` to `.env.local` |

---

## 📞 **Project Info**

**Company:** Walla Walla Travel  
**USDOT:** 3603851  
**Location:** Walla Walla, WA  
**Fleet:** 3 Mercedes Sprinter vans (11-14 passengers)

**Tech Stack:**
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Postgres (Heroku)
- Stripe (payments)
- Resend (email)

---

## 📊 **Project Status at a Glance**

**Overall Progress:** ~50% Complete

✅ **Complete:**
- Booking system with calendar
- Proposal builder & client view
- Invoicing with email
- Driver portal & inspections
- Time tracking & HOS compliance
- Payment processing (Stripe)
- Media library
- Rate configuration

🚧 **In Progress:**
- Offline support for inspections
- Voice interface for inspections

🔜 **Planned:**
- Driver tour acceptance
- Interactive lunch ordering
- A/B testing dashboard
- Competitor monitoring

---

**Last Updated:** November 5, 2025  
**For Detailed Status:** See [CURRENT_STATUS.md](./CURRENT_STATUS.md)

---

💡 **Tip:** Bookmark this page - it's your compass for navigating the project!

