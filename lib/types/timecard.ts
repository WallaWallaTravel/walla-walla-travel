/**
 * Time Card Type Definitions
 *
 * Centralized time tracking and shift management types for the Walla Walla Travel system.
 * Matches database schema: time_cards table
 */

/**
 * Time card status in database
 * Represents the state of a time card record
 */
export type TimeCardStatus = 'on_duty' | 'completed' | 'auto_closed';

/**
 * Clock status for UI display
 * Represents the current clock-in/out state
 */
export type ClockStatusType =
  | 'not_clocked_in'
  | 'clocked_in'
  | 'clocked_out'
  | 'already_clocked_in'
  | 'already_clocked_out';

/**
 * Clock API response status
 * All possible status values from clock in/out API
 */
export type ClockApiStatus =
  | 'success'
  | 'clocked_in'
  | 'clocked_out'
  | 'already_clocked_in'
  | 'already_clocked_out'
  | 'already_completed'
  | 'not_clocked_in'
  | 'no_vehicle'
  | 'vehicle_required'
  | 'vehicle_in_use'
  | 'vehicle_inactive'
  | 'invalid_vehicle'
  | 'incomplete_previous'
  | 'signature_required'
  | 'error';

/**
 * Clock API response
 * Response from clock in/out operations
 */
export interface ClockApiResponse {
  status: ClockApiStatus;
  message: string;
  suggestions?: string[];
  reminders?: string[];
  warnings?: string[];
  details?: string;
  timeCard?: TimeCard;
  vehicle?: string;
  summary?: {
    totalHours: string | number;
    startTime?: string;
    endTime?: string;
  };
}

/**
 * Shift type classification
 */
export type ShiftType = 'driving' | 'non_driving';

/**
 * Break type classification
 */
export type BreakType = 'rest' | 'meal' | 'personal';

/**
 * Time card record (from database)
 * Matches time_cards table schema
 */
export interface TimeCard {
  /** Unique time card identifier */
  id: number;
  /** Driver ID (references users table) */
  driver_id: number;
  /** Vehicle ID (nullable for non-driving shifts) */
  vehicle_id?: number | null;
  /** Date of the shift (YYYY-MM-DD) */
  date: string;
  /** Work reporting location description */
  work_reporting_location?: string;
  /** Work reporting latitude coordinate */
  work_reporting_lat?: number | null;
  /** Work reporting longitude coordinate */
  work_reporting_lng?: number | null;
  /** Clock in timestamp */
  clock_in_time: string;
  /** Clock out timestamp (null if still clocked in) */
  clock_out_time?: string | null;
  /** Total on-duty hours */
  on_duty_hours?: number | null;
  /** Driver's digital signature */
  driver_signature?: string | null;
  /** When signature was captured */
  signature_timestamp?: string | null;
  /** Time card status */
  status: TimeCardStatus;
  /** Additional notes */
  notes?: string | null;
  /** Record creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Clock status response (for UI)
 * Provides current clock-in/out state and related information
 */
export interface ClockStatus {
  /** Current clock status */
  status: ClockStatusType;
  /** Status message for display */
  message: string;
  /** Whether driver can clock in */
  canClockIn: boolean;
  /** Whether driver can clock out */
  canClockOut: boolean;
  /** Current active time card */
  timeCard?: TimeCard;
  /** Vehicle description (if assigned) */
  vehicle?: string;
  /** Hours worked in current shift */
  hoursWorked?: string;
  /** Last shift information */
  lastShift?: {
    /** Clock in time (formatted) */
    clockIn: string;
    /** Clock out time (formatted) */
    clockOut: string;
    /** Total hours worked */
    totalHours: string;
    /** Vehicle used */
    vehicle: string;
  };
}

/**
 * Active time card with driver and vehicle details
 * Used in supervisor dashboard and admin views
 */
export interface ActiveShift {
  /** Time card identifier */
  time_card_id: number;
  /** Driver ID */
  driver_id: number;
  /** Driver full name */
  driver_name: string;
  /** Driver email */
  driver_email: string;
  /** Vehicle ID (if assigned) */
  vehicle_id: number | null;
  /** Vehicle number */
  vehicle_number: string | null;
  /** Vehicle make */
  make: string | null;
  /** Vehicle model */
  model: string | null;
  /** Clock in timestamp */
  clock_in_time: string;
  /** Shift status */
  shift_status: string;
  /** Work reporting location */
  work_reporting_location: string;
  /** Client service ID (if serving a client) */
  client_service_id: number | null;
  /** Client name (if serving a client) */
  client_name: string | null;
  /** Hourly rate for service */
  hourly_rate: number | null;
  /** Service status */
  service_status: string | null;
  /** Service pickup time */
  pickup_time: string | null;
  /** Service dropoff time */
  dropoff_time: string | null;
  /** Service hours */
  service_hours: number | null;
  /** Total service cost */
  total_cost: number | null;
  /** Name of admin who assigned vehicle */
  assigned_by_name: string | null;
}

/**
 * Shift summary for display
 * Simplified view for history and reports
 */
export interface ShiftSummary {
  /** Time card identifier */
  id: number;
  /** Shift date */
  date: string;
  /** Clock in time (formatted) */
  clockIn: string;
  /** Clock out time (formatted) */
  clockOut: string;
  /** Total hours worked */
  totalHours: string;
  /** Vehicle used */
  vehicle: string;
  /** Shift status */
  status: TimeCardStatus;
}

/**
 * Location data
 * GPS coordinates for clock in/out
 */
export interface LocationData {
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
}

/**
 * Clock in request data
 * Data required to clock in a driver
 */
export interface ClockInData {
  /** Action type */
  action: 'clock_in';
  /** Vehicle ID (null for non-driving shifts) */
  vehicleId?: number | null;
  /** GPS location */
  location?: LocationData;
  /** Work reporting location description */
  workReportingLocation?: string;
  /** Whether this is a non-driving shift */
  isNonDrivingShift?: boolean;
  /** Starting mileage */
  startMileage?: number;
}

/**
 * Clock out request data
 * Data required to clock out a driver
 */
export interface ClockOutData {
  /** Action type */
  action: 'clock_out';
  /** Driver's digital signature */
  signature: string;
  /** GPS location */
  location?: LocationData;
  /** Ending mileage */
  endMileage?: number;
  /** Force clock out (admin override) */
  forceClockOut?: boolean;
}

/**
 * Clock action request
 * Union type for clock in/out actions
 */
export type ClockRequest = ClockInData | ClockOutData;

/**
 * Break request data
 * Data for starting/ending breaks
 */
export interface BreakData {
  /** Break action */
  action: 'start' | 'end';
  /** Type of break */
  type?: BreakType;
  /** Additional notes */
  notes?: string;
}

/**
 * Time card with full details
 * Complete time card with all related information
 */
export interface TimeCardWithDetails extends TimeCard {
  /** Driver name */
  driver_name: string;
  /** Driver email */
  driver_email: string;
  /** Vehicle number (if assigned) */
  vehicle_number?: string | null;
  /** Vehicle make */
  vehicle_make?: string | null;
  /** Vehicle model */
  vehicle_model?: string | null;
  /** Client name (if serving) */
  client_name?: string | null;
  /** Service hours */
  service_hours?: number | null;
  /** Service cost */
  service_cost?: number | null;
}

/**
 * Hours of service (HOS) summary
 * Summary of hours worked for compliance
 */
export interface HOSSummary {
  /** Driver ID */
  driver_id: number;
  /** Week start date */
  week_start: string;
  /** Total on-duty hours */
  total_on_duty: number;
  /** Total driving hours */
  total_driving: number;
  /** Days worked */
  days_worked: number;
  /** Whether in compliance */
  is_compliant: boolean;
  /** Warnings or violations */
  warnings: string[];
}

/**
 * Daily time card summary
 * Summary for a specific day
 */
export interface DailyTimeCardSummary {
  /** Date */
  date: string;
  /** Number of shifts */
  shift_count: number;
  /** Total hours worked */
  total_hours: number;
  /** Completed shifts */
  completed_shifts: number;
  /** Active shifts */
  active_shifts: number;
}

/**
 * Time card statistics
 * Aggregated statistics for reporting
 */
export interface TimeCardStatistics {
  /** Total shifts today */
  total_today: number;
  /** Active shifts */
  active: number;
  /** Completed shifts today */
  completed: number;
  /** Average hours per shift */
  avg_hours: number;
  /** Total hours today */
  total_hours: number;
}

/**
 * Create time card data
 * Data required to create a new time card
 */
export interface CreateTimeCardData {
  /** Driver ID */
  driver_id: number;
  /** Vehicle ID (nullable) */
  vehicle_id?: number | null;
  /** Shift date */
  date: string;
  /** Work reporting location */
  work_reporting_location: string;
  /** Location latitude */
  work_reporting_lat?: number | null;
  /** Location longitude */
  work_reporting_lng?: number | null;
  /** Clock in time (defaults to now) */
  clock_in_time?: string;
  /** Initial status (defaults to 'on_duty') */
  status?: TimeCardStatus;
  /** Notes */
  notes?: string;
}

/**
 * Update time card data
 * Data for updating an existing time card
 */
export interface UpdateTimeCardData {
  /** Clock out time */
  clock_out_time?: string;
  /** On-duty hours */
  on_duty_hours?: number;
  /** Driver signature */
  driver_signature?: string;
  /** Signature timestamp */
  signature_timestamp?: string;
  /** Status */
  status?: TimeCardStatus;
  /** Notes */
  notes?: string;
}
