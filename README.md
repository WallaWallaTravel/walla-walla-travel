# Walla Walla Travel - Driver Management System

Mobile-first transportation management system for wine tour operations.

**USDOT:** 3603851 | **Status:** Active Development | **Last Updated:** October 13, 2025

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Verify database connection
npm run db:verify
```

**Visit:** http://localhost:3000/time-clock/dashboard

---

## 📊 Current Status

### ✅ Completed (Phases A, B, C)
- **Database:** Heroku Postgres configured with 8 tables
- **Mobile Components:** 5 production-ready components
- **Time Clock UI:** Clock in page + unified dashboard
- **Compliance:** FMCSA passenger carrier rules implemented

### 🚧 In Progress
- Backend APIs to connect UI to database
- Clock out page with digital signature
- HOS visual dashboard
- Distance tracking (150-mile exemption)

**Full status:** See `PROJECT_STATUS.md`

---

## 🎯 Project Goals

Build a mobile-first driver management system that:
- ✅ Tracks hours of service (10 driving / 15 on-duty / 8 off-duty)
- ✅ Monitors 150 air-mile exemption (8-day rule)
- ✅ Manages pre-trip and post-trip inspections
- ✅ Provides digital signature capture
- ✅ Generates compliance reports
- 🚧 Creates PDF time cards
- 🚧 Tracks GPS distance from base

---

## 📱 Pages Available

1. **Unified Dashboard** - `/time-clock/dashboard`
   - Today's status, compliance overview, quick actions
   
2. **Clock In** - `/time-clock/clock-in`
   - Driver/vehicle selection, GPS capture, compliance reminders
   
3. **Pre-Trip Inspection** - `/inspections/pre-trip`
   - Mobile-optimized inspection checklist
   
4. **Post-Trip Inspection** - `/inspections/post-trip`
   - End-of-day vehicle check + DVIR

---

## 🎨 Mobile Components

```tsx
import {
  TouchButton,
  BottomActionBar,
  SignatureCanvas,
  MobileCard,
  AlertBanner,
} from '@/components/mobile';
```

All components optimized for:
- Touch targets ≥ 48px (WCAG compliance)
- One-thumb usability
- Haptic feedback
- Safe area insets (notch, home indicator)

---

## 🗂️ Fleet & Drivers

### Vehicles
- **Sprinter 1:** Mercedes-Benz Sprinter 2025 (11 passengers)
- **Sprinter 2:** Mercedes-Benz Sprinter 2025 (14 passengers)
- **Sprinter 3:** Mercedes-Benz Sprinter 2025 (14 passengers)

### Drivers
- Owner (owner@wallawallatravel.com)
- Eric Critchlow (eric@wallawallatravel.com)
- Janine Bergevin (janine@wallawallatravel.com)

---

## 📋 FMCSA Compliance

### Passenger Carrier Rules
- **Max Driving:** 10 hours per day
- **Max On-Duty:** 15 hours per day
- **Min Off-Duty:** 8 consecutive hours
- **Weekly Limits:** 60 hours / 7 days (or 70 hours / 8 days)

### 150 Air-Mile Exemption
- Can use simple time cards instead of ELD
- Must stay within 150 air-miles of base
- If exceed 150 miles > 8 days in 30-day period → must use ELD

---

## 🗄️ Database

**Platform:** Heroku Postgres  
**App:** walla-walla-travel

### Tables
- `users` - Drivers
- `vehicles` - Fleet
- `time_cards` - Daily time tracking
- `daily_trips` - Distance tracking
- `monthly_exemption_status` - 150-mile rule tracking
- `weekly_hos` - Hours of service
- `company_info` - USDOT #3603851
- `inspections` - Vehicle inspections

### Setup
```bash
npm run db:setup    # Apply schema
npm run db:verify   # Verify setup
```

---

## 🔧 Configuration

### Environment Variables
Create `.env.local` with:
```
DATABASE_URL="postgres://..."
```

Get from Heroku:
```bash
heroku config:get DATABASE_URL -a walla-walla-travel
```

---

## 📖 Documentation

**Start Here:**
- `PROJECT_STATUS.md` - Current project status
- `HANDOFF_PROMPT.md` - For starting new Claude chats
- `PHASES_ABC_COMPLETE.md` - Detailed completion status

**Guides:**
- `IMPLEMENTATION_COMPLETE_GUIDE.md` - Step-by-step implementation
- `DATABASE_SETUP_FIXED.md` - Database configuration
- `FMCSA_COMPLIANCE_GUIDE.md` - Passenger carrier compliance

**Troubleshooting:**
- `SSL_FIX.md` - Database connection issues

---

## 🎯 Next Steps

1. **Build Backend APIs** - Connect UI to database
2. **Clock Out Page** - With signature and hour calculation
3. **HOS Dashboard** - Visual compliance tracking
4. **Distance Tracking** - GPS waypoints for 150-mile rule
5. **PDF Generation** - Time cards and reports

---

## 🚀 Deployment

**Platform:** Vercel  
**Database:** Heroku Postgres  
**Repository:** (To be initialized)

```bash
# Initialize Git
chmod +x setup-github.sh
./setup-github.sh

# Create repo at: https://github.com/WallaWallaTravel/walla-walla-travel
# Then push
```

---

## 🆘 Need Help?

**Starting a new Claude chat?**
1. Copy contents of `HANDOFF_PROMPT.md`
2. Paste into new chat
3. Claude will read the project files and continue where you left off

**Questions?**
- Check `PROJECT_STATUS.md` for current state
- Run `npm run db:verify` to test database
- Check `.env.local` for configuration

---

## 📞 Contact

**Company:** Walla Walla Travel  
**USDOT:** 3603851  
**Location:** Walla Walla, WA  
**GitHub:** WallaWallaTravel

---

**Built with:** Next.js 15, React 19, TypeScript, Tailwind CSS, Heroku Postgres  
**License:** Private (Business Application)
