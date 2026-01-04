/**
 * Compliance Service
 *
 * Provides compliance checking and enforcement for:
 * - Driver qualification (medical cert, license, MVR, etc.)
 * - Vehicle compliance (registration, insurance, inspections, defects)
 * - Hours of Service (HOS) limits
 *
 * This service BLOCKS operations when compliance requirements are not met.
 */

import { BaseService } from './base.service';
import { HOS_LIMITS, calculateAvailableHours } from '@/lib/hos-config';

// ============================================================================
// Types
// ============================================================================

export type ComplianceViolationType =
  // Driver violations
  | 'medical_cert_missing'
  | 'medical_cert_expired'
  | 'license_missing'
  | 'license_expired'
  | 'mvr_missing'
  | 'mvr_expired'
  | 'annual_review_missing'
  | 'annual_review_expired'
  | 'road_test_missing'
  | 'dq_file_incomplete'
  | 'driver_inactive'
  | 'driver_open_violation'
  // Vehicle violations
  | 'vehicle_inactive'
  | 'registration_missing'
  | 'registration_expired'
  | 'insurance_missing'
  | 'insurance_expired'
  | 'dot_inspection_missing'
  | 'dot_inspection_expired'
  | 'critical_defect'
  | 'vehicle_open_violation'
  // HOS violations
  | 'hos_daily_driving_exceeded'
  | 'hos_daily_on_duty_exceeded'
  | 'hos_weekly_exceeded'
  | 'hos_insufficient_rest';

export type ComplianceSeverity = 'critical' | 'major' | 'minor' | 'warning';

export interface ComplianceViolation {
  type: ComplianceViolationType;
  severity: ComplianceSeverity;
  message: string;
  regulation?: string;
  expiryDate?: string;
  daysOverdue?: number;
}

export interface ComplianceCheckResult {
  isCompliant: boolean;
  canProceed: boolean;
  violations: ComplianceViolation[];
  warnings: ComplianceViolation[];
  allowsAdminOverride: boolean;
  primaryViolation?: ComplianceViolation;
}

export interface DriverComplianceResult extends ComplianceCheckResult {
  driverId: number;
  driverName?: string;
}

export interface VehicleComplianceResult extends ComplianceCheckResult {
  vehicleId: number;
  vehicleName?: string;
}

export interface AssignmentComplianceResult {
  canProceed: boolean;
  driverCompliance: DriverComplianceResult;
  vehicleCompliance: VehicleComplianceResult;
  hosCompliance: ComplianceCheckResult;
  allViolations: ComplianceViolation[];
  allWarnings: ComplianceViolation[];
  primaryViolation?: ComplianceViolation;
  allowsAdminOverride: boolean;
}

// Violations that CANNOT be overridden
const NON_OVERRIDABLE_VIOLATIONS: ComplianceViolationType[] = [
  'medical_cert_expired',
  'license_expired',
  'hos_daily_driving_exceeded',
  'hos_daily_on_duty_exceeded',
  'hos_weekly_exceeded',
  'critical_defect',
  'vehicle_inactive',
  'driver_inactive',
];

// ============================================================================
// Service Class
// ============================================================================

class ComplianceServiceImpl extends BaseService {
  protected get serviceName(): string {
    return 'ComplianceService';
  }

  // ==========================================================================
  // Driver Compliance Checks
  // ==========================================================================

  /**
   * Check all compliance requirements for a driver
   */
  async checkDriverCompliance(driverId: number): Promise<DriverComplianceResult> {
    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceViolation[] = [];

    // Get driver record
    const driver = await this.queryOne<{
      id: number;
      name: string;
      role: string;
      is_active: boolean;
      medical_cert_expiry: string | null;
      license_expiry: string | null;
      mvr_check_date: string | null;
      annual_review_date: string | null;
      road_test_date: string | null;
      dq_file_complete: boolean;
      employment_status: string;
    }>(
      `SELECT id, name, role, is_active,
              medical_cert_expiry, license_expiry,
              mvr_check_date, annual_review_date, road_test_date,
              dq_file_complete, employment_status
       FROM users
       WHERE id = $1 AND role = 'driver'`,
      [driverId]
    );

    if (!driver) {
      return {
        driverId,
        isCompliant: false,
        canProceed: false,
        violations: [
          {
            type: 'driver_inactive',
            severity: 'critical',
            message: 'Driver not found or not active',
          },
        ],
        warnings: [],
        allowsAdminOverride: false,
        primaryViolation: {
          type: 'driver_inactive',
          severity: 'critical',
          message: 'Driver not found or not active',
        },
      };
    }

    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Check if driver is active
    if (!driver.is_active || driver.employment_status !== 'active') {
      violations.push({
        type: 'driver_inactive',
        severity: 'critical',
        message: 'Driver is not active',
      });
    }

    // Check medical certificate
    if (!driver.medical_cert_expiry) {
      violations.push({
        type: 'medical_cert_missing',
        severity: 'critical',
        message: 'Medical certificate not on file',
        regulation: '49 CFR 391.41',
      });
    } else {
      const medCertDate = new Date(driver.medical_cert_expiry);
      if (medCertDate < today) {
        const daysOverdue = Math.floor(
          (today.getTime() - medCertDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        violations.push({
          type: 'medical_cert_expired',
          severity: 'critical',
          message: `Medical certificate expired on ${driver.medical_cert_expiry}`,
          regulation: '49 CFR 391.41',
          expiryDate: driver.medical_cert_expiry,
          daysOverdue,
        });
      } else if (medCertDate < thirtyDaysFromNow) {
        warnings.push({
          type: 'medical_cert_expired',
          severity: 'warning',
          message: `Medical certificate expires on ${driver.medical_cert_expiry}`,
          expiryDate: driver.medical_cert_expiry,
        });
      }
    }

    // Check driver license
    if (!driver.license_expiry) {
      violations.push({
        type: 'license_missing',
        severity: 'critical',
        message: "Driver's license not on file",
        regulation: '49 CFR 391.11',
      });
    } else {
      const licenseDate = new Date(driver.license_expiry);
      if (licenseDate < today) {
        const daysOverdue = Math.floor(
          (today.getTime() - licenseDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        violations.push({
          type: 'license_expired',
          severity: 'critical',
          message: `Driver's license expired on ${driver.license_expiry}`,
          regulation: '49 CFR 391.11',
          expiryDate: driver.license_expiry,
          daysOverdue,
        });
      } else if (licenseDate < thirtyDaysFromNow) {
        warnings.push({
          type: 'license_expired',
          severity: 'warning',
          message: `Driver's license expires on ${driver.license_expiry}`,
          expiryDate: driver.license_expiry,
        });
      }
    }

    // Check MVR (annual requirement)
    if (!driver.mvr_check_date) {
      violations.push({
        type: 'mvr_missing',
        severity: 'major',
        message: 'Motor Vehicle Record (MVR) check not on file',
        regulation: '49 CFR 391.25',
      });
    } else {
      const mvrDate = new Date(driver.mvr_check_date);
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (mvrDate < oneYearAgo) {
        violations.push({
          type: 'mvr_expired',
          severity: 'major',
          message: `MVR check expired (last check: ${driver.mvr_check_date})`,
          regulation: '49 CFR 391.25',
          expiryDate: driver.mvr_check_date,
        });
      }
    }

    // Check annual review
    if (!driver.annual_review_date) {
      violations.push({
        type: 'annual_review_missing',
        severity: 'major',
        message: 'Annual driver review not on file',
        regulation: '49 CFR 391.25',
      });
    } else {
      const reviewDate = new Date(driver.annual_review_date);
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (reviewDate < oneYearAgo) {
        violations.push({
          type: 'annual_review_expired',
          severity: 'major',
          message: `Annual review expired (last review: ${driver.annual_review_date})`,
          regulation: '49 CFR 391.25',
        });
      }
    }

    // Check road test (must have been completed)
    if (!driver.road_test_date) {
      violations.push({
        type: 'road_test_missing',
        severity: 'critical',
        message: 'Road test certificate not on file',
        regulation: '49 CFR 391.31',
      });
    }

    // Check for unresolved critical violations
    const openViolations = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*)::int as count
       FROM compliance_violations
       WHERE entity_type = 'driver'
         AND entity_id = $1
         AND resolved_date IS NULL
         AND severity = 'critical'`,
      [driverId]
    );

    if (openViolations && openViolations.count > 0) {
      violations.push({
        type: 'driver_open_violation',
        severity: 'critical',
        message: `Driver has ${openViolations.count} unresolved critical violation(s)`,
      });
    }

    // Determine if can proceed
    const criticalViolations = violations.filter((v) => v.severity === 'critical');
    const canProceed = criticalViolations.length === 0;
    const allowsOverride = !violations.some((v) =>
      NON_OVERRIDABLE_VIOLATIONS.includes(v.type)
    );

    return {
      driverId,
      driverName: driver.name,
      isCompliant: violations.length === 0,
      canProceed,
      violations,
      warnings,
      allowsAdminOverride: !canProceed && allowsOverride,
      primaryViolation: violations[0],
    };
  }

  // ==========================================================================
  // Vehicle Compliance Checks
  // ==========================================================================

  /**
   * Check all compliance requirements for a vehicle
   */
  async checkVehicleCompliance(vehicleId: number): Promise<VehicleComplianceResult> {
    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceViolation[] = [];

    // Get vehicle record
    const vehicle = await this.queryOne<{
      id: number;
      name: string;
      is_active: boolean;
      registration_expiry: string | null;
      insurance_expiry: string | null;
      last_dot_inspection: string | null;
    }>(
      `SELECT id, name, is_active,
              registration_expiry, insurance_expiry, last_dot_inspection
       FROM vehicles
       WHERE id = $1`,
      [vehicleId]
    );

    if (!vehicle) {
      return {
        vehicleId,
        isCompliant: false,
        canProceed: false,
        violations: [
          {
            type: 'vehicle_inactive',
            severity: 'critical',
            message: 'Vehicle not found',
          },
        ],
        warnings: [],
        allowsAdminOverride: false,
        primaryViolation: {
          type: 'vehicle_inactive',
          severity: 'critical',
          message: 'Vehicle not found',
        },
      };
    }

    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Check if vehicle is active
    if (!vehicle.is_active) {
      violations.push({
        type: 'vehicle_inactive',
        severity: 'critical',
        message: 'Vehicle is marked as inactive',
      });
    }

    // Check registration
    if (!vehicle.registration_expiry) {
      violations.push({
        type: 'registration_missing',
        severity: 'critical',
        message: 'Vehicle registration not on file',
      });
    } else {
      const regDate = new Date(vehicle.registration_expiry);
      if (regDate < today) {
        violations.push({
          type: 'registration_expired',
          severity: 'critical',
          message: `Vehicle registration expired on ${vehicle.registration_expiry}`,
          expiryDate: vehicle.registration_expiry,
        });
      } else if (regDate < thirtyDaysFromNow) {
        warnings.push({
          type: 'registration_expired',
          severity: 'warning',
          message: `Vehicle registration expires on ${vehicle.registration_expiry}`,
          expiryDate: vehicle.registration_expiry,
        });
      }
    }

    // Check insurance
    if (!vehicle.insurance_expiry) {
      violations.push({
        type: 'insurance_missing',
        severity: 'critical',
        message: 'Vehicle insurance not on file',
        regulation: '49 CFR 387.33',
      });
    } else {
      const insDate = new Date(vehicle.insurance_expiry);
      if (insDate < today) {
        violations.push({
          type: 'insurance_expired',
          severity: 'critical',
          message: `Vehicle insurance expired on ${vehicle.insurance_expiry}`,
          regulation: '49 CFR 387.33',
          expiryDate: vehicle.insurance_expiry,
        });
      } else if (insDate < thirtyDaysFromNow) {
        warnings.push({
          type: 'insurance_expired',
          severity: 'warning',
          message: `Vehicle insurance expires on ${vehicle.insurance_expiry}`,
          expiryDate: vehicle.insurance_expiry,
        });
      }
    }

    // Check DOT inspection (annual)
    if (!vehicle.last_dot_inspection) {
      violations.push({
        type: 'dot_inspection_missing',
        severity: 'critical',
        message: 'No DOT inspection on file',
        regulation: '49 CFR 396.17',
      });
    } else {
      const inspDate = new Date(vehicle.last_dot_inspection);
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (inspDate < oneYearAgo) {
        violations.push({
          type: 'dot_inspection_expired',
          severity: 'critical',
          message: `DOT inspection expired (last: ${vehicle.last_dot_inspection})`,
          regulation: '49 CFR 396.17',
          expiryDate: vehicle.last_dot_inspection,
        });
      }
    }

    // Check for unresolved critical defects
    const criticalDefects = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*)::int as count
       FROM inspections
       WHERE vehicle_id = $1
         AND defects_found = true
         AND defect_severity = 'critical'
         AND created_at = (
           SELECT MAX(created_at)
           FROM inspections
           WHERE vehicle_id = $1 AND defects_found = true
         )`,
      [vehicleId]
    );

    if (criticalDefects && criticalDefects.count > 0) {
      violations.push({
        type: 'critical_defect',
        severity: 'critical',
        message: 'Vehicle has unresolved critical defects from most recent inspection',
        regulation: '49 CFR 396.11',
      });
    }

    // Check for unresolved vehicle violations
    const openViolations = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*)::int as count
       FROM compliance_violations
       WHERE entity_type = 'vehicle'
         AND entity_id = $1
         AND resolved_date IS NULL
         AND severity = 'critical'`,
      [vehicleId]
    );

    if (openViolations && openViolations.count > 0) {
      violations.push({
        type: 'vehicle_open_violation',
        severity: 'critical',
        message: `Vehicle has ${openViolations.count} unresolved critical violation(s)`,
      });
    }

    // Determine if can proceed
    const criticalViolations = violations.filter((v) => v.severity === 'critical');
    const canProceed = criticalViolations.length === 0;
    const allowsOverride = !violations.some((v) =>
      NON_OVERRIDABLE_VIOLATIONS.includes(v.type)
    );

    return {
      vehicleId,
      vehicleName: vehicle.name,
      isCompliant: violations.length === 0,
      canProceed,
      violations,
      warnings,
      allowsAdminOverride: !canProceed && allowsOverride,
      primaryViolation: violations[0],
    };
  }

  // ==========================================================================
  // HOS Compliance Checks
  // ==========================================================================

  /**
   * Check HOS compliance for a driver on a specific date
   */
  async checkHOSCompliance(
    driverId: number,
    tourDate: Date
  ): Promise<ComplianceCheckResult> {
    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceViolation[] = [];

    // Get driving hours for the day
    const dailyHours = await this.queryOne<{
      driving_hours: number;
      on_duty_hours: number;
      off_duty_hours: number;
    }>(
      `SELECT
         COALESCE(SUM(
           CASE WHEN activity_type = 'driving'
           THEN EXTRACT(EPOCH FROM (end_time - start_time))/3600
           ELSE 0 END
         ), 0) as driving_hours,
         COALESCE(SUM(
           CASE WHEN activity_type IN ('driving', 'on_duty')
           THEN EXTRACT(EPOCH FROM (end_time - start_time))/3600
           ELSE 0 END
         ), 0) as on_duty_hours,
         COALESCE(SUM(
           CASE WHEN activity_type = 'off_duty'
           THEN EXTRACT(EPOCH FROM (end_time - start_time))/3600
           ELSE 0 END
         ), 0) as off_duty_hours
       FROM time_cards
       WHERE driver_id = $1
         AND DATE(clock_in_time) = $2`,
      [driverId, tourDate.toISOString().split('T')[0]]
    );

    // Get weekly hours (last 7 or 8 days based on cycle)
    const weeklyHours = await this.queryOne<{ total_hours: number }>(
      `SELECT COALESCE(SUM(total_hours_worked), 0) as total_hours
       FROM time_cards
       WHERE driver_id = $1
         AND DATE(clock_in_time) >= $2 - INTERVAL '7 days'
         AND DATE(clock_in_time) <= $2`,
      [driverId, tourDate.toISOString().split('T')[0]]
    );

    const drivingHours = dailyHours?.driving_hours || 0;
    const onDutyHours = dailyHours?.on_duty_hours || 0;
    const weeklyTotal = weeklyHours?.total_hours || 0;

    // Check daily driving limit (10 hours for passenger carriers)
    if (drivingHours >= HOS_LIMITS.MAX_DRIVING_HOURS) {
      violations.push({
        type: 'hos_daily_driving_exceeded',
        severity: 'critical',
        message: `Daily driving limit exceeded (${drivingHours.toFixed(1)} of ${HOS_LIMITS.MAX_DRIVING_HOURS} hours)`,
        regulation: '49 CFR 395.5',
      });
    } else if (drivingHours >= HOS_LIMITS.MAX_DRIVING_HOURS - 0.5) {
      warnings.push({
        type: 'hos_daily_driving_exceeded',
        severity: 'warning',
        message: `Approaching daily driving limit (${drivingHours.toFixed(1)} of ${HOS_LIMITS.MAX_DRIVING_HOURS} hours)`,
      });
    }

    // Check daily on-duty limit (15 hours for passenger carriers)
    if (onDutyHours >= HOS_LIMITS.MAX_ON_DUTY_HOURS) {
      violations.push({
        type: 'hos_daily_on_duty_exceeded',
        severity: 'critical',
        message: `Daily on-duty limit exceeded (${onDutyHours.toFixed(1)} of ${HOS_LIMITS.MAX_ON_DUTY_HOURS} hours)`,
        regulation: '49 CFR 395.5',
      });
    } else if (onDutyHours >= HOS_LIMITS.MAX_ON_DUTY_HOURS - 1) {
      warnings.push({
        type: 'hos_daily_on_duty_exceeded',
        severity: 'warning',
        message: `Approaching daily on-duty limit (${onDutyHours.toFixed(1)} of ${HOS_LIMITS.MAX_ON_DUTY_HOURS} hours)`,
      });
    }

    // Check weekly limit (60 or 70 hours)
    const weeklyLimit = HOS_LIMITS.MAX_HOURS_7_DAYS; // Default to 60/7
    if (weeklyTotal >= weeklyLimit) {
      violations.push({
        type: 'hos_weekly_exceeded',
        severity: 'critical',
        message: `Weekly hours limit exceeded (${weeklyTotal.toFixed(1)} of ${weeklyLimit} hours)`,
        regulation: '49 CFR 395.5',
      });
    } else if (weeklyTotal >= weeklyLimit - 5) {
      warnings.push({
        type: 'hos_weekly_exceeded',
        severity: 'warning',
        message: `Approaching weekly limit (${weeklyTotal.toFixed(1)} of ${weeklyLimit} hours)`,
      });
    }

    const canProceed = violations.length === 0;

    return {
      isCompliant: violations.length === 0,
      canProceed,
      violations,
      warnings,
      allowsAdminOverride: false, // HOS violations can NEVER be overridden
      primaryViolation: violations[0],
    };
  }

  // ==========================================================================
  // Combined Assignment Check
  // ==========================================================================

  /**
   * Check all compliance for a driver+vehicle assignment
   * This is the main entry point for blocking assignments
   */
  async checkAssignmentCompliance(
    driverId: number,
    vehicleId: number,
    tourDate: Date
  ): Promise<AssignmentComplianceResult> {
    // Run all checks in parallel
    const [driverCompliance, vehicleCompliance, hosCompliance] = await Promise.all([
      this.checkDriverCompliance(driverId),
      this.checkVehicleCompliance(vehicleId),
      this.checkHOSCompliance(driverId, tourDate),
    ]);

    // Combine all violations and warnings
    const allViolations = [
      ...driverCompliance.violations,
      ...vehicleCompliance.violations,
      ...hosCompliance.violations,
    ];

    const allWarnings = [
      ...driverCompliance.warnings,
      ...vehicleCompliance.warnings,
      ...hosCompliance.warnings,
    ];

    // Determine if can proceed (all checks must pass)
    const canProceed =
      driverCompliance.canProceed &&
      vehicleCompliance.canProceed &&
      hosCompliance.canProceed;

    // Determine if override is allowed (only if all individual checks allow it)
    const allowsOverride =
      !canProceed &&
      driverCompliance.allowsAdminOverride &&
      vehicleCompliance.allowsAdminOverride &&
      hosCompliance.allowsAdminOverride;

    return {
      canProceed,
      driverCompliance,
      vehicleCompliance,
      hosCompliance,
      allViolations,
      allWarnings,
      primaryViolation: allViolations[0],
      allowsAdminOverride: allowsOverride,
    };
  }

  // ==========================================================================
  // Audit Logging
  // ==========================================================================

  /**
   * Log a compliance check result to the audit log
   */
  async logComplianceCheck(
    actionType: string,
    actionEndpoint: string,
    result: AssignmentComplianceResult,
    context: {
      driverId?: number;
      vehicleId?: number;
      bookingId?: number;
      tourDate?: Date;
      triggeredBy?: number;
      requestIp?: string;
      userAgent?: string;
      wasOverridden?: boolean;
      overriddenBy?: number;
      overrideReason?: string;
    }
  ): Promise<void> {
    await this.query(
      `INSERT INTO compliance_audit_log (
        action_type, action_endpoint,
        driver_id, vehicle_id, booking_id,
        was_blocked, block_reason, violations,
        was_overridden, overridden_by, override_reason,
        tour_date, request_ip, user_agent, triggered_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        actionType,
        actionEndpoint,
        context.driverId || null,
        context.vehicleId || null,
        context.bookingId || null,
        !result.canProceed,
        result.primaryViolation?.message || null,
        JSON.stringify(result.allViolations),
        context.wasOverridden || false,
        context.overriddenBy || null,
        context.overrideReason || null,
        context.tourDate?.toISOString().split('T')[0] || null,
        context.requestIp || null,
        context.userAgent || null,
        context.triggeredBy || null,
      ]
    );
  }
}

// Export singleton instance
export const complianceService = new ComplianceServiceImpl();

// Note: Types (ComplianceCheckResult, DriverComplianceResult, etc.)
// are already exported above as interfaces
