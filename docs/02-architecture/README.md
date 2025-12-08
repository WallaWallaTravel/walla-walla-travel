# 🏗️ Architecture Overview

**Grade:** A+  
**Last Updated:** November 15, 2025

---

## 📐 System Architecture

### **High-Level Overview**

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Public  │  │  Admin   │  │  Driver  │             │
│  │   Site   │  │  Portal  │  │  Portal  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│                   API LAYER (Next.js)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │    Routes   │  │ Middleware  │  │   Services  │    │
│  │  (14/105)   │  │  (Auth/Val) │  │    (14)     │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│                  SERVICE LAYER                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Booking  │  │ Customer │  │ Vehicle  │  │  Auth  │ │
│  │ Service  │  │ Service  │  │ Service  │  │Service │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│                  DATA LAYER                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │         PostgreSQL Database (Heroku)             │  │
│  │  - 20+ tables                                     │  │
│  │  - 30+ indexes                                    │  │
│  │  - ACID transactions                              │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Core Principles

### **1. Service Layer Architecture**
- **Business logic in services** (not routes)
- **Reusable across API versions**
- **Testable in isolation**
- **Type-safe interfaces**

### **2. Middleware-First**
- **Authentication wrappers** (`withAuth`, `withAdminAuth`)
- **Validation wrappers** (Zod schemas)
- **Error handling** (automatic logging)

### **3. Database Optimization**
- **30+ strategic indexes**
- **N+1 query elimination**
- **JSON aggregation**
- **Transaction support**

### **4. Multi-Brand Support**
- **3 brands:** WWT, HCWT, NWTC
- **Independent websites**
- **Shared infrastructure**
- **Brand-specific customization**

---

## 📦 Service Layer

### **Base Service**
Foundation for all services:
- CRUD operations
- Pagination helpers
- Transaction support
- Error handling
- Logging

### **Domain Services (14)**

1. **AuthService** - Authentication & sessions
2. **BookingService** - Complete booking workflows
3. **CustomerService** - Customer management
4. **PricingService** - Dynamic pricing
5. **VehicleService** - Fleet management
6. **InspectionService** - Safety inspections
7. **NotificationService** - Critical alerts
8. **DriverService** - Driver operations
9. **AdminDashboardService** - Dashboard data
10. **TimeCardService** - Time tracking
11. **UserService** - User management
12. **ProposalService** - Proposal generation
13. **PaymentService** - Payment processing
14. **ReservationService** - Reservation handling

---

## 🔐 Authentication Flow

```
User Login Request
      ↓
validateBody(LoginSchema)
      ↓
authService.login()
      ↓
verifyPassword()
      ↓
createSession(JWT)
      ↓
setSessionCookie()
      ↓
Return user data
```

**Protected Routes:**
```typescript
export const GET = withAuth(async (request, session) => {
  // session.userId, session.role available
  // Automatic error handling
});
```

---

## 🗄️ Database Schema

### **Core Tables**

**bookings** - Tour bookings
- Primary Key: `id`
- Unique: `booking_number`
- Indexes: date, status, customer, driver

**customers** - Customer records
- Primary Key: `id`
- Unique: `email`
- Indexes: email, created_at

**vehicles** - Fleet management
- Primary Key: `id`
- Indexes: status, capacity

**time_cards** - Driver shifts
- Primary Key: `id`
- Indexes: driver+active, vehicle+active

**inspections** - Safety inspections
- Primary Key: `id`
- Indexes: vehicle+date, type, driver

See: `./database-schema.md` for complete schema.

---

## ⚡ Performance Strategy

### **Database Indexes (30+)**
- Strategic covering indexes
- Composite indexes for common queries
- Partial indexes for filtered data

### **Query Optimization**
- JSON aggregation for 1-to-many
- Efficient JOINs
- Pagination at DB level

### **Caching**
- Response caching (30s TTL)
- CDN-ready headers
- Stale-while-revalidate

---

## 🔄 Request Flow

### **Typical API Request**

```
1. Client sends request
   ↓
2. Middleware: Authentication
   ↓
3. Middleware: Validation (Zod)
   ↓
4. Route handler calls service
   ↓
5. Service executes business logic
   ↓
6. Database query (optimized)
   ↓
7. Response formatting
   ↓
8. Error handling (if needed)
   ↓
9. Return to client
```

**Code Example:**
```typescript
export const POST = withAuth(async (request, session) => {
  // Step 3: Validate
  const data = await validateBody(request, MySchema);
  
  // Step 4-5: Service layer
  const result = await myService.create(data);
  
  // Step 7: Format response
  return NextResponse.json({
    success: true,
    data: result,
  });
});
// Steps 2, 8, 9 handled automatically
```

---

## 🎨 Frontend Architecture

### **Next.js App Router**
- Server components by default
- Client components when needed
- API routes for backend

### **Key Pages**
- `/` - Public website
- `/bookings/new` - Booking form
- `/admin` - Admin portal
- `/driver-portal` - Driver dashboard

### **Shared Components**
- Form inputs
- Buttons
- Modals
- Calendar
- Maps

---

## 🚀 Deployment

**Platform:** Vercel  
**Database:** PostgreSQL on Heroku  
**CDN:** Vercel Edge Network  

**Environment:**
- **Production:** wallawalla.travel
- **Staging:** staging.wallawalla.travel (optional)
- **Development:** localhost:3000

---

## 📊 Monitoring

- **Error Tracking:** Sentry (configured)
- **Performance:** Vercel Analytics
- **Database:** PostgreSQL logs
- **API:** Request logging

---

## 🔧 Development Tools

- **TypeScript:** Type safety
- **ESLint:** Code quality
- **Prettier:** Code formatting
- **Jest:** Testing framework
- **Zod:** Runtime validation

---

**Next:** [API Reference](../03-api-reference/README.md)




