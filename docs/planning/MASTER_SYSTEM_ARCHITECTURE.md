# 🏗️ SYSTEM ARCHITECTURE
**Last Updated:** October 12, 2025  
**Status:** Current and accurate

---

## 📊 SYSTEM OVERVIEW

**Walla Walla Travel** is a mobile-first driver management application built with Next.js 15, using cookie-based authentication and designed for one-thumb operation on mobile devices.

### **Tech Stack:**
- **Frontend:** Next.js 15.5.2 (App Router), React 19.1.0
- **Styling:** Tailwind CSS 4
- **Authentication:** Cookie-based sessions (httpOnly)
- **Database:** PostgreSQL (not yet connected - using mocks)
- **Testing:** Jest 30.1.3 with React Testing Library
- **Type Safety:** TypeScript 5 (strict mode)

### **What We're NOT Using:**
- ❌ Supabase (fully removed)
- ❌ Python API (outdated docs reference this)
- ❌ External auth providers
- ❌ Redis/session stores
- ❌ GraphQL

---

## 🔐 AUTHENTICATION FLOW

### **Current Implementation (Cookie-Based):**

```
User enters credentials
        ↓
loginAction (server action)
        ↓
lib/auth.ts → login()
        ↓
Validates: driver@test.com / test123456
        ↓
Sets httpOnly cookie "session"
        ↓
Returns { success: true }
        ↓
Redirects to /workflow
```

### **Files Involved:**
- `app/login/page.tsx` - Login UI
- `app/actions/auth.ts` - Server action
- `lib/auth.ts` - Authentication logic
- `middleware.ts` - Route protection

### **Session Structure:**
```typescript
{
  email: string
  userId: string
  name: string
}
```

### **Cookie Settings:**
- **httpOnly:** true (prevents XSS)
- **secure:** true in production
- **sameSite:** 'lax'
- **maxAge:** 7 days

---

## 📁 FILE STRUCTURE

```
/Users/temp/walla-walla-final/
│
├── app/                          ← Next.js App Router
│   ├── actions/                  ← Server Actions
│   │   ├── auth.ts               ← Login/logout
│   │   └── inspections.ts        ← Save inspections (mock)
│   │
│   ├── login/                    ← Login page
│   │   └── page.tsx              ← Email/password form
│   │
│   ├── workflow/                 ← Driver workflow
│   │   ├── page.tsx              ← Success landing
│   │   ├── daily/                ← Daily workflow tracker
│   │   └── client-notes/         ← Client notes form
│   │
│   ├── inspections/              ← Vehicle inspections
│   │   ├── pre-trip/             ← Pre-trip form
│   │   ├── post-trip/            ← Post-trip form
│   │   └── new/                  ← Create inspection
│   │
│   ├── dashboard/                ← Dashboard (placeholder)
│   ├── driver-portal/            ← Driver portal features
│   ├── layout.tsx                ← Root layout
│   └── globals.css               ← Global styles
│
├── components/                   ← Reusable components
│   └── mobile/                   ← Mobile UI library
│       ├── MobileButton.tsx      ← Touch-optimized buttons
│       ├── MobileCheckbox.tsx    ← Large checkboxes
│       ├── MobileInput.tsx       ← No-zoom inputs
│       ├── BottomActionBar.tsx   ← Sticky bottom actions
│       ├── haptics.ts            ← Vibration feedback
│       ├── design-system.ts      ← Design constants
│       └── index.ts              ← Exports
│
├── lib/                          ← Utilities
│   ├── auth.ts                   ← Authentication logic
│   └── security.ts               ← Security utilities
│
├── middleware.ts                 ← Route protection
├── package.json                  ← Dependencies
├── tsconfig.json                 ← TypeScript config
└── tailwind.config.ts            ← Tailwind config
```

---

## 🎨 DESIGN SYSTEM

### **Mobile-First Principles:**

1. **Touch Targets:** 48-64px minimum (WCAG AAA)
2. **Font Size:** 16px minimum (prevents iOS zoom)
3. **Thumb Zones:** Primary actions in bottom 20%
4. **Contrast:** WCAG AA minimum
5. **Spacing:** 8px base unit

### **Component Hierarchy:**
```
MobileButton
├── PrimaryButton (blue)
├── SecondaryButton (gray)
├── SuccessButton (green)
├── DangerButton (red)
└── GhostButton (transparent)

MobileCheckbox
├── Single checkbox
└── MobileCheckboxGroup (list)

MobileInput
├── Text input
├── Email input
├── Password input
└── MobileTextArea

BottomActionBar
├── Single action
├── Two actions
└── Three actions
```

### **Design Tokens:**
```typescript
// From components/mobile/design-system.ts
export const TOUCH_TARGET = {
  MINIMUM: 48,      // WCAG AAA
  COMFORTABLE: 56,
  LARGE: 64
}

export const TYPOGRAPHY = {
  MINIMUM: 16,      // Prevents iOS zoom
  BODY: 16,
  LARGE: 20,
  HEADING: 24
}

export const SPACING = {
  BASE: 8,
  SMALL: 4,
  MEDIUM: 16,
  LARGE: 24
}
```

---

## 🔄 DATA FLOW

### **Current (Mock) Flow:**
```
User submits form
      ↓
Server Action (app/actions/)
      ↓
Validation & sanitization
      ↓
Mock save (console.log)
      ↓
Return success
      ↓
Update UI
```

### **Future (Database) Flow:**
```
User submits form
      ↓
Server Action
      ↓
Validation & sanitization
      ↓
lib/db.ts → PostgreSQL
      ↓
Return saved record
      ↓
Update UI
```

---

## 🧪 TESTING ARCHITECTURE

### **Test Structure:**
```
__tests__/
├── unit/                    ← Unit tests
│   ├── auth.test.ts
│   └── security.test.ts
│
├── integration/             ← Integration tests
│   └── inspections.test.ts
│
└── e2e/                     ← End-to-end tests (future)
    └── workflow.test.ts
```

### **Testing Stack:**
- Jest 30.1.3
- React Testing Library 16.3.0
- jest-environment-jsdom

### **Coverage Goals:**
- Unit tests: 80%+
- Critical paths: 100%
- Server actions: 100%

---

## 🚀 DEPLOYMENT ARCHITECTURE

### **Current State:** Development only

### **Planned Production:**
```
Vercel (Frontend & API Routes)
      ↓
PostgreSQL (Database)
      ↓
S3/R2 (File storage)
```

---

## 🔒 SECURITY ARCHITECTURE

### **Current Measures:**
1. ✅ httpOnly cookies
2. ✅ Input sanitization (`lib/security.ts`)
3. ✅ XSS prevention (DOMPurify)
4. ✅ CSRF protection (sameSite cookies)
5. ✅ No SQL injection (parameterized queries planned)

### **Security Utilities:**
```typescript
// lib/security.ts
export function sanitizeText(input: string): string
export function sanitizeNumber(input: string): number | null
export const patterns = {
  email: RegExp,
  phone: RegExp,
  mileage: RegExp
}
```

---

## 📱 MOBILE OPTIMIZATION

### **Responsive Breakpoints:**
```css
/* Mobile-first approach */
/* Default: 320px+ (mobile) */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

### **Mobile Features:**
- ✅ Touch-optimized components
- ✅ Haptic feedback
- ✅ No zoom on input focus
- ✅ Bottom action bars
- ✅ One-thumb operation
- 🚧 Offline support (future)
- 🚧 PWA (future)

---

## 🔌 API STRUCTURE

### **Server Actions (Current):**
```typescript
// app/actions/auth.ts
export async function loginAction(email, password)
export async function logoutAction()

// app/actions/inspections.ts
export async function saveInspectionAction(data)
```

### **REST API (Future):**
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/inspections
POST   /api/inspections
GET    /api/inspections/:id
PUT    /api/inspections/:id
DELETE /api/inspections/:id
```

---

## 🎯 ARCHITECTURAL DECISIONS

### **Why Cookie-Based Auth?**
- ✅ Simple to implement
- ✅ Secure (httpOnly)
- ✅ No token management
- ✅ Works with server actions
- ❌ Requires server-side sessions for scale

### **Why No Database Yet?**
- Using mocks for rapid development
- Can switch to real DB without UI changes
- Focus on UX first, persistence later

### **Why Next.js App Router?**
- ✅ Server Components
- ✅ Server Actions
- ✅ Built-in routing
- ✅ Great mobile performance

### **Why Mobile-First?**
- Drivers use phones primarily
- Touch optimization required
- Responsive design harder to retrofit

---

## 🚧 KNOWN LIMITATIONS

1. **No database** - Using mocks
2. **No file storage** - Document uploads not working
3. **Session storage** - In-memory only (resets on restart)
4. **No offline support** - Requires connection
5. **Single test user** - No user management yet

---

## 🔮 FUTURE ARCHITECTURE

### **Planned Additions:**
1. PostgreSQL connection
2. Redis for sessions (scale)
3. S3/R2 for file storage
4. WebSocket for real-time updates
5. PWA for offline support
6. Push notifications

---

**Last Updated:** October 12, 2025  
**This document is the authoritative source for system architecture.**
