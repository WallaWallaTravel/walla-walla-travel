/**
 * Inspection Type Definitions
 *
 * Centralized inspection and defect types for the Walla Walla Travel system.
 * Covers pre-trip, post-trip, DVIR, and defect tracking workflows.
 * Matches database schema: inspections table, vehicles defect fields
 */

/**
 * Type of inspection being performed
 */
export type InspectionType = 'pre_trip' | 'post_trip' | 'dvir';

/**
 * Defect severity classification
 * - none: No defects found
 * - minor: Minor issues that don't affect safety
 * - critical: Safety-critical issues requiring immediate attention
 */
export type DefectSeverity = 'none' | 'minor' | 'critical';

/**
 * Inspection completion status
 */
export type InspectionStatus = 'pending' | 'in_progress' | 'completed';

/**
 * Defect category classification
 * Used for organizing and tracking different types of vehicle defects
 */
export type DefectCategory =
  | 'tires'
  | 'brakes'
  | 'lights'
  | 'engine'
  | 'fluid'
  | 'body'
  | 'safety'
  | 'interior'
  | 'electrical'
  | 'other';

/**
 * Inspection checkpoint status
 * Result of an individual inspection item check
 */
export type CheckpointStatus = 'pass' | 'fail' | 'not_applicable';

/**
 * Base inspection record (from database)
 * Matches inspections table schema
 */
export interface Inspection {
  /** Unique inspection identifier */
  id: number;
  /** Driver who performed the inspection */
  driver_id: number;
  /** Vehicle being inspected */
  vehicle_id: number;
  /** Time card ID (links inspection to specific shift) */
  time_card_id?: number | null;
  /** Type of inspection */
  type: InspectionType;
  /** Starting odometer reading (pre-trip) */
  start_mileage?: number | null;
  /** Ending odometer reading (post-trip) */
  end_mileage?: number | null;
  /** Inspection checkpoint data (JSON) */
  inspection_data: Record<string, unknown>;
  /** Issues or notes description */
  issues_description?: string | null;
  /** Whether defects were found */
  defects_found: boolean;
  /** Severity of defects found */
  defect_severity?: DefectSeverity | null;
  /** Description of defects */
  defect_description?: string | null;
  /** Digital signature (base64) */
  signature?: string | null;
  /** When inspection was created */
  created_at: string;
  /** Last update timestamp */
  updated_at?: string;
}

/**
 * Pre-trip inspection record
 * Extended inspection for pre-trip workflow
 */
export interface PreTripInspection extends Inspection {
  /** Type is always 'pre_trip' */
  type: 'pre_trip';
  /** Starting mileage is required for pre-trip */
  start_mileage: number;
  /** Inspection checkpoints */
  inspection_data: PreTripCheckpoints;
}

/**
 * Post-trip inspection record
 * Extended inspection for post-trip workflow
 */
export interface PostTripInspection extends Inspection {
  /** Type is always 'post_trip' */
  type: 'post_trip';
  /** Ending mileage is required for post-trip */
  end_mileage: number;
  /** Inspection checkpoints */
  inspection_data: PostTripCheckpoints;
}

/**
 * DVIR (Driver Vehicle Inspection Report) record
 * Federal compliance requirement for defect reporting
 */
export interface DVIRInspection extends Inspection {
  /** Type is always 'dvir' */
  type: 'dvir';
  /** DVIR-specific data */
  inspection_data: DVIRData;
  /** Mechanic signature for repairs */
  mechanic_signature?: string | null;
  /** Mechanic notes on repairs performed */
  mechanic_notes?: string | null;
  /** Whether repairs have been completed */
  repair_completed: boolean;
  /** When repairs were completed */
  repair_completed_at?: string | null;
}

/**
 * Pre-trip inspection checkpoints
 * All items that must be checked during pre-trip
 * Supports both flat (items) and nested (exterior/interior/engine) formats
 */
export interface PreTripCheckpoints {
  /** Index signature for compatibility with Record<string, unknown> */
  [key: string]: unknown;
  /** Flat items format (for form submission) */
  items?: Record<string, boolean>;
  /** Additional notes */
  notes?: string;
  /** Driver signature */
  signature?: string;
  /** Exterior checks (nested format) */
  exterior?: {
    /** All lights functioning */
    lights: boolean;
    /** Tires properly inflated, no damage */
    tires: boolean;
    /** Body damage check */
    body: boolean;
    /** Mirrors properly adjusted */
    mirrors: boolean;
    /** Windows clean and intact */
    windows: boolean;
    /** License plates visible */
    license_plates: boolean;
  };
  /** Interior checks (nested format) */
  interior?: {
    /** Seats properly secured */
    seats: boolean;
    /** All seatbelts functioning */
    seatbelts: boolean;
    /** Emergency exits clear */
    emergency_exits: boolean;
    /** Fire extinguisher present */
    fire_extinguisher: boolean;
    /** First aid kit present */
    first_aid_kit: boolean;
    /** Windshield wipers functioning */
    wipers: boolean;
  };
  /** Engine and mechanical checks (nested format) */
  engine?: {
    /** Fluid levels adequate */
    fluids: boolean;
    /** Belts and hoses intact */
    belts: boolean;
    /** Battery secure and charged */
    battery: boolean;
    /** No unusual noises */
    no_unusual_noises: boolean;
    /** Brakes functioning properly */
    brakes: boolean;
    /** Steering responsive */
    steering: boolean;
  };
}

/**
 * Post-trip inspection checkpoints
 * All items that must be checked during post-trip
 */
export interface PostTripCheckpoints {
  /** Index signature for compatibility with Record<string, unknown> */
  [key: string]: unknown;
  /** Items from pre-trip checks */
  items: Record<string, boolean>;
  /** Fuel level at end of shift */
  fuel_level?: string;
  /** Alternate fuel level field name (camelCase compatibility) */
  fuelLevel?: string;
  /** Additional notes */
  notes?: string;
  /** Driver signature */
  signature?: string;
  /** List of defects found (flexible format for form submission) */
  defects?: Array<{
    id: string;
    description: string;
    severity: string;
    photo?: string;
  }>;
  /** Whether vehicle is safe to operate */
  vehicleSafe?: boolean;
  /** Mechanic signature for repairs */
  mechanicSignature?: string | null;
  /** Whether defects were found */
  defectsFound?: boolean;
  /** Severity of defects found */
  defectSeverity?: DefectSeverity | '';
  /** Description of defects */
  defectDescription?: string | null;
}

/**
 * DVIR data structure
 * Federal DVIR compliance data
 */
export interface DVIRData {
  /** Index signature for compatibility with Record<string, unknown> */
  [key: string]: unknown;
  /** List of defects found */
  defects: DefectItem[];
  /** Driver remarks */
  driver_remarks?: string;
  /** Mechanic remarks */
  mechanic_remarks?: string;
  /** Certification that repairs are completed */
  mechanic_certification?: boolean;
}

/**
 * Individual defect item
 * Tracks specific vehicle defects
 */
export interface DefectItem {
  /** Defect identifier */
  id: string;
  /** Vehicle with the defect */
  vehicle_id: number;
  /** User who reported the defect */
  reported_by: number;
  /** When defect was reported */
  reported_at: string;
  /** Category of defect */
  category: DefectCategory;
  /** Severity level */
  severity: DefectSeverity;
  /** Description of the defect */
  description: string;
  /** Photo evidence (base64 or URL) */
  photo?: string;
  /** Whether defect has been resolved */
  resolved: boolean;
  /** User who resolved the defect */
  resolved_by?: number | null;
  /** When defect was resolved */
  resolved_at?: string | null;
  /** Notes on resolution */
  resolution_notes?: string | null;
}

/**
 * Individual inspection checkpoint
 * Single item being checked during inspection
 */
export interface InspectionCheckpoint {
  /** Name/identifier of checkpoint */
  checkpoint_name: string;
  /** Result of the check */
  status: CheckpointStatus;
  /** Additional notes about this checkpoint */
  notes?: string;
}

/**
 * Pre-trip form submission data
 * Data structure for submitting pre-trip inspection
 */
export interface PreTripFormData {
  /** Vehicle being inspected */
  vehicle_id: number;
  /** Starting mileage */
  start_mileage: number;
  /** All inspection checkpoints */
  checkpoints: PreTripCheckpoints;
  /** Defects found during inspection */
  defects?: DefectItem[];
  /** Overall defect severity */
  defect_severity?: DefectSeverity;
  /** Defect description */
  defect_description?: string;
  /** Driver's digital signature */
  signature?: string;
  /** Additional notes */
  notes?: string;
}

/**
 * Post-trip form submission data
 * Data structure for submitting post-trip inspection
 */
export interface PostTripFormData {
  /** Vehicle being inspected */
  vehicle_id: number;
  /** Ending mileage */
  end_mileage: number;
  /** All inspection checkpoints */
  checkpoints: PostTripCheckpoints;
  /** Defects found during inspection */
  defects?: DefectItem[];
  /** Overall defect severity */
  defect_severity?: DefectSeverity;
  /** Defect description */
  defect_description?: string;
  /** Whether defects were found */
  defects_found?: boolean;
  /** Fuel level at end of shift */
  fuel_level?: string;
  /** Driver's digital signature */
  signature?: string;
  /** Additional notes */
  notes?: string;
}

/**
 * DVIR form submission data
 * Data structure for submitting DVIR report
 */
export interface DVIRFormData {
  /** Vehicle being inspected */
  vehicle_id: number;
  /** List of defects */
  defects: DefectItem[];
  /** Driver remarks */
  driver_remarks?: string;
  /** Driver's digital signature */
  driver_signature: string;
  /** Mechanic signature (if repairs made) */
  mechanic_signature?: string;
  /** Mechanic notes on repairs */
  mechanic_notes?: string;
  /** Whether repairs are completed */
  repair_completed?: boolean;
}

/**
 * Inspection summary for displays
 * Simplified view for dashboards and lists
 */
export interface InspectionSummary {
  /** Inspection identifier */
  id: number;
  /** Driver name */
  driver_name: string;
  /** Driver ID */
  driver_id: number;
  /** Vehicle number */
  vehicle_number: string;
  /** Vehicle ID */
  vehicle_id: number;
  /** Type of inspection */
  inspection_type: InspectionType;
  /** Inspection date */
  date: string;
  /** Inspection status */
  status: InspectionStatus;
  /** Number of defects found */
  defects_count: number;
  /** Highest severity of defects */
  max_severity?: DefectSeverity;
  /** Whether inspection is complete */
  is_complete: boolean;
}

/**
 * Inspection with full details
 * Complete inspection with driver and vehicle information
 */
export interface InspectionWithDetails extends Inspection {
  /** Driver name */
  driver_name: string;
  /** Driver email */
  driver_email: string;
  /** Vehicle number */
  vehicle_number: string;
  /** Vehicle make */
  vehicle_make: string;
  /** Vehicle model */
  vehicle_model: string;
  /** Time card date (if linked) */
  time_card_date?: string;
}

/**
 * Defect report
 * Summary of defects for tracking and resolution
 */
export interface DefectReport {
  /** Defect identifier */
  id: string;
  /** Vehicle number */
  vehicle_number: string;
  /** Vehicle ID */
  vehicle_id: number;
  /** Driver who reported */
  driver_name: string;
  /** Driver ID */
  driver_id: number;
  /** Defect category */
  category: DefectCategory;
  /** Severity level */
  severity: DefectSeverity;
  /** Description */
  description: string;
  /** When reported */
  reported_at: string;
  /** Days since reported */
  age_days: number;
  /** Resolution status */
  status: 'open' | 'in_progress' | 'resolved';
  /** Priority level (based on severity and age) */
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Inspection history
 * Historical inspection data for a vehicle or driver
 */
export interface InspectionHistory {
  /** Total number of inspections */
  total_inspections: number;
  /** Number of inspections with defects */
  inspections_with_defects: number;
  /** Recent inspections */
  recent_inspections: InspectionSummary[];
  /** Summary statistics */
  statistics: {
    /** Average defects per inspection */
    avg_defects_per_inspection: number;
    /** Most common defect category */
    most_common_category?: DefectCategory;
    /** Trend: improving, stable, declining */
    trend: 'improving' | 'stable' | 'declining';
  };
}

/**
 * Inspection requirement status
 * Indicates whether inspections are required
 */
export interface InspectionRequirement {
  /** Whether pre-trip is required */
  pre_trip_required: boolean;
  /** Reason pre-trip is/isn't required */
  pre_trip_reason: string;
  /** Whether post-trip is required */
  post_trip_required: boolean;
  /** Reason post-trip is/isn't required */
  post_trip_reason: string;
  /** Whether DVIR is required */
  dvir_required: boolean;
  /** Reason DVIR is/isn't required */
  dvir_reason: string;
  /** Last pre-trip inspection (if any) */
  last_pre_trip?: InspectionSummary;
  /** Last post-trip inspection (if any) */
  last_post_trip?: InspectionSummary;
}

/**
 * Inspection statistics
 * Aggregated inspection data for reporting
 */
export interface InspectionStatistics {
  /** Date range for statistics */
  date_range: {
    start: string;
    end: string;
  };
  /** Total inspections performed */
  total_inspections: number;
  /** Breakdown by type */
  by_type: {
    pre_trip: number;
    post_trip: number;
    dvir: number;
  };
  /** Breakdown by defect severity */
  by_severity: {
    none: number;
    minor: number;
    critical: number;
  };
  /** Compliance rate (percentage) */
  compliance_rate: number;
  /** Average time to complete inspection (minutes) */
  avg_completion_time?: number;
  /** Top defect categories */
  top_defect_categories: Array<{
    category: DefectCategory;
    count: number;
  }>;
}

/**
 * Create inspection data
 * Data required to create a new inspection
 */
export interface CreateInspectionData {
  /** Driver ID */
  driver_id: number;
  /** Vehicle ID */
  vehicle_id: number;
  /** Time card ID (optional) */
  time_card_id?: number | null;
  /** Inspection type */
  type: InspectionType;
  /** Starting mileage (for pre-trip) */
  start_mileage?: number;
  /** Ending mileage (for post-trip) */
  end_mileage?: number;
  /** Inspection data */
  inspection_data: Record<string, unknown>;
  /** Issues description */
  issues_description?: string;
  /** Defects found */
  defects_found?: boolean;
  /** Defect severity */
  defect_severity?: DefectSeverity;
  /** Defect description */
  defect_description?: string;
  /** Signature */
  signature?: string;
}

/**
 * Update inspection data
 * Data for updating an existing inspection
 */
export interface UpdateInspectionData {
  /** Inspection data */
  inspection_data?: Record<string, unknown>;
  /** Issues description */
  issues_description?: string;
  /** Defects found */
  defects_found?: boolean;
  /** Defect severity */
  defect_severity?: DefectSeverity;
  /** Defect description */
  defect_description?: string;
  /** Signature */
  signature?: string;
  /** Mechanic signature */
  mechanic_signature?: string;
  /** Mechanic notes */
  mechanic_notes?: string;
  /** Repair completed */
  repair_completed?: boolean;
}
