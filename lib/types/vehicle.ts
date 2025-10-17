/**
 * Vehicle Type Definitions
 *
 * Centralized vehicle and fleet types for the Walla Walla Travel system.
 * Matches database schema: vehicles table
 */

/**
 * Vehicle status
 * Matches database constraint in migrations/000_combined_safety_features.sql
 */
export type VehicleStatus =
  | 'available'
  | 'assigned'
  | 'in_use'
  | 'out_of_service'
  | 'maintenance';

/**
 * Vehicle availability status for real-time tracking
 * Used in dashboard and fleet management views
 */
export type AvailabilityStatus = 'available' | 'in_use' | 'out_of_service';

/**
 * Vehicle information (from database)
 * Matches vehicles table schema
 */
export interface Vehicle {
  /** Unique vehicle identifier */
  id: number;
  /** Vehicle number (unique identifier, e.g., "Sprinter 1") */
  vehicle_number: string;
  /** Vehicle manufacturer */
  make: string;
  /** Vehicle model */
  model: string;
  /** Vehicle year */
  year?: number;
  /** Vehicle identification number */
  vin?: string;
  /** License plate number */
  license_plate?: string;
  /** Passenger capacity */
  capacity?: number;
  /** Current odometer reading */
  current_mileage?: number;
  /** Whether the vehicle is active */
  is_active: boolean;
  /** Current vehicle status */
  status: VehicleStatus;
  /** Defect notes if vehicle has issues */
  defect_notes?: string | null;
  /** When defect was reported */
  defect_reported_at?: string | null;
  /** User ID who reported the defect */
  defect_reported_by?: number | null;
  /** Record creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Assigned vehicle (simplified view)
 * Used in driver workflows and vehicle selection
 */
export interface AssignedVehicle {
  /** Vehicle identifier */
  id: number;
  /** Vehicle number */
  vehicle_number: string;
  /** Vehicle make */
  make: string;
  /** Vehicle model */
  model: string;
  /** Vehicle year */
  year?: number;
  /** VIN */
  vin?: string;
  /** License plate */
  license_plate?: string;
  /** Current mileage */
  current_mileage?: number;
}

/**
 * Fleet vehicle (admin/supervisor view)
 * Extended vehicle information with current usage data
 */
export interface FleetVehicle {
  /** Vehicle identifier */
  vehicle_id: number;
  /** Vehicle number */
  vehicle_number: string;
  /** Vehicle make */
  make: string;
  /** Vehicle model */
  model: string;
  /** Vehicle year */
  year: number;
  /** Passenger capacity */
  capacity: number;
  /** Vehicle status */
  status: string;
  /** License plate */
  license_plate: string;
  /** Defect notes if any */
  defect_notes: string | null;
  /** Current driver name if in use */
  current_driver_name: string | null;
  /** When current usage started */
  in_use_since: string | null;
  /** Current client being served */
  current_client: string | null;
  /** Real-time availability status */
  availability_status: AvailabilityStatus;
}

/**
 * Vehicle with driver information
 * Used when displaying vehicle assignments
 */
export interface VehicleWithDriver extends Vehicle {
  /** Assigned driver name */
  driver_name?: string;
  /** Assigned driver email */
  driver_email?: string;
  /** Driver ID */
  driver_id?: number;
}

/**
 * Vehicle assignment record
 * Tracks vehicle-to-driver assignments
 */
export interface VehicleAssignment {
  /** Assignment identifier */
  id: number;
  /** Driver ID */
  driver_id: number;
  /** Vehicle ID */
  vehicle_id: number;
  /** Admin user who made the assignment */
  assigned_by: number;
  /** When assignment was made */
  assigned_at: string;
  /** Assignment status */
  status: 'active' | 'completed' | 'cancelled';
}

/**
 * Vehicle document
 * Tracks registration, insurance, inspection records
 */
export interface VehicleDocument {
  /** Document identifier */
  id: number;
  /** Vehicle ID */
  vehicle_id: number;
  /** Document type */
  document_type: 'registration' | 'insurance' | 'inspection' | 'maintenance';
  /** Document name */
  document_name: string;
  /** Document URL (cloud storage) */
  document_url: string;
  /** Document expiry date */
  expiry_date?: string;
  /** Whether document is active */
  is_active: boolean;
  /** When document was uploaded */
  created_at: string;
}

/**
 * Grouped vehicle documents
 * Documents organized by type for easy display
 */
export interface GroupedVehicleDocuments {
  /** Registration document */
  registration?: {
    url: string;
    expiresInDays: number | null;
    isExpired: boolean;
  };
  /** Insurance certificate */
  insurance?: {
    url: string;
    expiresInDays: number | null;
    isExpired: boolean;
  };
  /** DOT inspection records */
  inspection?: {
    url: string;
  };
  /** Maintenance history */
  maintenance?: {
    url: string;
  };
}

/**
 * Vehicle selector option
 * Used in vehicle selection dropdowns/lists
 */
export interface VehicleSelectorOption {
  /** Vehicle ID */
  id: number;
  /** Vehicle number */
  vehicle_number: string;
  /** Vehicle make and model */
  make_model: string;
  /** License plate */
  license_plate?: string;
  /** Whether vehicle is available */
  is_available: boolean;
  /** Current driver if in use */
  current_driver?: string;
}

/**
 * Fleet statistics
 * Summary statistics for fleet management
 */
export interface FleetStatistics {
  /** Total number of vehicles */
  total: number;
  /** Number of available vehicles */
  available: number;
  /** Number of vehicles in use */
  in_use: number;
  /** Number of vehicles out of service */
  out_of_service: number;
  /** Fleet utilization rate (percentage) */
  utilization_rate: number;
}

/**
 * Vehicle update data
 * Used when updating vehicle information
 */
export interface UpdateVehicleData {
  /** Updated vehicle number */
  vehicle_number?: string;
  /** Updated make */
  make?: string;
  /** Updated model */
  model?: string;
  /** Updated year */
  year?: number;
  /** Updated VIN */
  vin?: string;
  /** Updated license plate */
  license_plate?: string;
  /** Updated capacity */
  capacity?: number;
  /** Updated mileage */
  current_mileage?: number;
  /** Updated status */
  status?: VehicleStatus;
  /** Updated active status */
  is_active?: boolean;
  /** Updated defect notes */
  defect_notes?: string | null;
}

/**
 * Create vehicle data
 * Used when adding new vehicles to the fleet
 */
export interface CreateVehicleData {
  /** Vehicle number (required, unique) */
  vehicle_number: string;
  /** Vehicle make (required) */
  make: string;
  /** Vehicle model (required) */
  model: string;
  /** Vehicle year */
  year?: number;
  /** VIN */
  vin?: string;
  /** License plate */
  license_plate?: string;
  /** Passenger capacity */
  capacity?: number;
  /** Initial mileage */
  current_mileage?: number;
  /** Initial status (defaults to 'available') */
  status?: VehicleStatus;
}
