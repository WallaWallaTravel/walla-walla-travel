# Walla Walla Travel - Current Architecture Documentation

**Generated:** October 17, 2025
**Purpose:** Comprehensive audit of current system architecture
**Status:** Production System (Active)

---

## Executive Summary

Walla Walla Travel is a mobile-first transportation management system for wine tour operations. The system manages driver workflows, vehicle inspections, time tracking, and FMCSA compliance for passenger carrier operations.

**Current Status:**
- ✅ **Production Deployed:** https://walla-walla-final.vercel.app
- ✅ **Database:** Heroku Postgres (8 tables, 313 lines in db.ts)
- ✅ **Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS
- ⚠️ **Technical Debt:** Large monolithic components, scattered type definitions, minimal validation

---

## Technology Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Mobile:** Touch-optimized components (≥48px touch targets)

### Backend
- **API:** Next.js API Routes (35 endpoints)
- **Database:** Heroku Postgres
- **ORM:** Raw SQL queries via pg Pool
- **Authentication:** Cookie-based sessions
- **Deployment:** Vercel

### Database
- **Platform:** Heroku Postgres
- **Connection:** pg Pool (max 20 connections)
- **Tables:** 8 core tables (users, vehicles, time_cards, inspections, etc.)

---

## Project Structure

```
/Users/temp/walla-walla-final/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Auth routes
│   ├── admin/dashboard/         # Supervisor dashboard (605 lines)
│   ├── driver-portal/           # Driver features
│   ├── inspections/             # Inspection forms
│   │   ├── pre-trip/           # PreTripInspectionClient.tsx (518 lines)
│   │   └── post-trip/          # PostTripInspectionClient.tsx (828 lines)
│   ├── workflow/                # Main driver workflow
│   │   ├── page.tsx            # ⚠️ LARGEST FILE (1178 lines)
│   │   ├── daily/              # DailyWorkflowClient.tsx (452 lines)
│   │   └── client-notes/       # ClientNotesClient.tsx (407 lines)
│   ├── time-clock/              # Time tracking pages
│   ├── api/                     # API routes (35 endpoints)
│   │   ├── auth/               # Authentication APIs
│   │   ├── workflow/           # Time clock & workflow APIs
│   │   ├── inspections/        # Inspection APIs
│   │   ├── vehicles/           # Vehicle management APIs
│   │   ├── admin/              # Admin/supervisor APIs
│   │   └── driver/             # Driver-specific APIs
│   └── actions/                 # Server actions
├── lib/                         # Utilities & integrations
│   ├── db.ts                   # Database queries (313 lines)
│   ├── logger.ts               # Logging system (360 lines)
│   ├── api-client.ts           # API client (333 lines)
│   ├── hos-config.ts           # FMCSA HOS rules (180 lines)
│   ├── admin-auth.ts           # Admin authentication (174 lines)
│   ├── auth.ts                 # User authentication (136 lines)
│   ├── security.ts             # Security utilities (91 lines)
│   └── session.ts              # Session management (85 lines)
├── components/                  # Reusable UI components
│   └── mobile/                 # Mobile-optimized components
├── migrations/                  # Database migrations (8 files)
├── scripts/                     # Utility scripts
├── docs/                        # Documentation (17 files)
├── __tests__/                   # Test files
└── middleware.ts               # Route protection (1036 lines)
```

---

## Routes & Pages

### User Pages (48 total pages)
| Route | File | Purpose |
|-------|------|---------|
| `/` | app/page.tsx | Landing page |
| `/login` | app/login/page.tsx | User login (165 lines) |
| `/auth` | app/auth/page.tsx | Alternative auth page |
| `/workflow` | app/workflow/page.tsx | ⚠️ **Main dashboard (1178 lines)** |
| `/workflow/daily` | app/workflow/daily/page.tsx | Daily workflow |
| `/workflow/client-notes` | app/workflow/client-notes/page.tsx | Client notes (340 lines) |
| `/admin/dashboard` | app/admin/dashboard/page.tsx | Supervisor dashboard (605 lines) |
| `/inspections/pre-trip` | app/inspections/pre-trip/page.tsx | Pre-trip inspection |
| `/inspections/post-trip` | app/inspections/post-trip/page.tsx | Post-trip inspection |
| `/time-clock/dashboard` | app/time-clock/dashboard/page.tsx | Time clock UI (299 lines) |
| `/time-clock/clock-in` | app/time-clock/clock-in/page.tsx | Clock in page (257 lines) |
| `/driver-portal/documents` | app/driver-portal/documents/page.tsx | Document access |

### API Routes (35 endpoints)
| Endpoint | File | Purpose | Validation |
|----------|------|---------|------------|
| `POST /api/auth/login` | app/api/auth/login/route.ts | User login | ❌ Minimal |
| `POST /api/auth/logout` | app/api/auth/logout/route.ts | User logout | ✅ Session |
| `GET /api/auth/profile` | app/api/auth/profile/route.ts | Get user profile | ✅ Session |
| `GET /api/auth/verify` | app/api/auth/verify/route.ts | Verify session | ✅ Session |
| `POST /api/workflow/clock` | app/api/workflow/clock/route.ts | Clock in/out | ⚠️ Partial |
| `GET /api/workflow/clock` | app/api/workflow/clock/route.ts | Get clock status | ✅ Session |
| `GET /api/workflow/status` | app/api/workflow/status/route.ts | Workflow status | ✅ Session |
| `POST /api/workflow/breaks` | app/api/workflow/breaks/route.ts | Record breaks | ❌ None |
| `GET /api/workflow/schedule` | app/api/workflow/schedule/route.ts | Get schedule | ✅ Session |
| `GET /api/workflow/daily` | app/api/workflow/daily/route.ts | Daily workflow | ✅ Session |
| `GET /api/workflow/hos` | app/api/workflow/hos/route.ts | Hours of service | ✅ Session |
| `POST /api/time-clock/clock-in` | app/api/time-clock/clock-in/route.ts | Clock in | ⚠️ Basic |
| `POST /api/time-clock/clock-out` | app/api/time-clock/clock-out/route.ts | Clock out | ⚠️ Basic |
| `GET /api/time-clock/today` | app/api/time-clock/today/route.ts | Today's status | ✅ Session |
| `GET /api/time-clock/hos` | app/api/time-clock/hos/route.ts | HOS tracking | ✅ Session |
| `POST /api/inspections/pre-trip` | app/api/inspections/pre-trip/route.ts | Submit pre-trip | ❌ None |
| `GET /api/inspections/pre-trip` | app/api/inspections/pre-trip/route.ts | Get pre-trip | ✅ Session |
| `POST /api/inspections/post-trip` | app/api/inspections/post-trip/route.ts | Submit post-trip | ❌ None |
| `GET /api/inspections/post-trip` | app/api/inspections/post-trip/route.ts | Get post-trip | ✅ Session |
| `POST /api/inspections/dvir` | app/api/inspections/dvir/route.ts | Submit DVIR | ❌ None |
| `GET /api/inspections/history` | app/api/inspections/history/route.ts | Inspection history | ✅ Session |
| `GET /api/vehicles` | app/api/vehicles/route.ts | List vehicles | ✅ Session |
| `GET /api/vehicles/[id]` | app/api/vehicles/[id]/route.ts | Get vehicle | ✅ Session |
| `GET /api/vehicles/assigned` | app/api/vehicles/assigned/route.ts | Assigned vehicle | ✅ Session |
| `GET /api/vehicles/available` | app/api/vehicles/available/route.ts | Available vehicles | ✅ Session |
| `GET /api/vehicles/documents` | app/api/vehicles/documents/route.ts | Vehicle docs | ✅ Session |
| `POST /api/vehicles/[id]/odometer` | app/api/vehicles/[id]/odometer/route.ts | Update odometer | ❌ None |
| `GET /api/drivers` | app/api/drivers/route.ts | List drivers | ✅ Admin |
| `POST /api/driver/client-pickup` | app/api/driver/client-pickup/route.ts | Record pickup | ❌ None |
| `POST /api/driver/client-dropoff` | app/api/driver/client-dropoff/route.ts | Record dropoff | ❌ None |
| `GET /api/admin/dashboard` | app/api/admin/dashboard/route.ts | Dashboard data | ✅ Admin |
| `POST /api/admin/assign-vehicle` | app/api/admin/assign-vehicle/route.ts | Assign vehicle | ✅ Admin |
| `POST /api/admin/migrate-inspections` | app/api/admin/migrate-inspections/route.ts | Data migration | ✅ Admin |
| `POST /api/emergency/supervisor-help` | app/api/emergency/supervisor-help/route.ts | Emergency contact | ❌ None |
| `GET /api/health` | app/api/health/route.ts | Health check | ✅ Public |

---

## Database Schema

### Tables (8 core tables)

#### 1. users
Core user/driver information
```sql
- id (PRIMARY KEY)
- email (UNIQUE)
- password_hash
- name
- role (driver, admin, supervisor)
- is_active
- last_login
- created_at, updated_at
```

#### 2. vehicles
Fleet management
```sql
- id (PRIMARY KEY)
- vehicle_number (UNIQUE)
- make, model, year
- vin, license_plate
- capacity, current_mileage
- is_active, status
- defect_notes, defect_reported_at, defect_reported_by
- created_at, updated_at
```

#### 3. time_cards
Driver time tracking
```sql
- id (PRIMARY KEY)
- driver_id (FK → users)
- vehicle_id (FK → vehicles, nullable for non-driving shifts)
- date
- clock_in_time, clock_out_time
- work_reporting_location, work_reporting_lat, work_reporting_lng
- on_duty_hours
- driver_signature, signature_timestamp
- status (on_duty, completed, auto_closed)
- notes
- created_at, updated_at
```

#### 4. inspections
Vehicle inspection records
```sql
- id (PRIMARY KEY)
- driver_id (FK → users)
- vehicle_id (FK → vehicles)
- time_card_id (FK → time_cards, nullable)
- type (pre_trip, post_trip)
- inspection_data (JSONB)
- start_mileage, end_mileage
- defects_found, defect_severity, defect_description
- status
- issues_found, issues_description
- created_at, updated_at
```

#### 5. daily_trips
Distance tracking for 150-mile exemption
```sql
- id (PRIMARY KEY)
- driver_id (FK → users)
- vehicle_id (FK → vehicles)
- trip_date
- start_time, end_time
- start_location, end_location
- total_miles
- created_at, updated_at
```

#### 6. weekly_hos
Hours of service tracking
```sql
- id (PRIMARY KEY)
- driver_id (FK → users)
- week_start_date
- total_on_duty_hours
- created_at, updated_at
```

#### 7. company_info
Company details (USDOT #3603851)
```sql
- id (PRIMARY KEY)
- company_name
- usdot_number
- address, city, state, zip
- phone, email
- created_at, updated_at
```

#### 8. vehicle_documents
Document management
```sql
- id (PRIMARY KEY)
- vehicle_id (FK → vehicles)
- document_type (registration, insurance, inspection, maintenance)
- document_name
- document_url
- expiry_date
- is_active
- created_at, updated_at
```

---

## Type Definitions

### Current State (Scattered)
Type definitions are currently **scattered across multiple files** with significant duplication.

#### Types in app/workflow/page.tsx (1178 lines)
```typescript
interface ClockStatus
interface UserProfile
interface AssignedVehicle
interface StatusMessage
```

#### Types in app/admin/dashboard/page.tsx (605 lines)
```typescript
interface ActiveShift
interface FleetVehicle
interface Statistics
interface DashboardData
```

#### Types in app/inspections/
```typescript
// PreTripInspectionClient.tsx
interface Props
interface Vehicle

// PostTripInspectionClient.tsx
interface Props
interface Defect
interface Vehicle  // ⚠️ DUPLICATE
```

#### Types in app/api/utils.ts
```typescript
interface ApiResponse<T>
interface Session
interface PaginationParams
interface PaginationMeta
interface FieldSchema
```

#### Types in app/api/workflow/clock/route.ts
```typescript
interface ClockRequest
interface TimeCardStatus
```

#### Types in lib/
```typescript
// lib/logger.ts
export interface LogEntry

// lib/session.ts
export interface SessionData
export interface User

// lib/admin-auth.ts
export interface AdminSession
```

**⚠️ Problem Areas:**
- `Vehicle` interface defined in **3 different files**
- `User` interface defined in **2 different files**
- No shared type definitions for database models
- Inconsistent naming conventions
- Missing comprehensive type definitions

---

## Code Quality Analysis

### Large Files Requiring Refactoring

#### Critical Priority (>800 lines)
1. **app/workflow/page.tsx** - 1178 lines
   - Main driver dashboard
   - Clock in/out logic
   - Vehicle selection
   - Inspection status
   - Status messages
   - **Recommendation:** Break into 5-7 smaller components

2. **app/inspections/post-trip/PostTripInspectionClient.tsx** - 828 lines
   - Post-trip inspection form
   - DVIR integration
   - Defect reporting
   - **Recommendation:** Extract form components and validation

#### High Priority (>500 lines)
3. **app/admin/dashboard/page.tsx** - 605 lines
   - Supervisor dashboard
   - Active shifts display
   - Fleet status
   - **Recommendation:** Create dashboard service layer

4. **app/inspections/pre-trip/PreTripInspectionClient.tsx** - 518 lines
   - Pre-trip inspection form
   - **Recommendation:** Share components with post-trip

5. **app/workflow/daily/DailyWorkflowClient.tsx** - 452 lines
   - Daily workflow management
   - **Recommendation:** Extract workflow logic

6. **app/workflow/client-notes/ClientNotesClient.tsx** - 407 lines
   - Client notes management
   - **Recommendation:** Create notes service

#### Medium Priority (>300 lines)
7. **lib/logger.ts** - 360 lines
8. **lib/api-client.ts** - 333 lines
9. **lib/db.ts** - 313 lines
10. **app/workflow/client-notes/page.tsx** - 340 lines

### Validation Status

#### No Validation (High Risk) ❌
- `POST /api/inspections/pre-trip`
- `POST /api/inspections/post-trip`
- `POST /api/inspections/dvir`
- `POST /api/workflow/breaks`
- `POST /api/vehicles/[id]/odometer`
- `POST /api/driver/client-pickup`
- `POST /api/driver/client-dropoff`
- `POST /api/emergency/supervisor-help`

#### Partial Validation ⚠️
- `POST /api/workflow/clock` - Manual checks only
- `POST /api/time-clock/clock-in` - Basic field checks
- `POST /api/time-clock/clock-out` - Basic field checks

#### Proper Validation ✅
- Most GET endpoints (session-based)
- Admin endpoints (role-based)

---

## Authentication & Authorization

### Current Implementation
- **Method:** Cookie-based sessions
- **Storage:** Session cookies
- **Middleware:** middleware.ts (1036 lines)
- **Session Management:** lib/session.ts (85 lines)
- **Admin Auth:** lib/admin-auth.ts (174 lines)

### Session Structure
```typescript
interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'supervisor' | 'driver';
}
```

### Protected Routes
- `/workflow/*` - Requires driver role
- `/admin/*` - Requires admin/supervisor role
- `/api/admin/*` - Requires admin role
- All API routes - Require valid session

---

## API Client Architecture

### lib/api-client.ts (333 lines)
Centralized API client with typed methods:

```typescript
const api = {
  auth: {
    login(email, password)
    logout()
    getProfile()
    verify()
  },
  workflow: {
    clockIn(data)
    clockOut(data)
    getStatus()
    getSchedule()
  },
  vehicle: {
    getAll()
    getById(id)
    getAssignedVehicle()
    getAvailableVehicles()
  },
  inspection: {
    submitPreTrip(data)
    submitPostTrip(data)
    getHistory()
  }
}
```

**Status:** Good foundation, needs expanded type definitions

---

## Database Layer

### lib/db.ts (313 lines)
Direct PostgreSQL queries via pg Pool

**Helper Functions:**
- `query(text, params)` - Core query function
- `createUser()` - User creation
- `getUserByEmail()` - User lookup
- `getVehicles()` - Vehicle list
- `createInspection()` - Inspection creation
- `getInspectionsByDriver()` - Inspection history
- `createWorkflow()` - Workflow creation
- `createClientNote()` - Client notes
- `getVehicleDocuments()` - Document retrieval
- `healthCheck()` - Database health

**Issues:**
- No type safety for queries
- No query builder
- No transaction support
- Limited error handling
- Manual SQL string construction

---

## Logging & Error Handling

### lib/logger.ts (360 lines)
Comprehensive logging system with:
- API request logging
- Error logging with stack traces
- Database error logging
- Debug logging
- Error ID generation
- Structured log entries

**Status:** Well-implemented, ready for production monitoring

### Current Error Handling
- ✅ Centralized logger
- ⚠️ Inconsistent error responses
- ❌ No custom error classes
- ❌ No error codes
- ❌ No validation error formatting

---

## FMCSA Compliance

### lib/hos-config.ts (180 lines)
Passenger carrier regulations:
- **Max Driving:** 10 hours/day
- **Max On-Duty:** 15 hours/day
- **Min Off-Duty:** 8 consecutive hours
- **Weekly Limit:** 70 hours / 8 days
- **150 Air-Mile Exemption:** Tracked in system

**Status:** Rules implemented, enforcement needs validation

---

## Security Analysis

### lib/security.ts (91 lines)
Security utilities:
- Password hashing (bcrypt)
- Input sanitization
- SQL injection protection (parameterized queries)
- XSS prevention

**Status:** Basic security in place

**Missing:**
- CSRF protection
- Rate limiting
- Input validation framework
- Audit logging
- Password complexity requirements

---

## Pain Points & Technical Debt

### 1. Monolithic Components ⚠️
- **workflow/page.tsx (1178 lines)** - God component
- Complex state management in single files
- Difficult to test
- Hard to maintain

### 2. Scattered Type Definitions ⚠️
- No central type library
- Duplicate interfaces across files
- Inconsistent naming
- Missing database model types

### 3. Missing Validation Layer ❌
- 8 API endpoints with **no validation**
- Manual validation in some routes
- No validation error formatting
- SQL injection risk (mitigated by parameterized queries)

### 4. No Service Layer ❌
- Database queries in API routes
- Business logic in controllers
- Hard to test
- Difficult to reuse logic

### 5. Limited Error Handling ⚠️
- No custom error classes
- Inconsistent error responses
- No error codes
- Basic error messages

### 6. Database Layer Issues ⚠️
- Raw SQL strings
- No query builder
- No transaction support
- Limited type safety

### 7. Testing Gaps ❌
- Limited test coverage
- No integration tests for critical flows
- Manual testing required

---

## Dependencies

### Core Dependencies (package.json)
```json
{
  "next": "^15.x",
  "react": "^19.x",
  "react-dom": "^19.x",
  "typescript": "^5.x",
  "pg": "^8.x",
  "bcrypt": "^5.x",
  "tailwindcss": "^3.x"
}
```

### Development Dependencies
```json
{
  "jest": "^29.x",
  "@testing-library/react": "^14.x",
  "eslint": "^8.x"
}
```

---

## Deployment

### Production
- **Platform:** Vercel
- **URL:** https://walla-walla-final.vercel.app
- **Database:** Heroku Postgres
- **Build:** Next.js production build
- **Environment:** Production environment variables

### Environment Variables
```bash
DATABASE_URL="postgres://..."  # Heroku Postgres connection
```

---

## Mobile Optimization

### Touch Optimization
- All buttons ≥48px touch targets
- One-thumb usability
- Safe area insets (notch, home indicator)
- Haptic feedback (planned)

### Mobile Components
Located in `components/mobile/`:
- TouchButton
- BottomActionBar
- SignatureCanvas
- MobileCard
- AlertBanner
- VehicleSelector

**Status:** Well-optimized for mobile use

---

## Documentation

### Existing Documentation (17 files in docs/)
- API_DOCUMENTATION.md
- CHANGELOG.md
- CONTRIBUTING.md
- DATABASE_SETUP_FIXED.md
- DEPLOYMENT-SUMMARY.md
- DOCUMENTATION_COMPLETE.md
- FMCSA_COMPLIANCE_GUIDE.md
- GITHUB_SETUP.md
- IMPLEMENTATION_COMPLETE_GUIDE.md
- PROJECT_STATUS.md
- README.md

**Status:** Extensive documentation exists

---

## Strengths

1. ✅ **Working Production System** - Deployed and functional
2. ✅ **Mobile-First Design** - Optimized for driver use
3. ✅ **Comprehensive Logging** - Good error tracking
4. ✅ **FMCSA Compliance** - Rules implemented
5. ✅ **Good Documentation** - Extensive project docs
6. ✅ **Modern Stack** - Next.js 15, React 19, TypeScript
7. ✅ **Session-Based Auth** - Secure authentication
8. ✅ **Centralized API Client** - Typed API methods

---

## Weaknesses

1. ❌ **Monolithic Components** - Large, complex files
2. ❌ **No Type Library** - Scattered type definitions
3. ❌ **Missing Validation** - 8 unvalidated endpoints
4. ❌ **No Service Layer** - Business logic in routes
5. ❌ **Limited Error Handling** - No custom error classes
6. ❌ **Raw SQL Queries** - No query builder or ORM
7. ❌ **Testing Gaps** - Limited test coverage
8. ❌ **No Transaction Support** - Database operations not atomic

---

## Recommendations

### Immediate Actions (Phase 1)
1. **Create Shared Types Library** - Centralize all type definitions
2. **Add Input Validation** - Implement Zod validation
3. **Centralized Error Handling** - Custom error classes
4. **Database Service Layer** - Extract database queries
5. **Refactor Large Components** - Break down monoliths

### Medium-Term (Phase 2)
6. **Add Transaction Support** - Database atomicity
7. **Expand Test Coverage** - Integration tests
8. **Query Builder** - Replace raw SQL
9. **CSRF Protection** - Security enhancement
10. **Rate Limiting** - API protection

### Long-Term (Phase 3)
11. **Migrate to ORM** - Consider Prisma/Drizzle
12. **Add Caching Layer** - Performance optimization
13. **WebSockets** - Real-time updates
14. **Background Jobs** - Async processing
15. **Monitoring Dashboard** - Production observability

---

## Summary

Walla Walla Travel is a **functional production system** with solid mobile optimization and comprehensive logging. The main technical debt lies in:
- Large monolithic components
- Scattered type definitions
- Missing validation layer
- Lack of service layer abstraction

**Refactoring should focus on:**
1. Creating a shared types library
2. Adding input validation (Zod)
3. Implementing a service layer
4. Breaking down large components
5. Centralizing error handling

These improvements will make the system **enterprise-grade** and ready for major feature additions like booking/scheduling.
