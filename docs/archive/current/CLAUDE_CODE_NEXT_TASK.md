# 🚀 CLAUDE CODE NEXT TASK: Backend API Implementation

**Module:** 1 - Driver Management  
**Phase:** 2 - Backend APIs  
**Priority:** HIGH  
**Status:** READY TO START

---

## 📋 TASK OVERVIEW

Build backend APIs to support the completed mobile UI features. All mobile components are ready and waiting for API integration.

## ✅ WHAT'S ALREADY DONE

### Mobile UI (100% Complete)
- Pre-trip inspection flow (3 steps, 15 tests)
- Post-trip inspection + DVIR (4 steps, 21 tests)
- Daily workflow management (7 steps, 24 tests)
- 9 reusable mobile components
- 60+ passing TDD tests

### Database Schema (Ready)
- See `/docs/planning/COMPLETE_DATABASE_SCHEMA.md`
- Tables: drivers, vehicles, inspections, routes, etc.
- Relationships fully defined

---

## 🎯 IMPLEMENTATION TASKS

### 1. Driver Authentication API
```typescript
// Required endpoints
POST   /api/auth/login         // Driver login
POST   /api/auth/logout        // Driver logout  
GET    /api/auth/profile       // Get driver profile
PUT    /api/auth/profile       // Update profile
POST   /api/auth/verify        // Verify token
```

### 2. Inspection APIs
```typescript
// Pre-trip inspection
POST   /api/inspections/pre-trip     // Submit pre-trip
GET    /api/inspections/pre-trip     // Get today's pre-trip

// Post-trip inspection
POST   /api/inspections/post-trip    // Submit post-trip
GET    /api/inspections/post-trip    // Get today's post-trip

// DVIR generation
POST   /api/inspections/dvir         // Generate DVIR
GET    /api/inspections/dvir/:id     // Get DVIR by ID

// History
GET    /api/inspections/history      // Get inspection history
```

### 3. Workflow Management APIs
```typescript
// Daily workflow
GET    /api/workflow/daily           // Get daily tasks
PUT    /api/workflow/status          // Update task status
GET    /api/workflow/schedule        // Get driver schedule

// Route management
GET    /api/routes/assigned          // Get assigned routes
PUT    /api/routes/:id/start         // Start route
PUT    /api/routes/:id/complete      // Complete route

// Break tracking
POST   /api/breaks/start             // Start break
POST   /api/breaks/end               // End break
GET    /api/breaks/history           // Break history
```

### 4. Vehicle APIs
```typescript
GET    /api/vehicles/assigned        // Get assigned vehicle
GET    /api/vehicles/:id             // Get vehicle details
PUT    /api/vehicles/:id/odometer    // Update odometer
```

---

## 🛠 TECHNICAL REQUIREMENTS

### API Structure
```typescript
// Standard response format
{
  success: boolean
  data?: any
  error?: string
  timestamp: string
}

// Error handling
- 400: Bad Request
- 401: Unauthorized  
- 403: Forbidden
- 404: Not Found
- 500: Server Error
```

### File Organization
```
app/api/
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   └── profile/route.ts
├── inspections/
│   ├── pre-trip/route.ts
│   ├── post-trip/route.ts
│   ├── dvir/route.ts
│   └── history/route.ts
├── workflow/
│   ├── daily/route.ts
│   ├── status/route.ts
│   └── schedule/route.ts
├── routes/
│   └── assigned/route.ts
└── vehicles/
    └── assigned/route.ts
```

### Testing Requirements
- TDD approach continues
- Test files in `__tests__/api/`
- Minimum 80% coverage
- Mock Supabase calls
- Test error scenarios

---

## 📝 IMPLEMENTATION STEPS

### Step 1: Setup API Structure
```bash
# Create API directories
mkdir -p app/api/{auth,inspections,workflow,routes,vehicles}
mkdir -p __tests__/api/{auth,inspections,workflow,routes,vehicles}
```

### Step 2: Create Base API Utilities
```typescript
// app/api/utils.ts
- Response helpers
- Error handlers
- Auth middleware
- Validation helpers
```

### Step 3: Implement Auth APIs First
1. Login endpoint with JWT
2. Profile management
3. Token verification
4. Add auth tests

### Step 4: Implement Inspection APIs
1. Pre-trip submission
2. Post-trip submission  
3. DVIR generation
4. History retrieval
5. Add inspection tests

### Step 5: Implement Workflow APIs
1. Daily task management
2. Status updates
3. Schedule retrieval
4. Add workflow tests

### Step 6: Connect to Mobile UI
1. Update mobile components to use real APIs
2. Add loading states
3. Add error handling
4. Test integration

---

## ✅ SUCCESS CRITERIA

1. **All APIs functional** - 20+ endpoints working
2. **TDD tests passing** - 80%+ coverage
3. **Mobile integration** - UI connected to APIs
4. **Error handling** - Graceful failures
5. **Documentation** - API docs updated

---

## 🚀 QUICK START COMMAND

```bash
# Start implementation
cd /Users/temp/walla-walla-final
npm run dev

# Run tests
npm test -- __tests__/api

# Check API routes
curl http://localhost:3000/api/health
```

---

## 📊 EXPECTED OUTCOME

After completion:
- Backend APIs fully functional
- Mobile UI connected to real data
- Driver features end-to-end working
- Ready for Module 1 Phase 3 (Advanced Features)

---

**Ready?** Tell Claude Code:
```
Read docs/current/CLAUDE_CODE_NEXT_TASK.md and start implementing the backend APIs.
Begin with Step 1: Setup API Structure.
```