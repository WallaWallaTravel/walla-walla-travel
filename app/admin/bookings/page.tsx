'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CalendarView from './CalendarView';
import BookingCard from './BookingCard';
import AssignmentModal from './AssignmentModal';
import ManualBookingModal from './ManualBookingModal';
import RevenueStats from './RevenueStats';

interface Booking {
  id: number;
  booking_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  tour_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  party_size: number;
  pickup_location: string;
  status: string;
  total_price: string;
  deposit_paid: boolean;
  final_payment_paid: boolean;
  driver_id?: number;
  driver_name?: string;
  vehicle_id?: number;
  vehicle_name?: string;
  winery_count?: number;
}

type ViewMode = 'calendar' | 'list';
type CalendarView = 'day' | 'week' | 'month';

export default function AdminBookingsPage() {
  const router = useRouter();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [calendarView, setCalendarView] = useState<CalendarView>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDriver, setFilterDriver] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showManualBookingModal, setShowManualBookingModal] = useState(false);
  const [showRevenueStats, setShowRevenueStats] = useState(false);

  useEffect(() => {
    loadBookings();
  }, [selectedDate, filterStatus, filterDriver]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      // Calculate date range based on calendar view
      const startDate = getStartDate();
      const endDate = getEndDate();

      const params = new URLSearchParams({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });

      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      if (filterDriver !== 'all') {
        params.append('driver_id', filterDriver);
      }

      const response = await fetch(`/api/admin/bookings?${params}`);
      const result = await response.json();

      if (result.success) {
        setBookings(result.data.bookings || []);
      }
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const date = new Date(selectedDate);
    if (calendarView === 'day') {
      return date;
    } else if (calendarView === 'week') {
      const day = date.getDay();
      date.setDate(date.getDate() - day);
      return date;
    } else {
      date.setDate(1);
      return date;
    }
  };

  const getEndDate = () => {
    const date = new Date(selectedDate);
    if (calendarView === 'day') {
      return date;
    } else if (calendarView === 'week') {
      const day = date.getDay();
      date.setDate(date.getDate() + (6 - day));
      return date;
    } else {
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
      return date;
    }
  };

  const handlePrevious = () => {
    const date = new Date(selectedDate);
    if (calendarView === 'day') {
      date.setDate(date.getDate() - 1);
    } else if (calendarView === 'week') {
      date.setDate(date.getDate() - 7);
    } else {
      date.setMonth(date.getMonth() - 1);
    }
    setSelectedDate(date);
  };

  const handleNext = () => {
    const date = new Date(selectedDate);
    if (calendarView === 'day') {
      date.setDate(date.getDate() + 1);
    } else if (calendarView === 'week') {
      date.setDate(date.getDate() + 7);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    setSelectedDate(date);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleAssignDriver = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowAssignmentModal(true);
  };

  const handleAssignmentComplete = () => {
    setShowAssignmentModal(false);
    setSelectedBooking(null);
    loadBookings();
  };

  const handleManualBookingComplete = () => {
    setShowManualBookingModal(false);
    loadBookings();
  };

  const unassignedBookings = bookings.filter(b => !b.driver_id && b.status !== 'cancelled');
  const conflictBookings = detectConflicts(bookings);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bookings Dashboard</h1>
              <p className="text-gray-600">Manage tours, assignments, and schedule</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRevenueStats(!showRevenueStats)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                📊 Revenue
              </button>
              <button
                onClick={() => setShowManualBookingModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
              >
                + New Booking
              </button>
            </div>
          </div>

          {/* Alerts */}
          {unassignedBookings.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 font-semibold">
                ⚠️ {unassignedBookings.length} booking{unassignedBookings.length > 1 ? 's' : ''} need driver assignment
              </p>
            </div>
          )}

          {conflictBookings.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 font-semibold">
                🚨 {conflictBookings.length} potential conflict{conflictBookings.length > 1 ? 's' : ''} detected
              </p>
            </div>
          )}
        </div>

        {/* Revenue Stats */}
        {showRevenueStats && (
          <div className="mb-6">
            <RevenueStats
              bookings={bookings}
              onClose={() => setShowRevenueStats(false)}
            />
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📅 Calendar
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  viewMode === 'list'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📋 List
              </button>
            </div>

            {/* Calendar View Toggle */}
            {viewMode === 'calendar' && (
              <div className="flex gap-2">
                {(['day', 'week', 'month'] as CalendarView[]).map((view) => (
                  <button
                    key={view}
                    onClick={() => setCalendarView(view)}
                    className={`px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                      calendarView === view
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
              </div>
            )}

            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold"
              >
                ←
              </button>
              <button
                onClick={handleToday}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
              >
                Today
              </button>
              <button
                onClick={handleNext}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold"
              >
                →
              </button>
              <span className="ml-2 font-bold text-gray-900">
                {selectedDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: calendarView !== 'month' ? 'numeric' : undefined,
                  year: 'numeric' 
                })}
              </span>
            </div>

            {/* Filters */}
            <div className="flex gap-2 ml-auto">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg font-semibold"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-semibold">Loading bookings...</p>
          </div>
        ) : viewMode === 'calendar' ? (
          <CalendarView
            bookings={bookings}
            view={calendarView}
            selectedDate={selectedDate}
            onBookingClick={(booking) => {
              setSelectedBooking(booking);
              setShowAssignmentModal(true);
            }}
          />
        ) : (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No bookings found</h3>
                <p className="text-gray-600">Try adjusting your filters or date range</p>
              </div>
            ) : (
              bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onAssign={() => handleAssignDriver(booking)}
                  onView={() => router.push(`/admin/bookings/${booking.id}`)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAssignmentModal && selectedBooking && (
        <AssignmentModal
          booking={selectedBooking}
          onClose={() => {
            setShowAssignmentModal(false);
            setSelectedBooking(null);
          }}
          onComplete={handleAssignmentComplete}
        />
      )}

      {showManualBookingModal && (
        <ManualBookingModal
          onClose={() => setShowManualBookingModal(false)}
          onComplete={handleManualBookingComplete}
        />
      )}
    </div>
  );
}

// Simple conflict detection
function detectConflicts(bookings: Booking[]): Booking[] {
  const conflicts: Booking[] = [];
  const sorted = [...bookings].sort((a, b) => 
    a.tour_date.localeCompare(b.tour_date) || a.start_time.localeCompare(b.start_time)
  );

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];

      if (a.tour_date !== b.tour_date) break;
      if (a.status === 'cancelled' || b.status === 'cancelled') continue;

      // Check if same driver or vehicle
      if ((a.driver_id && a.driver_id === b.driver_id) || 
          (a.vehicle_id && a.vehicle_id === b.vehicle_id)) {
        // Check time overlap
        if (a.start_time < b.end_time && b.start_time < a.end_time) {
          if (!conflicts.includes(a)) conflicts.push(a);
          if (!conflicts.includes(b)) conflicts.push(b);
        }
      }
    }
  }

  return conflicts;
}

