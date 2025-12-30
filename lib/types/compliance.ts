/**
 * Compliance Types
 *
 * Shared type definitions for the compliance enforcement system.
 * Used by:
 * - compliance.service.ts
 * - compliance-check.ts middleware
 * - API routes
 * - UI components
 */

// ============================================================================
// Violation Types
// ============================================================================

/**
 * All possible compliance violation types
 */
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

/**
 * Severity levels for violations
 */
export type ComplianceSeverity = 'critical' | 'major' | 'minor' | 'warning';

/**
 * Entities that can have compliance requirements
 */
export type ComplianceEntityType = 'driver' | 'vehicle' | 'operator';

// ============================================================================
// Violation & Check Results
// ============================================================================

/**
 * A single compliance violation
 */
export interface ComplianceViolation {
  /** Type of violation */
  type: ComplianceViolationType;
  /** Severity level */
  severity: ComplianceSeverity;
  /** Human-readable message */
  message: string;
  /** Regulatory reference (e.g., "49 CFR 391.41") */
  regulation?: string;
  /** When the item expired (if applicable) */
  expiryDate?: string;
  /** Days overdue (if expired) */
  daysOverdue?: number;
}

/**
 * Result of a compliance check
 */
export interface ComplianceCheckResult {
  /** True if no violations */
  isCompliant: boolean;
  /** True if operation can proceed (no critical violations) */
  canProceed: boolean;
  /** List of violations found */
  violations: ComplianceViolation[];
  /** List of warnings (non-blocking) */
  warnings: ComplianceViolation[];
  /** Whether admin can override this block */
  allowsAdminOverride: boolean;
  /** The most important violation (for display) */
  primaryViolation?: ComplianceViolation;
}

/**
 * Result of driver compliance check
 */
export interface DriverComplianceResult extends ComplianceCheckResult {
  driverId: number;
  driverName?: string;
}

/**
 * Result of vehicle compliance check
 */
export interface VehicleComplianceResult extends ComplianceCheckResult {
  vehicleId: number;
  vehicleName?: string;
}

/**
 * Combined result for assignment (driver + vehicle + HOS)
 */
export interface AssignmentComplianceResult {
  /** Can the assignment proceed */
  canProceed: boolean;
  /** Driver-specific compliance result */
  driverCompliance: DriverComplianceResult;
  /** Vehicle-specific compliance result */
  vehicleCompliance: VehicleComplianceResult;
  /** HOS compliance result */
  hosCompliance: ComplianceCheckResult;
  /** All violations combined */
  allViolations: ComplianceViolation[];
  /** All warnings combined */
  allWarnings: ComplianceViolation[];
  /** Most important violation */
  primaryViolation?: ComplianceViolation;
  /** Whether any violations can be overridden */
  allowsAdminOverride: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response when an operation is blocked due to compliance
 */
export interface ComplianceBlockedResponse {
  success: false;
  error: {
    code: 'COMPLIANCE_BLOCKED';
    /** Primary violation message */
    message: string;
    /** API endpoint that was blocked */
    operation: string;
    /** All violations */
    violations: ComplianceViolation[];
    /** All warnings */
    warnings: ComplianceViolation[];
    /** Whether admin can override */
    canOverride: boolean;
    /** Instructions for overriding (if allowed) */
    overrideInstructions?: string;
  };
}

/**
 * Request body fields for compliance override
 */
export interface ComplianceOverrideRequest {
  /** Set to true to attempt override */
  compliance_override: boolean;
  /** Required reason for override */
  compliance_override_reason: string;
}

// ============================================================================
// Compliance Requirements (Reference Data)
// ============================================================================

/**
 * A compliance requirement definition
 */
export interface ComplianceRequirement {
  id: string;
  /** Unique code (e.g., "DRV_MED_CERT") */
  requirementCode: string;
  /** Human-readable name */
  requirementName: string;
  /** Detailed description */
  description?: string;
  /** Regulatory reference */
  regulationReference?: string;
  /** Authority (FMCSA, UTC, State, etc.) */
  regulationAuthority?: string;
  /** What entity this applies to */
  appliesTo: ComplianceEntityType;
  /** Category (dq_file, medical, vehicle_inspection, etc.) */
  category?: string;
  /** Is this a recurring requirement */
  isRecurring: boolean;
  /** How often (daily, annual, biennial, etc.) */
  recurrenceInterval?: string;
  /** Days before expiry to show warning */
  warningDaysBefore: number;
  /** Days before expiry to show critical warning */
  criticalDaysBefore: number;
  /** Severity if requirement is not met */
  severityIfMissing: ComplianceSeverity;
  /** Does missing this put entity out of service */
  outOfServiceIfMissing: boolean;
}

/**
 * Status of a specific requirement for an entity
 */
export interface ComplianceStatusRecord {
  id: string;
  operatorId: string;
  entityType: ComplianceEntityType;
  entityId: number;
  requirementId: string;
  /** Current status */
  status: 'compliant' | 'warning' | 'expired' | 'missing' | 'not_applicable';
  /** When the compliance becomes effective */
  effectiveDate?: string;
  /** When it expires */
  expirationDate?: string;
  /** Last time it was completed/renewed */
  lastCompletedDate?: string;
  /** Days until expiry (negative if expired) */
  daysUntilExpiry?: number;
  /** Has warning been sent */
  warningSent: boolean;
  /** When warning was sent */
  warningSentAt?: string;
}

// ============================================================================
// Audit Log Types
// ============================================================================

/**
 * Compliance audit log entry
 */
export interface ComplianceAuditLogEntry {
  id: string;
  operatorId?: string;
  /** Type of action that was checked */
  actionType: string;
  /** API endpoint */
  actionEndpoint?: string;
  /** Driver involved (if any) */
  driverId?: number;
  /** Vehicle involved (if any) */
  vehicleId?: number;
  /** Booking involved (if any) */
  bookingId?: number;
  /** Was the operation blocked */
  wasBlocked: boolean;
  /** Reason for block */
  blockReason?: string;
  /** All violations that caused the block */
  violations?: ComplianceViolation[];
  /** Was an override used */
  wasOverridden: boolean;
  /** Who approved the override */
  overriddenBy?: number;
  /** Reason given for override */
  overrideReason?: string;
  /** Tour date (if applicable) */
  tourDate?: string;
  /** Request IP address */
  requestIp?: string;
  /** Request user agent */
  userAgent?: string;
  /** User who triggered the check */
  triggeredBy?: number;
  /** When the check happened */
  triggeredAt: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Violations that can NEVER be overridden
 * These are safety-critical and must be resolved
 */
export const NON_OVERRIDABLE_VIOLATIONS: ComplianceViolationType[] = [
  'medical_cert_expired',
  'license_expired',
  'hos_daily_driving_exceeded',
  'hos_daily_on_duty_exceeded',
  'hos_weekly_exceeded',
  'critical_defect',
  'vehicle_inactive',
  'driver_inactive',
];

/**
 * Check if a violation type can be overridden
 */
export function canOverrideViolation(type: ComplianceViolationType): boolean {
  return !NON_OVERRIDABLE_VIOLATIONS.includes(type);
}

/**
 * Get severity display color
 */
export function getSeverityColor(severity: ComplianceSeverity): string {
  switch (severity) {
    case 'critical':
      return 'red';
    case 'major':
      return 'orange';
    case 'minor':
      return 'yellow';
    case 'warning':
      return 'blue';
    default:
      return 'gray';
  }
}

/**
 * Get severity display label
 */
export function getSeverityLabel(severity: ComplianceSeverity): string {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'major':
      return 'Major';
    case 'minor':
      return 'Minor';
    case 'warning':
      return 'Warning';
    default:
      return 'Unknown';
  }
}
