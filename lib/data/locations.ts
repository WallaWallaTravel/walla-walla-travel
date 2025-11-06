/**
 * Common locations for transfers and services
 */

export interface Location {
  name: string;
  type: 'airport' | 'city' | 'hotel' | 'winery' | 'venue' | 'other';
  distance_from_walla?: number;  // Miles from Walla Walla
}

export const COMMON_LOCATIONS: Location[] = [
  // Airports
  { name: 'SeaTac Airport', type: 'airport', distance_from_walla: 270 },
  { name: 'Pasco Airport (Tri-Cities)', type: 'airport', distance_from_walla: 50 },
  { name: 'Walla Walla Regional Airport', type: 'airport', distance_from_walla: 5 },
  { name: 'Spokane Airport', type: 'airport', distance_from_walla: 140 },
  { name: 'Portland Airport (PDX)', type: 'airport', distance_from_walla: 250 },
  
  // Cities
  { name: 'Walla Walla', type: 'city', distance_from_walla: 0 },
  { name: 'Downtown Walla Walla', type: 'city', distance_from_walla: 0 },
  { name: 'Pasco', type: 'city', distance_from_walla: 50 },
  { name: 'Kennewick', type: 'city', distance_from_walla: 55 },
  { name: 'Richland', type: 'city', distance_from_walla: 60 },
  { name: 'Tri-Cities', type: 'city', distance_from_walla: 55 },
  { name: 'Pendleton, OR', type: 'city', distance_from_walla: 45 },
  { name: 'Milton-Freewater, OR', type: 'city', distance_from_walla: 15 },
  
  // Hotels (Walla Walla)
  { name: 'Marcus Whitman Hotel', type: 'hotel', distance_from_walla: 0 },
  { name: 'Inn at Abeja', type: 'hotel', distance_from_walla: 3 },
  { name: 'Courtyard by Marriott', type: 'hotel', distance_from_walla: 2 },
  { name: 'Hampton Inn', type: 'hotel', distance_from_walla: 2 },
  { name: 'La Quinta Inn', type: 'hotel', distance_from_walla: 2 },
  { name: 'Eritage Resort', type: 'hotel', distance_from_walla: 8 },
  
  // Venues
  { name: 'Wine Valley Golf Club', type: 'venue', distance_from_walla: 5 },
  { name: 'Whitman College', type: 'venue', distance_from_walla: 1 },
  { name: 'Walla Walla University', type: 'venue', distance_from_walla: 3 },
];

/**
 * Get location suggestions based on search term
 */
export function searchLocations(searchTerm: string): Location[] {
  if (!searchTerm || searchTerm.trim() === '') {
    return COMMON_LOCATIONS;
  }

  const term = searchTerm.toLowerCase().trim();
  
  return COMMON_LOCATIONS.filter(location =>
    location.name.toLowerCase().includes(term)
  );
}

/**
 * Get distance between two locations (if both are in our list)
 */
export function getDistance(pickup: string, dropoff: string): number | null {
  const pickupLoc = COMMON_LOCATIONS.find(l => l.name === pickup);
  const dropoffLoc = COMMON_LOCATIONS.find(l => l.name === dropoff);
  
  if (!pickupLoc || !dropoffLoc) return null;
  
  // Simple distance calculation based on distance from Walla Walla
  const pickupDist = pickupLoc.distance_from_walla || 0;
  const dropoffDist = dropoffLoc.distance_from_walla || 0;
  
  return Math.abs(pickupDist - dropoffDist);
}

