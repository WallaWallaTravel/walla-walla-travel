# Walla Walla Travel - Refactoring Plan

**Generated:** October 17, 2025
**Purpose:** Prioritized architectural improvements
**Goal:** Enterprise-grade, maintainable, commercially viable system

---

## Overview

This document outlines a phased approach to refactoring the Walla Walla Travel system. The plan focuses on **immediate high-impact improvements** before adding major features like booking/scheduling.

**Guiding Principles:**
1. **Don't Break Production** - Incremental changes, test after each step
2. **Work Incrementally** - Complete one task fully before moving to next
3. **Commit Often** - Save progress after each completed task
4. **Test Critical Flows** - Verify login, clock in/out, inspections after changes

---

## Priority Matrix

| Priority | Risk | Impact | Effort | Timeline |
|----------|------|--------|--------|----------|
| **CRITICAL** | High | High | Medium | Phase 1 (1-2 weeks) |
| **HIGH** | Medium | High | Medium | Phase 1-2 (2-3 weeks) |
| **MEDIUM** | Low | Medium | Low | Phase 2 (3-4 weeks) |
| **LOW** | Low | Low | Low | Phase 3 (4+ weeks) |

---

## Phase 1: Foundation (CRITICAL)

**Timeline:** 1-2 weeks
**Goal:** Create solid architectural foundation

### Task 1: Create Shared Types Library ⭐

**Priority:** CRITICAL
**Effort:** Medium (1-2 days)
**Risk:** Low

#### Rationale
- Currently **33+ duplicate type definitions** across files
- `Vehicle` interface defined in 3 different files
- `User` interface defined in 2 different files
- No centralized source of truth
- TypeScript errors and inconsistencies

#### Implementation

**1.1 Create Type Library Structure**
```bash
mkdir -p lib/types
touch lib/types/index.ts
touch lib/types/user.ts
touch lib/types/vehicle.ts
touch lib/types/timecard.ts
touch lib/types/inspection.ts
touch lib/types/client-service.ts
touch lib/types/api.ts
touch lib/types/database.ts
```

**1.2 Define Core Types**

**lib/types/user.ts**
```typescript
/**
 * User role in the system
 */
export type UserRole = 'driver' | 'admin' | 'supervisor';

/**
 * Base user profile
 */
export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Driver profile with additional fields
 */
export interface Driver extends User {
  role: 'driver';
  assigned_vehicle_id?: number;
}

/**
 * Admin/Supervisor profile
 */
export interface Admin extends User {
  role: 'admin' | 'supervisor';
}

/**
 * User profile for session
 */
export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}
```

**lib/types/vehicle.ts**
```typescript
/**
 * Vehicle status
 */
export type VehicleStatus =
  | 'available'
  | 'assigned'
  | 'in_use'
  | 'out_of_service'
  | 'maintenance';

/**
 * Vehicle information
 */
export interface Vehicle {
  id: number;
  vehicle_number: string;
  make: string;
  model: string;
  year?: number;
  vin?: string;
  license_plate?: string;
  capacity?: number;
  current_mileage?: number;
  is_active: boolean;
  status: VehicleStatus;
  defect_notes?: string;
  defect_reported_at?: string;
  defect_reported_by?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Assigned vehicle (simplified view)
 */
export interface AssignedVehicle {
  id: number;
  vehicle_number: string;
  make: string;
  model: string;
  year?: number;
  vin?: string;
  license_plate?: string;
  current_mileage?: number;
}
```

**lib/types/timecard.ts**
```typescript
/**
 * Time card status
 */
export type TimeCardStatus =
  | 'on_duty'
  | 'completed'
  | 'auto_closed';

/**
 * Time card record
 */
export interface TimeCard {
  id: number;
  driver_id: number;
  vehicle_id?: number | null;
  date: string;
  clock_in_time: string;
  clock_out_time?: string | null;
  work_reporting_location?: string;
  work_reporting_lat?: number;
  work_reporting_lng?: number;
  on_duty_hours?: number;
  driver_signature?: string;
  signature_timestamp?: string;
  status: TimeCardStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Clock status response
 */
export interface ClockStatus {
  status: 'not_clocked_in' | 'clocked_in' | 'clocked_out' | 'already_clocked_in' | 'already_clocked_out';
  message: string;
  canClockIn: boolean;
  canClockOut: boolean;
  timeCard?: TimeCard;
  vehicle?: string;
  hoursWorked?: string;
  lastShift?: {
    clockIn: string;
    clockOut: string;
    totalHours: string;
    vehicle: string;
  };
}
```

**lib/types/inspection.ts**
```typescript
/**
 * Inspection type
 */
export type InspectionType = 'pre_trip' | 'post_trip';

/**
 * Defect severity
 */
export type DefectSeverity = 'none' | 'minor' | 'critical';

/**
 * Inspection status
 */
export type InspectionStatus = 'completed' | 'pending' | 'failed';

/**
 * Defect information
 */
export interface Defect {
  id: string;
  category: string;
  description: string;
  severity: DefectSeverity;
  resolved: boolean;
}

/**
 * Inspection record
 */
export interface Inspection {
  id: number;
  driver_id: number;
  vehicle_id: number;
  time_card_id?: number | null;
  type: InspectionType;
  inspection_data: Record<string, any>;
  start_mileage?: number;
  end_mileage?: number;
  defects_found: boolean;
  defect_severity?: DefectSeverity;
  defect_description?: string;
  status: InspectionStatus;
  issues_found: boolean;
  issues_description?: string;
  created_at: string;
  updated_at: string;
}
```

**lib/types/api.ts**
```typescript
/**
 * API success response
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  errorId?: string;
  details?: any;
  code?: string;
}

/**
 * API response (union type)
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Status message for UI
 */
export interface StatusMessage {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  suggestions?: string[];
}
```

**lib/types/index.ts**
```typescript
// User types
export * from './user';

// Vehicle types
export * from './vehicle';

// Time card types
export * from './timecard';

// Inspection types
export * from './inspection';

// API types
export * from './api';

// Database types
export * from './database';

// Client service types
export * from './client-service';
```

**1.3 Update All Imports**

Replace scattered type definitions across all files:
- app/workflow/page.tsx
- app/admin/dashboard/page.tsx
- app/inspections/pre-trip/PreTripInspectionClient.tsx
- app/inspections/post-trip/PostTripInspectionClient.tsx
- All API routes

**Example Migration:**
```typescript
// BEFORE
interface Vehicle {
  id: number;
  vehicle_number: string;
  // ...
}

// AFTER
import { Vehicle } from '@/lib/types';
```

**1.4 Success Criteria**
- [ ] Zero duplicate type definitions
- [ ] All types have JSDoc comments
- [ ] All components import from lib/types
- [ ] Project builds without type errors
- [ ] Tests pass

**Files to Modify:** ~30 files
**Estimated Lines Changed:** ~500 lines

---

### Task 2: Add Input Validation with Zod ⭐

**Priority:** CRITICAL
**Effort:** Medium (2-3 days)
**Risk:** Medium

#### Rationale
- **8 API endpoints have NO validation**
- SQL injection risk (mitigated by parameterized queries but not foolproof)
- Data integrity issues
- Poor error messages
- Security vulnerabilities

#### High-Risk Endpoints (No Validation)
1. `POST /api/inspections/pre-trip`
2. `POST /api/inspections/post-trip`
3. `POST /api/inspections/dvir`
4. `POST /api/workflow/breaks`
5. `POST /api/vehicles/[id]/odometer`
6. `POST /api/driver/client-pickup`
7. `POST /api/driver/client-dropoff`
8. `POST /api/emergency/supervisor-help`

#### Implementation

**2.1 Install Zod**
```bash
npm install zod
```

**2.2 Create Validation Schemas**

```bash
mkdir -p lib/validation/schemas
touch lib/validation/middleware.ts
touch lib/validation/schemas/auth.ts
touch lib/validation/schemas/timecard.ts
touch lib/validation/schemas/inspection.ts
touch lib/validation/schemas/vehicle.ts
touch lib/validation/schemas/client.ts
```

**lib/validation/middleware.ts**
```typescript
import { z } from 'zod';
import { NextRequest } from 'next/server';

/**
 * Validate request body against Zod schema
 * @throws ZodError if validation fails
 */
export async function validateRequest<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): Promise<T> {
  const body = await req.json();
  return schema.parse(body); // Throws ZodError if invalid
}

/**
 * Validate query parameters against Zod schema
 * @throws ZodError if validation fails
 */
export function validateQuery<T>(
  url: URL,
  schema: z.ZodSchema<T>
): T {
  const params = Object.fromEntries(url.searchParams.entries());
  return schema.parse(params);
}
```

**lib/validation/schemas/timecard.ts**
```typescript
import { z } from 'zod';

export const clockInSchema = z.object({
  action: z.literal('clock_in'),
  vehicleId: z.number().int().positive().nullable(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
});

export const clockOutSchema = z.object({
  action: z.literal('clock_out'),
  signature: z.string().min(1).max(255),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
});

export const clockRequestSchema = z.union([clockInSchema, clockOutSchema]);

export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;
export type ClockRequest = z.infer<typeof clockRequestSchema>;
```

**lib/validation/schemas/inspection.ts**
```typescript
import { z } from 'zod';

export const preTripInspectionSchema = z.object({
  vehicleId: z.number().int().positive(),
  timeCardId: z.number().int().positive(),
  startMileage: z.number().int().positive(),
  inspectionData: z.record(z.any()), // JSON object
  defectsFound: z.boolean().default(false),
  defectSeverity: z.enum(['none', 'minor', 'critical']).optional(),
  defectDescription: z.string().max(1000).optional(),
});

export const postTripInspectionSchema = z.object({
  vehicleId: z.number().int().positive(),
  timeCardId: z.number().int().positive(),
  endMileage: z.number().int().positive(),
  inspectionData: z.record(z.any()),
  defectsFound: z.boolean().default(false),
  defectSeverity: z.enum(['none', 'minor', 'critical']).optional(),
  defectDescription: z.string().max(1000).optional(),
});

export type PreTripInspectionInput = z.infer<typeof preTripInspectionSchema>;
export type PostTripInspectionInput = z.infer<typeof postTripInspectionSchema>;
```

**lib/validation/schemas/vehicle.ts**
```typescript
import { z } from 'zod';

export const updateOdometerSchema = z.object({
  mileage: z.number().int().positive(),
  notes: z.string().max(500).optional(),
});

export type UpdateOdometerInput = z.infer<typeof updateOdometerSchema>;
```

**2.3 Apply Validation to API Routes**

**Example: app/api/workflow/clock/route.ts**
```typescript
import { validateRequest } from '@/lib/validation/middleware';
import { clockRequestSchema } from '@/lib/validation/schemas/timecard';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // Validate request
    const data = await validateRequest(request, clockRequestSchema);

    // data is now typed and validated
    // ... rest of logic

  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }
    throw error;
  }
}
```

**2.4 Success Criteria**
- [ ] All POST/PUT endpoints validate input
- [ ] Clear validation error messages
- [ ] Type safety from schemas
- [ ] No SQL injection vulnerabilities
- [ ] Tests pass

**Files to Create:** 10 new files
**Files to Modify:** 15 API routes
**Estimated Lines Changed:** ~800 lines

---

### Task 3: Centralized Error Handling ⭐

**Priority:** CRITICAL
**Effort:** Low (1 day)
**Risk:** Low

#### Rationale
- Inconsistent error responses across API routes
- No custom error classes
- No error codes for debugging
- Poor error messages for users

#### Implementation

**3.1 Create Error System**

```bash
mkdir -p lib/errors
touch lib/errors/index.ts
touch lib/errors/AppError.ts
touch lib/errors/types.ts
touch lib/errors/handlers.ts
```

**lib/errors/AppError.ts**
```typescript
/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(401, message, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

/**
 * Database error (500)
 */
export class DatabaseError extends AppError {
  constructor(message: string) {
    super(500, `Database error: ${message}`, 'DATABASE_ERROR');
  }
}

/**
 * Internal server error (500)
 */
export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(500, message, 'INTERNAL_ERROR');
  }
}
```

**lib/errors/handlers.ts**
```typescript
import { ZodError } from 'zod';
import { AppError } from './AppError';
import { logError } from '@/lib/logger';

/**
 * Centralized error handler for API routes
 */
export function handleError(error: unknown): Response {
  console.error('API Error:', error);

  // Log error with logger system
  if (error instanceof Error) {
    logError('API', error.message, error);
  }

  // Handle custom AppError
  if (error instanceof AppError) {
    return Response.json(
      {
        success: false,
        error: error.message,
        code: error.code
      },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return Response.json(
      {
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      },
      { status: 400 }
    );
  }

  // Handle database errors
  if (error instanceof Error && error.message.includes('database')) {
    return Response.json(
      {
        success: false,
        error: 'Database error occurred',
        code: 'DATABASE_ERROR'
      },
      { status: 500 }
    );
  }

  // Default error
  return Response.json(
    {
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    },
    { status: 500 }
  );
}
```

**lib/errors/index.ts**
```typescript
export * from './AppError';
export * from './handlers';
export * from './types';
```

**3.2 Apply to All API Routes**

**Example Usage:**
```typescript
import { handleError } from '@/lib/errors';
import { NotFoundError, UnauthorizedError } from '@/lib/errors';

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    if (!session) {
      throw new UnauthorizedError();
    }

    const vehicle = await getVehicleById(vehicleId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle');
    }

    // ... business logic

    return Response.json({ success: true, data });
  } catch (error) {
    return handleError(error);
  }
}
```

**3.3 Success Criteria**
- [ ] All API routes use try-catch
- [ ] Consistent error format
- [ ] Helpful error messages
- [ ] Proper status codes
- [ ] Error logging integrated

**Files to Create:** 4 new files
**Files to Modify:** 35 API routes
**Estimated Lines Changed:** ~300 lines

---

### Task 4: Database Service Layer ⭐

**Priority:** HIGH
**Effort:** High (3-4 days)
**Risk:** Medium

#### Rationale
- Database queries mixed with business logic in API routes
- Hard to test
- No transaction support
- Code duplication
- Difficult to maintain

#### Implementation

**4.1 Create Service Layer**

```bash
mkdir -p lib/services
touch lib/services/index.ts
touch lib/services/user.service.ts
touch lib/services/vehicle.service.ts
touch lib/services/timecard.service.ts
touch lib/services/inspection.service.ts
touch lib/services/client-service.service.ts
```

**lib/services/timecard.service.ts**
```typescript
import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import { TimeCard, ClockInInput, ClockOutInput } from '@/lib/types';
import { DatabaseError, NotFoundError, ConflictError } from '@/lib/errors';

export class TimeCardService {
  /**
   * Clock in a driver
   */
  async clockIn(driverId: number, data: ClockInInput): Promise<TimeCard> {
    // Check for active time card
    const activeCard = await this.getActiveTimeCard(driverId);
    if (activeCard) {
      throw new ConflictError('Driver is already clocked in');
    }

    // Verify vehicle if provided
    if (data.vehicleId) {
      const vehicleInUse = await this.isVehicleInUse(data.vehicleId, driverId);
      if (vehicleInUse) {
        throw new ConflictError('Vehicle is already in use');
      }
    }

    // Create time card
    const workLocation = data.location
      ? `Lat: ${data.location.latitude.toFixed(4)}, Lng: ${data.location.longitude.toFixed(4)}`
      : 'Location not provided';

    try {
      const result = await query(`
        INSERT INTO time_cards (
          driver_id,
          vehicle_id,
          date,
          work_reporting_location,
          work_reporting_lat,
          work_reporting_lng,
          clock_in_time,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, 'on_duty', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        driverId,
        data.vehicleId || null,
        new Date().toISOString().split('T')[0],
        workLocation,
        data.location?.latitude || null,
        data.location?.longitude || null
      ]);

      return result.rows[0] as TimeCard;
    } catch (error: any) {
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Clock out a driver
   */
  async clockOut(driverId: number, data: ClockOutInput): Promise<TimeCard> {
    // Get active time card
    const activeCard = await this.getActiveTimeCard(driverId);
    if (!activeCard) {
      throw new NotFoundError('Active time card');
    }

    // Calculate hours
    const clockInTime = new Date(activeCard.clock_in_time);
    const clockOutTime = new Date();
    const totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

    try {
      const result = await query(`
        UPDATE time_cards
        SET
          clock_out_time = CURRENT_TIMESTAMP,
          on_duty_hours = $2,
          driver_signature = $3,
          signature_timestamp = CURRENT_TIMESTAMP,
          status = 'completed',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [
        activeCard.id,
        totalHours,
        data.signature
      ]);

      return result.rows[0] as TimeCard;
    } catch (error: any) {
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Get active time card for driver
   */
  async getActiveTimeCard(driverId: number): Promise<TimeCard | null> {
    try {
      const result = await query(`
        SELECT * FROM time_cards
        WHERE driver_id = $1
          AND clock_out_time IS NULL
        ORDER BY clock_in_time DESC
        LIMIT 1
      `, [driverId]);

      return result.rows[0] as TimeCard || null;
    } catch (error: any) {
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Check if vehicle is in use by another driver
   */
  async isVehicleInUse(vehicleId: number, excludeDriverId: number): Promise<boolean> {
    try {
      const result = await query(`
        SELECT id FROM time_cards
        WHERE vehicle_id = $1
          AND driver_id != $2
          AND clock_out_time IS NULL
        LIMIT 1
      `, [vehicleId, excludeDriverId]);

      return result.rowCount > 0;
    } catch (error: any) {
      throw new DatabaseError(error.message);
    }
  }

  /**
   * Get time cards for driver
   */
  async getTimeCardsByDriver(driverId: number, limit = 10): Promise<TimeCard[]> {
    try {
      const result = await query(`
        SELECT * FROM time_cards
        WHERE driver_id = $1
        ORDER BY clock_in_time DESC
        LIMIT $2
      `, [driverId, limit]);

      return result.rows as TimeCard[];
    } catch (error: any) {
      throw new DatabaseError(error.message);
    }
  }
}

// Export singleton instance
export const timeCardService = new TimeCardService();
```

**lib/services/vehicle.service.ts**
```typescript
import { query } from '@/lib/db';
import { Vehicle } from '@/lib/types';
import { DatabaseError, NotFoundError } from '@/lib/errors';

export class VehicleService {
  async getAll(): Promise<Vehicle[]> {
    try {
      const result = await query(`
        SELECT * FROM vehicles
        WHERE is_active = true
        ORDER BY vehicle_number
      `);
      return result.rows as Vehicle[];
    } catch (error: any) {
      throw new DatabaseError(error.message);
    }
  }

  async getById(id: number): Promise<Vehicle> {
    try {
      const result = await query(`
        SELECT * FROM vehicles
        WHERE id = $1 AND is_active = true
      `, [id]);

      if (result.rowCount === 0) {
        throw new NotFoundError('Vehicle');
      }

      return result.rows[0] as Vehicle;
    } catch (error: any) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(error.message);
    }
  }

  async getAvailable(): Promise<Vehicle[]> {
    try {
      const result = await query(`
        SELECT v.* FROM vehicles v
        WHERE v.is_active = true
          AND v.status = 'available'
          AND NOT EXISTS (
            SELECT 1 FROM time_cards tc
            WHERE tc.vehicle_id = v.id
              AND tc.clock_out_time IS NULL
          )
        ORDER BY v.vehicle_number
      `);
      return result.rows as Vehicle[];
    } catch (error: any) {
      throw new DatabaseError(error.message);
    }
  }

  async updateMileage(id: number, mileage: number): Promise<Vehicle> {
    try {
      const result = await query(`
        UPDATE vehicles
        SET current_mileage = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [id, mileage]);

      if (result.rowCount === 0) {
        throw new NotFoundError('Vehicle');
      }

      return result.rows[0] as Vehicle;
    } catch (error: any) {
      if (error instanceof NotFoundError) throw error;
      throw new DatabaseError(error.message);
    }
  }
}

export const vehicleService = new VehicleService();
```

**4.2 Update API Routes to Use Services**

**Example: app/api/workflow/clock/route.ts**
```typescript
import { timeCardService } from '@/lib/services/timecard.service';
import { handleError } from '@/lib/errors';
import { validateRequest } from '@/lib/validation/middleware';
import { clockRequestSchema } from '@/lib/validation/schemas/timecard';

export async function POST(req: Request) {
  try {
    // Validate
    const data = await validateRequest(req, clockRequestSchema);

    // Get session
    const session = await requireAuth();
    if (!session) {
      throw new UnauthorizedError();
    }

    // Use service
    let timeCard;
    if (data.action === 'clock_in') {
      timeCard = await timeCardService.clockIn(session.userId, data);
    } else {
      timeCard = await timeCardService.clockOut(session.userId, data);
    }

    return Response.json({
      success: true,
      data: timeCard
    });
  } catch (error) {
    return handleError(error);
  }
}
```

**4.3 Success Criteria**
- [ ] No raw database queries in API routes
- [ ] All queries in service layer
- [ ] Services are typed and documented
- [ ] Easy to test
- [ ] Consistent error handling

**Files to Create:** 6 new service files
**Files to Modify:** 25 API routes
**Estimated Lines Changed:** ~2000 lines

---

### Task 5: Refactor Large Components

**Priority:** HIGH
**Effort:** High (4-5 days)
**Risk:** Medium

#### Rationale
- **app/workflow/page.tsx (1178 lines)** - Monolithic god component
- Hard to understand and maintain
- Difficult to test
- Poor code reusability

#### Implementation

**5.1 Break Down workflow/page.tsx**

Create smaller, focused components:

```
app/workflow/
├── page.tsx                      # Main container (100 lines)
├── components/
│   ├── WorkflowHeader.tsx        # Header with user info
│   ├── StatusCard.tsx            # Current status display
│   ├── ClockButtons.tsx          # Clock in/out buttons
│   ├── InspectionButtons.tsx     # Inspection links
│   ├── VehicleDocuments.tsx      # Document display
│   ├── QuickLinks.tsx            # Navigation links
│   └── hooks/
│       ├── useWorkflowData.ts    # Data fetching hook
│       ├── useClockActions.ts    # Clock in/out logic
│       └── useVehicleStatus.ts   # Vehicle state
```

**Example: app/workflow/components/StatusCard.tsx**
```typescript
import { ClockStatus, AssignedVehicle } from '@/lib/types';

interface StatusCardProps {
  clockStatus: ClockStatus | null;
  vehicle: AssignedVehicle | null;
  isClockedIn: boolean;
}

export function StatusCard({ clockStatus, vehicle, isClockedIn }: StatusCardProps) {
  const statusDisplay = getStatusDisplay(clockStatus);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
      <h2 className="text-xl font-semibold mb-4">Current Status</h2>

      <div className="space-y-3">
        <StatusRow
          label="Status"
          value={statusDisplay.text}
          icon={statusDisplay.icon}
          color={statusDisplay.color}
        />

        {isClockedIn && vehicle && (
          <VehicleInfo vehicle={vehicle} />
        )}

        {clockStatus?.timeCard?.clock_in_time && (
          <ClockTime time={clockStatus.timeCard.clock_in_time} />
        )}
      </div>
    </div>
  );
}
```

**Example: app/workflow/hooks/useWorkflowData.ts**
```typescript
import { useState, useEffect } from 'react';
import api from '@/lib/api-client';
import { UserProfile, ClockStatus, AssignedVehicle } from '@/lib/types';

export function useWorkflowData() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [vehicle, setVehicle] = useState<AssignedVehicle | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      // Parallel data loading
      const [profileResult, statusResult, vehicleResult] = await Promise.all([
        api.auth.getProfile(),
        api.workflow.getStatus(),
        api.vehicle.getAssignedVehicle(),
      ]);

      if (profileResult.success) setUser(profileResult.data);
      if (statusResult.success) setClockStatus(statusResult.data);
      if (vehicleResult.success) setVehicle(vehicleResult.data);
    } catch (error) {
      console.error('Failed to load workflow data:', error);
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    user,
    clockStatus,
    vehicle,
    reload: loadData,
  };
}
```

**5.2 Success Criteria**
- [ ] workflow/page.tsx under 200 lines
- [ ] Components are reusable
- [ ] Logic extracted to custom hooks
- [ ] Improved testability
- [ ] Maintained functionality

**Files to Create:** 10+ new component files
**Files to Modify:** 1 main file (page.tsx)
**Estimated Lines Changed:** ~1200 lines

---

## Phase 2: Enhancement (2-4 weeks)

### Task 6: Add Transaction Support

**Priority:** MEDIUM
**Effort:** Medium

Add database transaction support for atomic operations:
- Clock in/out with inspection creation
- Vehicle assignment with status updates
- Multi-step operations

### Task 7: Expand Test Coverage

**Priority:** MEDIUM
**Effort:** High

Add comprehensive tests:
- Unit tests for services
- Integration tests for API routes
- E2E tests for critical flows

### Task 8: Query Builder

**Priority:** MEDIUM
**Effort:** Medium

Replace raw SQL with query builder:
- Consider Kysely or Drizzle
- Type-safe queries
- Better maintainability

### Task 9: CSRF Protection

**Priority:** MEDIUM
**Effort:** Low

Add CSRF token validation:
- Generate tokens
- Validate on mutations
- Protect state-changing operations

### Task 10: Rate Limiting

**Priority:** MEDIUM
**Effort:** Low

Add API rate limiting:
- Prevent abuse
- Per-user limits
- Redis-based or in-memory

---

## Phase 3: Optimization (4+ weeks)

### Task 11: Migrate to ORM

Consider Prisma or Drizzle for:
- Type-safe queries
- Migration management
- Better developer experience

### Task 12: Add Caching Layer

Implement caching for:
- Vehicle lists
- User profiles
- Static data

### Task 13: WebSockets for Real-Time Updates

Add real-time features:
- Live fleet status
- Supervisor dashboard updates
- Notifications

### Task 14: Background Jobs

Implement job queue for:
- Report generation
- Email notifications
- Data cleanup

### Task 15: Monitoring Dashboard

Production observability:
- Error tracking (Sentry)
- Performance monitoring
- User analytics

---

## Testing Strategy

### After Each Task
- [ ] Manual testing of critical flows
- [ ] Login (madsry@gmail.com / travel2024)
- [ ] Clock in/out
- [ ] Vehicle selection
- [ ] Pre-trip inspection
- [ ] Post-trip inspection
- [ ] Supervisor dashboard (if admin)
- [ ] Vehicle assignment

### Before Deployment
```bash
# Build test
npm run build

# If successful
railway up --force
```

---

## Git Workflow

### Branching Strategy
```bash
# Create feature branch
git checkout -b refactor/task-1-shared-types

# Make changes
# ...

# Commit
git add .
git commit -m "refactor: create shared types library

- Add lib/types directory structure
- Define User, Vehicle, TimeCard types
- Update all imports to use shared types
- Remove duplicate type definitions"

# Deploy to production
railway up --force
```

### Commit Message Format
```
<type>: <short description>

<detailed description>

- Bullet point changes
- Test results
- Breaking changes (if any)
```

**Types:**
- `refactor:` - Code restructuring
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `chore:` - Maintenance

---

## Success Metrics

### Phase 1 Complete When:
- [ ] All types centralized in lib/types
- [ ] All API endpoints have validation
- [ ] Centralized error handling implemented
- [ ] Database queries in service layer
- [ ] Large components broken down
- [ ] All tests pass
- [ ] Production deployment successful

### Quality Metrics:
- **Type Coverage:** 100% (no `any` types)
- **Validation Coverage:** 100% of POST/PUT endpoints
- **Error Handling:** 100% of API routes
- **Service Layer:** 100% of database operations
- **Component Size:** No files >500 lines

---

## Risk Mitigation

### High-Risk Changes
1. **Database Service Layer** - Could break existing functionality
   - **Mitigation:** Implement incrementally, test thoroughly

2. **Validation Layer** - Could reject valid requests
   - **Mitigation:** Start with permissive schemas, tighten gradually

3. **Component Refactoring** - Could break UI
   - **Mitigation:** Test all user flows after changes

### Rollback Plan
1. Keep production branch stable
2. Test thoroughly on feature branches
3. Have ability to revert deployments
4. Monitor error logs after deployment

---

## Summary

### Immediate Actions (This Week)
1. ⭐ **Task 1:** Create shared types library (1-2 days)
2. ⭐ **Task 2:** Add Zod validation (2-3 days)
3. ⭐ **Task 3:** Centralized error handling (1 day)

### Next Week
4. ⭐ **Task 4:** Database service layer (3-4 days)
5. ⭐ **Task 5:** Refactor large components (4-5 days)

### Success Criteria
After Phase 1, you will have:
- ✅ Enterprise-grade type safety
- ✅ Comprehensive input validation
- ✅ Consistent error handling
- ✅ Clean separation of concerns
- ✅ Maintainable, testable code

**The system will be ready for major features like booking/scheduling!**
