// Type definitions for itinerary builder

export interface Winery {
  id: number;
  name: string;
  address: string;
  city: string;
  tasting_fee: number;
  average_visit_duration: number;
}

export interface Stop {
  id?: number;
  winery_id: number;
  winery?: Winery;
  stop_order: number;
  arrival_time: string;
  departure_time: string;
  duration_minutes: number;
  drive_time_to_next_minutes: number;
  reservation_confirmed: boolean;
  special_notes: string;
  is_lunch_stop?: boolean;
}

export interface Itinerary {
  id: number;
  booking_id: number;
  pickup_location: string;
  pickup_time: string;
  dropoff_location: string;
  estimated_dropoff_time: string;
  driver_notes: string;
  internal_notes: string;
  stops: Stop[];
  pickup_drive_time_minutes?: number;
  dropoff_drive_time_minutes?: number;
}

export interface NewWineryData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  tasting_fee: number;
  average_visit_duration: number;
}




