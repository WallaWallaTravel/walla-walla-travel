# 📝 Changelog

All notable changes to the Walla Walla Travel project will be documented in this file.

---

## [Unreleased]

### Added
- Offline support infrastructure (PWA manifest, offline storage library)
- Voice inspection roadmap and planning

### Changed
- Documentation structure (consolidated status files, created START_HERE.md)

---

## [0.5.0] - 2025-11-05

### Added
- **Invoicing System** - Complete with hour sync, admin dashboard, customer tip UI
- Database migration for invoices and tour offers
- Automatic invoice numbering (INV-YYYY-0001)
- Hour sync trigger function (time_cards → bookings)
- Admin pending invoices dashboard (`/admin/invoices`)
- Customer final invoice payment page with tip selection (`/payment/final/[booking_id]`)
- Beautiful invoice email template (Resend integration)
- API endpoint: GET `/api/admin/pending-invoices`
- API endpoint: POST `/api/admin/approve-invoice/[booking_id]`

### Fixed
- Hour sync function now correctly uses `driving_hours` and `on_duty_hours`
- Time card schema validation in test scripts
- Database connection issues with Heroku Postgres

### Tested
- Hour sync with 7.5 hour test case ✅
- Full invoicing workflow from booking to payment ✅

---

## [0.4.0] - 2025-11-01

### Added
- **Enhanced Proposal Builder** - Multi-service proposals with flexible pricing
- **Media Library System** - Upload, tag, categorize photos/videos
- **Rate Configuration System** - Centralized pricing management
- Three pricing models: calculated, hourly, flat rate
- Service types: wine tours, airport transfers, local, custom
- Discount system with reasons
- Gratuity configuration (% or fixed)
- Client proposal view with digital signatures
- Multi-step acceptance flow
- Proposal number generation (PROP-YYYY-0001)

### Designed (not yet implemented)
- A/B Testing Dashboard specification
- Competitor Monitoring System specification
- Lead Generation & Outreach System specification
- Social Media Marketing Module specification
- Smart Proposal Generator with AI

### Changed
- Proposal system upgraded from v1.0 to v2.0
- Database schema enhanced with JSONB service objects
- UI completely redesigned with Tailwind CSS

---

## [0.3.0] - 2025-10-31

### Added
- Payment system with Stripe integration
- Multiple payment methods (Card, ACH, Check)
- Dynamic fee calculation
- Optional tip system
- Admin payment settings panel
- Payment intent creation and confirmation

### Changed
- Booking flow now includes payment step
- Admin dashboard shows payment status

---

## [0.2.0] - 2025-10-13

### Added
- **Time Clock & HOS Tracking** - Clock in/out with GPS location
- **Pre-Trip Inspections** - Mobile-optimized checklist with digital signature
- **Post-Trip Inspections** - DVIR generation with defect tracking
- **Driver Portal** - Dark theme, mobile-first dashboard
- Hours of Service (HOS) compliance monitoring
- 10/15/8 hour rules enforcement
- 150-mile short-haul exemption tracking
- Digital signature capture for inspections
- Photo upload for defects

### Changed
- Driver interface completely redesigned for mobile
- Touch targets increased to 48px minimum
- Dark theme as default for driver-facing pages

---

## [0.1.0] - 2025-10-01

### Added
- **Booking System** - Create and manage bookings
- **Calendar View** - Visual booking calendar with color-coded statuses
- **Itinerary Builder** - Drag-and-drop winery ordering with time calculations
- **Vehicle Management** - 3 Mercedes Sprinters (WWTVAN01, WWTVAN02, WWTVAN03)
- **Driver Management** - Driver profiles and assignment
- Database schema with 41 tables (Prisma)
- Basic admin dashboard
- Basic client portal

### Infrastructure
- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- Heroku Postgres database
- Vercel deployment (planned)

---

## Development Setup

### Initial Setup - 2025-09-25
- Project initialization
- Next.js 15 installation
- Database design
- Authentication planning
- UI/UX wireframes

---

## Version Format

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR.MINOR.PATCH**
  - MAJOR: Breaking changes
  - MINOR: New features (backwards compatible)
  - PATCH: Bug fixes (backwards compatible)

---

## Categories

- **Added**: New features
- **Changed**: Changes to existing features
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements
- **Performance**: Performance improvements
- **Tested**: New test coverage

---

## Links

- [Current Status](./CURRENT_STATUS.md)
- [TODO List](./TODO.md)
- [Start Here](./START_HERE.md)
- [API Documentation](./API_DOCUMENTATION.md)

---

**Maintained By:** Development Team  
**Last Updated:** November 5, 2025
