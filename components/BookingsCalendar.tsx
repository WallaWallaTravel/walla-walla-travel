'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface Booking {
  id: number;
  booking_number: string;
  customer_name: string;
  tour_date: string;
  start_time: string;
  status: string;
  party_size: number;
}

interface BookingsCalendarProps {
  bookings: Booking[];
}

export function BookingsCalendar({ bookings }: BookingsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get calendar data
  const { year, month, daysInMonth, firstDayOfMonth, weeks } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayOfMonth = firstDay.getDay(); // 0 = Sunday

    // Build weeks array
    const weeks: (number | null)[][] = [];
    let week: (number | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      week.push(null);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    
    // Add remaining days to last week
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      weeks.push(week);
    }

    return { year, month, daysInMonth, firstDayOfMonth, weeks };
  }, [currentDate]);

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings.forEach(booking => {
      const date = new Date(booking.tour_date).toISOString().split('T')[0];
      if (!map.has(date)) {
        map.set(date, []);
      }
      map.get(date)!.push(booking);
    });
    return map;
  }, [bookings]);

  // Get bookings for a specific day
  const getBookingsForDay = (day: number): Booking[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookingsByDate.get(dateStr) || [];
  };

  // Navigation
  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const today = new Date();
  const isToday = (day: number | null) => {
    if (!day) return false;
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            {monthNames[month]} {year}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={previousMonth}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Previous month"
                aria-label="Go to previous month"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextMonth}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Next month"
                aria-label="Go to next month"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-slate-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="space-y-2">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 gap-2">
              {week.map((day, dayIdx) => {
                const dayBookings = day ? getBookingsForDay(day) : [];
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={dayIdx}
                    className={`min-h-[100px] border rounded-lg p-2 transition-colors ${
                      day
                        ? isCurrentDay
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                        : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    {day && (
                      <>
                        <div className={`text-sm font-semibold mb-1 ${
                          isCurrentDay ? 'text-blue-600' : 'text-slate-900'
                        }`}>
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayBookings.map(booking => (
                            <Link
                              key={booking.id}
                              href={`/admin/bookings/${booking.id}`}
                              className="block"
                            >
                              <div
                                className={`text-xs p-1.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                                  getStatusColor(booking.status)
                                } text-white`}
                                title={`${booking.customer_name} - ${booking.party_size} guests - ${booking.start_time}`}
                              >
                                <div className="font-medium truncate">
                                  {booking.start_time.substring(0, 5)}
                                </div>
                                <div className="truncate opacity-90">
                                  {booking.customer_name}
                                </div>
                                <div className="text-[10px] opacity-75">
                                  {booking.party_size} guests
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-slate-50 border-t border-slate-200 px-6 py-3">
        <div className="flex items-center gap-6 text-xs">
          <span className="font-medium text-slate-700">Status:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-yellow-500"></div>
            <span className="text-slate-600">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-green-500"></div>
            <span className="text-slate-600">Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
            <span className="text-slate-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-red-500"></div>
            <span className="text-slate-600">Cancelled</span>
          </div>
        </div>
      </div>
    </div>
  );
}





