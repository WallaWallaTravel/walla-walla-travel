'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Tour {
  id: number;
  booking_id: number;
  customer_name: string;
  tour_date: string;
  pickup_time: string;
  pickup_location: string;
  dropoff_location: string;
  party_size: number;
  status: string;
}

export default function DriverSchedulePage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTours();
  }, [currentDate]);

  const loadTours = async () => {
    try {
      // TODO: Get actual driver ID from session/auth
      const driverId = 1;
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const response = await fetch(`/api/driver/tours?driver_id=${driverId}&year=${year}&month=${month}`);

      if (response.ok) {
        const data = await response.json();
        setTours(data.tours || []);
      }
    } catch (error) {
      console.error('Error loading tours:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getToursForDate = (dateStr: string): Tour[] => {
    return tours.filter(tour => tour.tour_date === dateStr);
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white">📅 My Schedule</h1>
          <p className="text-blue-100 text-lg mt-1">Your assigned tours</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={previousMonth}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-gray-700 transition-colors"
          >
            ← Previous
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Today
            </button>
            <h2 className="text-xl font-bold text-gray-900">
              {monthName} {year}
            </h2>
          </div>
          <button
            onClick={nextMonth}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-gray-700 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-gray-100 border-b border-gray-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center font-bold text-gray-600 text-sm">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="min-h-[100px] bg-gray-50 border border-gray-100"></div>;
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayTours = getToursForDate(dateStr);
              const isToday = new Date().toDateString() === new Date(dateStr).toDateString();

              return (
                <div
                  key={day}
                  className={`min-h-[100px] border border-gray-100 p-2 ${
                    isToday ? 'bg-blue-50' : 'bg-white'
                  } hover:bg-gray-50 transition-colors`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                      {day}
                    </span>
                    {dayTours.length > 0 && (
                      <span className="text-xs font-bold bg-blue-600 text-white px-2 py-1 rounded-full">
                        {dayTours.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayTours.map(tour => (
                      <div
                        key={tour.id}
                        onClick={() => router.push(`/driver-portal/tour/${tour.booking_id}`)}
                        className={`p-2 rounded border cursor-pointer hover:shadow-md transition-shadow text-xs ${getStatusColor(tour.status)}`}
                      >
                        <div className="font-bold truncate">{formatTime(tour.pickup_time)}</div>
                        <div className="truncate font-semibold">{tour.customer_name}</div>
                        <div className="font-semibold">{tour.party_size} guests</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tours Count */}
        <div className="mt-6 bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-900">This Month Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="text-3xl font-bold text-blue-600">{tours.length}</div>
              <div className="text-gray-600 font-medium">Total Tours</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <div className="text-3xl font-bold text-green-600">
                {tours.filter(t => t.status === 'confirmed').length}
              </div>
              <div className="text-gray-600 font-medium">Confirmed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
