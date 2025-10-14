# 🚗 Walla Walla Travel - Driver Management App

**Mobile-first transportation management system for wine tour operations with FMCSA compliance.**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)]()
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)]()
[![Foundation](https://img.shields.io/badge/foundation-7%2F10-yellow)]()

---

## 🎯 Overview

Walla Walla Travel is a mobile-optimized driver workflow application designed for wine tour transportation companies. It handles the complete driver workflow from clock-in to clock-out, with FMCSA-compliant vehicle inspections, digital signatures, and Hours of Service (HOS) tracking.

**Current Status:** Development phase - foundation complete, ready for feature build-out.

---

## ✨ Key Features

### ✅ Implemented:
- **Cookie-based Authentication** - Secure, httpOnly sessions
- **Mobile-First UI** - 48px touch targets, one-thumb operation, haptic feedback
- **Pre-Trip Inspections** - FMCSA-compliant vehicle checklists
- **Workflow Tracking** - 6-step driver daily workflow
- **Component Library** - Production-ready mobile UI components

### 🚧 In Progress:
- Database integration (PostgreSQL)
- Security hardening (CSRF, rate limiting, password hashing)
- Expanded test coverage
- Error handling improvements

### 📋 Planned:
- Post-Trip Inspections with DVIR
- Digital signature capture
- Unified compliance dashboard
- HOS (Hours of Service) tracking
- Document upload system
- Real-time notifications

---

## 🚀 Quick Start

### Prerequisites:
- Node.js 20+
- npm 10+

### Installation:
```bash
# Navigate to project
cd /Users/temp/walla-walla-final

# Install dependencies
npm install

# Start development server
npm run dev

# Visit: http://localhost:3000/login
```

### Test Credentials:
```
Email: driver@test.com
Password: test123456
```

**For detailed setup instructions, see [docs/SETUP.md](docs/SETUP.md)**

---

## 📱 Mobile Testing

The app is designed for mobile devices. To test on your phone:

1. **Get your computer's IP:**
   ```bash
   # Mac/Linux
   ipconfig getifaddr en0
   ```

2. **Ensure same WiFi network**

3. **Visit on phone:**
   ```
   http://YOUR_IP:3000/login
   ```

---

## 📚 Documentation

### Core Documentation:
- **[MASTER_STATUS.md](MASTER_STATUS.md)** - Current project state (single source of truth)
- **[REVIEW_SUMMARY.md](REVIEW_SUMMARY.md)** - Executive summary & foundation score
- **[CONTEXT_CARD.md](CONTEXT_CARD.md)** - Quick start for new Claude sessions

### Technical Documentation:
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design & decisions
- **[SETUP.md](docs/SETUP.md)** - Installation & running guide
- **[CODE_REVIEW.md](docs/CODE_REVIEW.md)** - Complete technical audit
- **[MOBILE_COMPONENTS.md](docs/MOBILE_COMPONENTS.md)** - Mobile UI component guide
- **[TESTING.md](docs/TESTING.md)** - Testing guide
- **[API.md](docs/API.md)** - API documentation
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Deployment guide
- **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues & solutions

---

## 🏗️ Tech Stack

- **Frontend:** Next.js 15.5.2 (App Router), React 19.1.0
- **Styling:** Tailwind CSS 4
- **Language:** TypeScript 5 (strict mode)
- **Authentication:** Cookie-based sessions
- **Database:** PostgreSQL (in progress)
- **Testing:** Jest 30.1.3, React Testing Library
- **Deployment:** Vercel (planned)

**What we're NOT using:**
- ❌ Supabase (fully removed)
- ❌ Python API
- ❌ External auth providers

---

## 🎨 Mobile UI Components

Built-in mobile-optimized component library:

- **MobileButton** - 48-64px touch targets, haptic feedback
- **MobileCheckbox** - Large, accessible checkboxes
- **MobileInput** - 16px font (prevents iOS zoom)
- **BottomActionBar** - Sticky bottom actions (thumb reach)
- **Design System** - WCAG AAA compliant

**See [docs/MOBILE_COMPONENTS.md](docs/MOBILE_COMPONENTS.md) for details.**

---

## 📊 Project Status

**Foundation Quality:** 7/10

| Category | Score | Status |
|----------|-------|--------|
| Type Safety | 85% | 🟡 Good |
| Test Coverage | 30% | 🔴 Needs work |
| Documentation | 90% | 🟢 Excellent |
| Security | 40% | 🔴 Needs work |
| Performance | 70% | 🟡 Good |

**Verdict:** Solid foundation for development, needs hardening for production.

---

## 🎯 Roadmap

### Phase 1: Database (THIS WEEK)
- Connect PostgreSQL
- Replace mock functions
- Enable real data persistence

### Phase 2: Security (THIS WEEK)
- Password hashing (bcrypt)
- CSRF protection
- Rate limiting
- Security headers

### Phase 3: Error Handling (NEXT WEEK)
- Error boundaries
- Input validation (Zod)
- Logging system

### Phase 4: Testing (NEXT WEEK)
- Server action tests
- Component tests
- 80% coverage goal

### Phase 5: Production (WEEK 3)
- Performance optimization
- Staging deployment
- User acceptance testing
- Production launch

**See [MASTER_STATUS.md](MASTER_STATUS.md) for detailed status.**

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Security tests
npm run test:security
```

---

## 🏗️ Building

```bash
# Production build
npm run build

# Start production server
npm run start
```

**Expected:** Build completes in ~4.5s with 0 errors

---

## 🐛 Troubleshooting

### Port Already in Use
```
⚠ Port 3000 in use, using port 3001 instead
```
**Solution:** Use whatever port Next.js assigns

### Can't Access from Phone
**Solutions:**
- Check same WiFi network
- Disable VPN
- Use computer's IP, not localhost
- Check firewall settings

### Login Doesn't Work
**Check:**
- Correct credentials (driver@test.com / test123456)
- Server is running
- Clear browser cookies

**For more solutions, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)**

---

## 📂 Project Structure

```
/Users/temp/walla-walla-final/
├── app/                    ← Next.js App Router
│   ├── actions/           ← Server actions
│   ├── login/             ← Login page
│   ├── workflow/          ← Driver workflow
│   └── inspections/       ← Vehicle inspections
├── components/
│   └── mobile/            ← Mobile UI library
├── lib/                   ← Utilities
│   ├── auth.ts           ← Authentication
│   └── security.ts       ← Security utilities
├── docs/                  ← Documentation
└── __tests__/             ← Test suite
```

---

## 🔐 Security

### Current Measures:
- ✅ httpOnly cookies (prevents XSS)
- ✅ Input sanitization
- ✅ XSS prevention (DOMPurify)
- ✅ sameSite cookies (CSRF protection)

### Planned Additions:
- 🚧 CSRF tokens
- 🚧 Rate limiting
- 🚧 Password hashing
- 🚧 Security headers
- 🚧 File upload validation

**See [docs/CODE_REVIEW.md](docs/CODE_REVIEW.md) for security audit.**

---

## 🤝 Contributing

This is a private project. For questions or issues, consult:
1. [MASTER_STATUS.md](MASTER_STATUS.md) - Current state
2. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design
3. [docs/CODE_REVIEW.md](docs/CODE_REVIEW.md) - Technical details

---

## 📝 License

Private project - All rights reserved

---

## 🆘 Getting Help

### For Setup Issues:
1. Read [docs/SETUP.md](docs/SETUP.md)
2. Check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
3. Run `npm run build` to see all errors

### For Development:
1. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Understand system design
2. Read [MASTER_STATUS.md](MASTER_STATUS.md) - Check current state
3. Read [docs/CODE_REVIEW.md](docs/CODE_REVIEW.md) - Known issues & gaps

### For New Claude Sessions:
```
Read these 3 docs:
1. /MASTER_STATUS.md
2. /REVIEW_SUMMARY.md
3. /docs/ARCHITECTURE.md

Current phase: [phase you're working on]
```

---

## 🎉 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Tested with [Jest](https://jestjs.io/)

---

**Last Updated:** October 12, 2025  
**Foundation Score:** 7/10  
**Status:** Active Development
