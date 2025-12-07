// Custom hook for time calculations in itinerary builder

import { Stop } from '../types';

export const useItineraryTime = () => {
  const addMinutes = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  const getMinutesDifference = (startTime: string, endTime: string): number => {
    const [startHours, startMins] = startTime.split(':').map(Number);
    const [endHours, endMins] = endTime.split(':').map(Number);
    const startTotal = startHours * 60 + startMins;
    const endTotal = endHours * 60 + endMins;
    return Math.max(0, endTotal - startTotal);
  };

  const calculateTimes = (stops: Stop[], pickupTime: string): Stop[] => {
    if (stops.length === 0) return stops;

    let currentTime = pickupTime;

    return stops.map((stop) => {
      const arrival = currentTime;
      const departure = addMinutes(arrival, stop.duration_minutes);
      const nextTime = addMinutes(departure, stop.drive_time_to_next_minutes);

      currentTime = nextTime;

      return {
        ...stop,
        arrival_time: arrival,
        departure_time: departure
      };
    });
  };

  const isLunchTime = (arrivalTime: string): boolean => {
    const [hours, minutes] = arrivalTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const lunchStart = 12 * 60; // 12:00 PM
    const lunchEnd = 13 * 60 + 30; // 1:30 PM
    return totalMinutes >= lunchStart && totalMinutes <= lunchEnd;
  };

  const calculateTravelTime = async (origin: string, destination: string): Promise<number> => {
    try {
      const response = await fetch(
        `/api/distance?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to calculate travel time');
      }
      
      const data = await response.json();
      return Math.ceil(data.duration / 60); // Convert seconds to minutes
    } catch (error) {
      console.error('Error calculating travel time:', error);
      return 15; // Fallback to 15 minutes
    }
  };

  return {
    addMinutes,
    formatTime,
    getMinutesDifference,
    calculateTimes,
    isLunchTime,
    calculateTravelTime,
  };
};




