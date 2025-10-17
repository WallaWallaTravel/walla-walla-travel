/**
 * Client Service Type Definitions
 *
 * Centralized client service and booking types for the Walla Walla Travel system.
 * Covers client transportation services, booking management, and revenue tracking.
 * Matches database schema: client_services table
 */

/**
 * Service status
 * Tracks the current state of a client service
 */
export type ServiceStatus = 'assigned' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Service type classification
 * Categories of transportation services offered
 */
export type ServiceType =
  | 'transport'
  | 'charter'
  | 'wine_tour'
  | 'event'
  | 'airport'
  | 'custom';

/**
 * Payment status for billing
 * Tracks payment state of completed services
 */
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'cancelled';

/**
 * Client service record (from database)
 * Matches client_services table schema
 */
export interface ClientService {
  /** Unique service identifier */
  id: number;
  /** Time card ID (links service to driver's shift) */
  time_card_id: number;
  /** Driver ID */
  driver_id: number;
  /** Vehicle ID (if assigned) */
  vehicle_id?: number | null;
  /** Client name */
  client_name: string;
  /** Client phone number */
  client_phone?: string | null;
  /** Client email address */
  client_email?: string | null;
  /** When client was picked up */
  pickup_time?: string | null;
  /** Pickup location description */
  pickup_location?: string | null;
  /** Pickup latitude coordinate */
  pickup_lat?: number | null;
  /** Pickup longitude coordinate */
  pickup_lng?: number | null;
  /** When client was dropped off */
  dropoff_time?: string | null;
  /** Dropoff location description */
  dropoff_location?: string | null;
  /** Dropoff latitude coordinate */
  dropoff_lat?: number | null;
  /** Dropoff longitude coordinate */
  dropoff_lng?: number | null;
  /** Hourly rate for service */
  hourly_rate: number;
  /** Total service hours (calculated on dropoff) */
  service_hours?: number | null;
  /** Total cost (calculated on dropoff) */
  total_cost?: number | null;
  /** Type of service */
  service_type?: ServiceType | null;
  /** Number of passengers */
  passenger_count?: number | null;
  /** Service notes */
  notes?: string | null;
  /** Special client requests */
  special_requests?: string | null;
  /** Current service status */
  status: ServiceStatus;
  /** Record creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Client booking record (future booking system)
 * For pre-scheduled services and reservations
 */
export interface ClientBooking {
  /** Unique booking identifier */
  id: number;
  /** Client ID (if registered) */
  client_id?: number | null;
  /** Client name */
  client_name: string;
  /** Client contact phone */
  client_phone: string;
  /** Client email */
  client_email?: string | null;
  /** Requested service date */
  requested_date: string;
  /** Requested service time */
  requested_time: string;
  /** Pickup location */
  pickup_location: string;
  /** Dropoff location */
  dropoff_location: string;
  /** Number of passengers */
  passenger_count: number;
  /** Type of service requested */
  service_type: ServiceType;
  /** Estimated service hours */
  estimated_hours?: number | null;
  /** Estimated cost */
  estimated_cost?: number | null;
  /** Hourly rate for booking */
  hourly_rate?: number | null;
  /** Booking status */
  status: 'pending' | 'confirmed' | 'assigned' | 'completed' | 'cancelled';
  /** Special requests or notes */
  notes?: string | null;
  /** Assigned driver ID (if confirmed) */
  assigned_driver_id?: number | null;
  /** Assigned vehicle ID (if confirmed) */
  assigned_vehicle_id?: number | null;
  /** Linked client service ID (when active) */
  client_service_id?: number | null;
  /** When booking was created */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * Service with full details
 * Extended service information with driver and vehicle details
 */
export interface ServiceWithDetails extends ClientService {
  /** Driver name */
  driver_name: string;
  /** Driver email */
  driver_email: string;
  /** Vehicle number */
  vehicle_number?: string | null;
  /** Vehicle make */
  vehicle_make?: string | null;
  /** Vehicle model */
  vehicle_model?: string | null;
  /** Time card date */
  time_card_date?: string;
  /** Formatted pickup time */
  pickup_time_formatted?: string;
  /** Formatted dropoff time */
  dropoff_time_formatted?: string;
}

/**
 * Billing calculation
 * Financial breakdown of service costs
 */
export interface BillingCalculation {
  /** Service hours */
  service_hours: number;
  /** Hourly rate */
  hourly_rate: number;
  /** Subtotal (hours × rate) */
  subtotal: number;
  /** Additional fees */
  fees?: number;
  /** Tax amount */
  tax?: number;
  /** Total cost */
  total: number;
  /** Payment status */
  payment_status?: PaymentStatus;
  /** Formatted billing summary */
  formatted: string;
}

/**
 * Client pickup request data
 * Data required to log client pickup
 */
export interface ClientPickupData {
  /** Client service ID */
  clientServiceId: number;
  /** Pickup location description */
  pickupLocation: string;
  /** Pickup latitude */
  pickupLat?: number;
  /** Pickup longitude */
  pickupLng?: number;
}

/**
 * Client dropoff request data
 * Data required to log client dropoff and calculate billing
 */
export interface ClientDropoffData {
  /** Client service ID */
  clientServiceId: number;
  /** Dropoff location description */
  dropoffLocation: string;
  /** Dropoff latitude */
  dropoffLat?: number;
  /** Dropoff longitude */
  dropoffLng?: number;
}

/**
 * Service summary
 * Simplified view for dashboard and reports
 */
export interface ServiceSummary {
  /** Service ID */
  id: number;
  /** Client name */
  client_name: string;
  /** Driver name */
  driver_name: string;
  /** Vehicle number */
  vehicle_number?: string;
  /** Service date */
  service_date: string;
  /** Service hours */
  service_hours?: number;
  /** Hourly rate */
  hourly_rate: number;
  /** Total cost */
  total_cost?: number;
  /** Service status */
  status: ServiceStatus;
  /** Service type */
  service_type?: ServiceType;
  /** Pickup location */
  pickup_location?: string;
  /** Dropoff location */
  dropoff_location?: string;
}

/**
 * Revenue report
 * Financial reporting and analytics
 */
export interface RevenueReport {
  /** Date range for report */
  date_range: {
    /** Start date */
    start: string;
    /** End date */
    end: string;
  };
  /** Total number of services */
  total_services: number;
  /** Total revenue generated */
  total_revenue: number;
  /** Average service hours */
  average_service_hours: number;
  /** Average hourly rate */
  average_rate: number;
  /** Average revenue per service */
  average_revenue_per_service: number;
  /** Breakdown by service type */
  by_service_type: Array<{
    /** Service type */
    service_type: ServiceType;
    /** Number of services */
    count: number;
    /** Revenue from this type */
    revenue: number;
    /** Percentage of total revenue */
    percentage: number;
  }>;
  /** Breakdown by driver */
  by_driver?: Array<{
    /** Driver name */
    driver_name: string;
    /** Number of services */
    service_count: number;
    /** Total revenue generated */
    revenue: number;
  }>;
  /** Breakdown by vehicle */
  by_vehicle?: Array<{
    /** Vehicle number */
    vehicle_number: string;
    /** Number of services */
    service_count: number;
    /** Total revenue generated */
    revenue: number;
  }>;
}

/**
 * Service statistics
 * Aggregated service metrics
 */
export interface ServiceStatistics {
  /** Today's service count */
  today_services: number;
  /** Active services (in progress) */
  active_services: number;
  /** Completed services today */
  completed_today: number;
  /** Today's revenue */
  today_revenue: number;
  /** This week's service count */
  week_services: number;
  /** This week's revenue */
  week_revenue: number;
  /** This month's service count */
  month_services: number;
  /** This month's revenue */
  month_revenue: number;
  /** Average service duration (hours) */
  avg_service_duration: number;
  /** Most popular service type */
  most_popular_type?: ServiceType;
}

/**
 * Billing preview
 * Real-time billing calculation preview
 */
export interface BillingPreview {
  /** Elapsed hours so far */
  elapsed_hours: number;
  /** Hourly rate */
  hourly_rate: number;
  /** Estimated cost if service ended now */
  estimated_cost: number;
  /** Formatted preview string */
  formatted: string;
}

/**
 * Create client service data
 * Data required to create a new client service
 */
export interface CreateClientServiceData {
  /** Time card ID */
  time_card_id: number;
  /** Driver ID */
  driver_id: number;
  /** Vehicle ID (optional) */
  vehicle_id?: number | null;
  /** Client name */
  client_name: string;
  /** Client phone */
  client_phone?: string;
  /** Client email */
  client_email?: string;
  /** Hourly rate */
  hourly_rate: number;
  /** Service type */
  service_type?: ServiceType;
  /** Passenger count */
  passenger_count?: number;
  /** Notes */
  notes?: string;
  /** Special requests */
  special_requests?: string;
  /** Initial status (defaults to 'assigned') */
  status?: ServiceStatus;
}

/**
 * Update client service data
 * Data for updating an existing client service
 */
export interface UpdateClientServiceData {
  /** Pickup time */
  pickup_time?: string;
  /** Pickup location */
  pickup_location?: string;
  /** Pickup latitude */
  pickup_lat?: number | null;
  /** Pickup longitude */
  pickup_lng?: number | null;
  /** Dropoff time */
  dropoff_time?: string;
  /** Dropoff location */
  dropoff_location?: string;
  /** Dropoff latitude */
  dropoff_lat?: number | null;
  /** Dropoff longitude */
  dropoff_lng?: number | null;
  /** Service hours */
  service_hours?: number;
  /** Total cost */
  total_cost?: number;
  /** Status */
  status?: ServiceStatus;
  /** Notes */
  notes?: string;
  /** Special requests */
  special_requests?: string;
}

/**
 * Service assignment data
 * Data for assigning service to driver/vehicle
 */
export interface ServiceAssignmentData {
  /** Service ID */
  service_id: number;
  /** Driver ID */
  driver_id: number;
  /** Vehicle ID */
  vehicle_id: number;
  /** Time card ID (active shift) */
  time_card_id: number;
  /** Assigned by (supervisor/admin ID) */
  assigned_by: number;
  /** Assignment notes */
  notes?: string;
}

/**
 * Location data
 * GPS coordinates for pickup/dropoff
 */
export interface LocationData {
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
  /** Location description */
  description?: string;
}
