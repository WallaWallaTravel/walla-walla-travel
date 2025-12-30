/**
 * Compliance Check Middleware
 *
 * Wraps API route handlers to enforce compliance checks before operations.
 * Returns 403 Forbidden when compliance violations prevent the operation.
 *
 * Usage:
 *   export const POST = withComplianceCheck(
 *     async (request, context) => { ... },
 *     {
 *       checkType: 'assignment',
 *       extractEntities: async (req, ctx) => ({
 *         driverId: body.driver_id,
 *         vehicleId: body.vehicle_id,
 *         tourDate: new Date(body.tour_date),
 *       }),
 *     }
 *   );
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  complianceService,
  AssignmentComplianceResult,
  ComplianceViolation,
} from '@/lib/services/compliance.service';
import { getServerSession } from '@/lib/auth';

// ============================================================================
// Types
// ============================================================================

export type ComplianceCheckType =
  | 'assignment' // Driver + Vehicle + HOS
  | 'driver' // Driver only
  | 'vehicle' // Vehicle only
  | 'hos' // HOS only
  | 'clock_in'; // HOS check for clock-in

export interface ComplianceEntityInfo {
  driverId?: number;
  vehicleId?: number;
  tourDate?: Date;
  bookingId?: number;
}

export interface ComplianceCheckConfig {
  /**
   * Type of compliance check to perform
   */
  checkType: ComplianceCheckType;

  /**
   * Extract entity IDs from the request
   */
  extractEntities: (
    request: NextRequest,
    context: { params: Record<string, string | string[]> }
  ) => Promise<ComplianceEntityInfo> | ComplianceEntityInfo;

  /**
   * Allow admin override (default: true for eligible violations)
   * Set to false to never allow override
   */
  allowOverride?: boolean;

  /**
   * Skip compliance check for certain conditions
   */
  skipIf?: (
    request: NextRequest,
    context: { params: Record<string, string | string[]> }
  ) => Promise<boolean> | boolean;
}

export interface ComplianceBlockedResponse {
  success: false;
  error: {
    code: 'COMPLIANCE_BLOCKED';
    message: string;
    operation: string;
    violations: ComplianceViolation[];
    warnings: ComplianceViolation[];
    canOverride: boolean;
    overrideInstructions?: string;
  };
}

type RouteHandler = (
  request: NextRequest,
  context: { params: Record<string, string | string[]> }
) => Promise<NextResponse>;

// ============================================================================
// Middleware Function
// ============================================================================

/**
 * Wrap an API route handler with compliance checking
 */
export function withComplianceCheck(
  handler: RouteHandler,
  config: ComplianceCheckConfig
): RouteHandler {
  return async (
    request: NextRequest,
    context: { params: Record<string, string | string[]> }
  ): Promise<NextResponse> => {
    // Check if we should skip compliance check
    if (config.skipIf) {
      const shouldSkip = await config.skipIf(request, context);
      if (shouldSkip) {
        return handler(request, context);
      }
    }

    // Extract entity information
    let entities: ComplianceEntityInfo;
    try {
      entities = await config.extractEntities(request, context);
    } catch (error) {
      // If we can't extract entities, proceed without compliance check
      // (the handler will fail with its own validation)
      console.warn('[ComplianceCheck] Failed to extract entities:', error);
      return handler(request, context);
    }

    // Perform compliance check based on type
    let result: AssignmentComplianceResult | null = null;

    try {
      switch (config.checkType) {
        case 'assignment':
          if (entities.driverId && entities.vehicleId && entities.tourDate) {
            result = await complianceService.checkAssignmentCompliance(
              entities.driverId,
              entities.vehicleId,
              entities.tourDate
            );
          }
          break;

        case 'driver':
          if (entities.driverId) {
            const driverResult = await complianceService.checkDriverCompliance(
              entities.driverId
            );
            result = {
              canProceed: driverResult.canProceed,
              driverCompliance: driverResult,
              vehicleCompliance: {
                vehicleId: 0,
                isCompliant: true,
                canProceed: true,
                violations: [],
                warnings: [],
                allowsAdminOverride: true,
              },
              hosCompliance: {
                isCompliant: true,
                canProceed: true,
                violations: [],
                warnings: [],
                allowsAdminOverride: true,
              },
              allViolations: driverResult.violations,
              allWarnings: driverResult.warnings,
              primaryViolation: driverResult.primaryViolation,
              allowsAdminOverride: driverResult.allowsAdminOverride,
            };
          }
          break;

        case 'vehicle':
          if (entities.vehicleId) {
            const vehicleResult = await complianceService.checkVehicleCompliance(
              entities.vehicleId
            );
            result = {
              canProceed: vehicleResult.canProceed,
              driverCompliance: {
                driverId: 0,
                isCompliant: true,
                canProceed: true,
                violations: [],
                warnings: [],
                allowsAdminOverride: true,
              },
              vehicleCompliance: vehicleResult,
              hosCompliance: {
                isCompliant: true,
                canProceed: true,
                violations: [],
                warnings: [],
                allowsAdminOverride: true,
              },
              allViolations: vehicleResult.violations,
              allWarnings: vehicleResult.warnings,
              primaryViolation: vehicleResult.primaryViolation,
              allowsAdminOverride: vehicleResult.allowsAdminOverride,
            };
          }
          break;

        case 'hos':
        case 'clock_in':
          if (entities.driverId) {
            const hosDate = entities.tourDate || new Date();
            const hosResult = await complianceService.checkHOSCompliance(
              entities.driverId,
              hosDate
            );
            result = {
              canProceed: hosResult.canProceed,
              driverCompliance: {
                driverId: entities.driverId,
                isCompliant: true,
                canProceed: true,
                violations: [],
                warnings: [],
                allowsAdminOverride: true,
              },
              vehicleCompliance: {
                vehicleId: 0,
                isCompliant: true,
                canProceed: true,
                violations: [],
                warnings: [],
                allowsAdminOverride: true,
              },
              hosCompliance: hosResult,
              allViolations: hosResult.violations,
              allWarnings: hosResult.warnings,
              primaryViolation: hosResult.primaryViolation,
              allowsAdminOverride: false, // HOS never allows override
            };
          }
          break;
      }
    } catch (error) {
      // Log error but don't block operation if compliance check fails
      console.error('[ComplianceCheck] Check failed:', error);
      // Continue to handler - fail-open for now
      return handler(request, context);
    }

    // If no result (missing entities), proceed to handler
    if (!result) {
      return handler(request, context);
    }

    // Check if admin is trying to override
    let isOverrideAttempt = false;
    let overrideReason: string | null = null;

    if (request.method === 'POST' || request.method === 'PUT') {
      try {
        const clonedRequest = request.clone();
        const body = await clonedRequest.json();
        isOverrideAttempt = body.compliance_override === true;
        overrideReason = body.compliance_override_reason || null;
      } catch {
        // Ignore JSON parse errors
      }
    }

    // If blocked and not overriding (or can't override)
    if (!result.canProceed) {
      const canOverride =
        config.allowOverride !== false && result.allowsAdminOverride;

      // If trying to override and allowed
      if (isOverrideAttempt && canOverride && overrideReason) {
        // Get session to log who is overriding
        const session = await getServerSession();

        // Log the override
        await complianceService.logComplianceCheck(
          config.checkType,
          request.nextUrl.pathname,
          result,
          {
            driverId: entities.driverId,
            vehicleId: entities.vehicleId,
            bookingId: entities.bookingId,
            tourDate: entities.tourDate,
            triggeredBy: session?.user?.id,
            requestIp:
              request.headers.get('x-forwarded-for') ||
              request.headers.get('x-real-ip') ||
              undefined,
            userAgent: request.headers.get('user-agent') || undefined,
            wasOverridden: true,
            overriddenBy: session?.user?.id,
            overrideReason,
          }
        );

        // Allow the operation to proceed
        return handler(request, context);
      }

      // Log the block
      const session = await getSessionFromRequest(request);
      await complianceService.logComplianceCheck(
        config.checkType,
        request.nextUrl.pathname,
        result,
        {
          driverId: entities.driverId,
          vehicleId: entities.vehicleId,
          bookingId: entities.bookingId,
          tourDate: entities.tourDate,
          triggeredBy: session?.user?.id,
          requestIp:
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        }
      );

      // Return blocked response
      const response: ComplianceBlockedResponse = {
        success: false,
        error: {
          code: 'COMPLIANCE_BLOCKED',
          message:
            result.primaryViolation?.message ||
            'Operation blocked due to compliance violations',
          operation: request.nextUrl.pathname,
          violations: result.allViolations,
          warnings: result.allWarnings,
          canOverride,
          overrideInstructions: canOverride
            ? 'To override, include compliance_override: true and compliance_override_reason: "reason" in your request body. Note: Some violations cannot be overridden.'
            : undefined,
        },
      };

      return NextResponse.json(response, { status: 403 });
    }

    // Compliance passed - log warnings if any
    if (result.allWarnings.length > 0) {
      const session = await getSessionFromRequest(request);
      await complianceService.logComplianceCheck(
        config.checkType,
        request.nextUrl.pathname,
        result,
        {
          driverId: entities.driverId,
          vehicleId: entities.vehicleId,
          bookingId: entities.bookingId,
          tourDate: entities.tourDate,
          triggeredBy: session?.user?.id,
        }
      );
    }

    // Proceed with the handler
    return handler(request, context);
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create entity extractor for common patterns
 */
export function createEntityExtractor(options: {
  driverIdField?: string;
  vehicleIdField?: string;
  tourDateField?: string;
  bookingIdField?: string;
  fromParams?: boolean;
}) {
  return async (
    request: NextRequest,
    context: { params: Record<string, string | string[]> }
  ): Promise<ComplianceEntityInfo> => {
    const entities: ComplianceEntityInfo = {};

    if (options.fromParams) {
      const params = await Promise.resolve(context.params);

      if (options.driverIdField && params[options.driverIdField]) {
        entities.driverId = parseInt(params[options.driverIdField] as string, 10);
      }
      if (options.vehicleIdField && params[options.vehicleIdField]) {
        entities.vehicleId = parseInt(params[options.vehicleIdField] as string, 10);
      }
      if (options.bookingIdField && params[options.bookingIdField]) {
        entities.bookingId = parseInt(params[options.bookingIdField] as string, 10);
      }
    }

    // Parse body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const clonedRequest = request.clone();
        const body = await clonedRequest.json();

        if (options.driverIdField && body[options.driverIdField]) {
          entities.driverId = parseInt(body[options.driverIdField], 10);
        }
        if (options.vehicleIdField && body[options.vehicleIdField]) {
          entities.vehicleId = parseInt(body[options.vehicleIdField], 10);
        }
        if (options.tourDateField && body[options.tourDateField]) {
          entities.tourDate = new Date(body[options.tourDateField]);
        }
        if (options.bookingIdField && body[options.bookingIdField]) {
          entities.bookingId = parseInt(body[options.bookingIdField], 10);
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    return entities;
  };
}

// ============================================================================
// Pre-built Configurations
// ============================================================================

/**
 * Standard configuration for driver/vehicle assignment
 */
export const assignmentComplianceConfig: ComplianceCheckConfig = {
  checkType: 'assignment',
  extractEntities: createEntityExtractor({
    driverIdField: 'driver_id',
    vehicleIdField: 'vehicle_id',
    tourDateField: 'tour_date',
    bookingIdField: 'booking_id',
    fromParams: true,
  }),
  allowOverride: true,
};

/**
 * Standard configuration for clock-in
 */
export const clockInComplianceConfig: ComplianceCheckConfig = {
  checkType: 'clock_in',
  extractEntities: createEntityExtractor({
    driverIdField: 'driver_id',
  }),
  allowOverride: false, // HOS violations cannot be overridden
};
