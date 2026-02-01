'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface Booking {
  id: number;
  booking_number: string;
  customer_name: string;
  tour_date: string;
  start_time: string;
  pickup_time?: string;
  party_size: number;
  status: string;
  driver_id?: number;
  vehicle_id?: number;
  driver_name?: string;
  vehicle_name?: string;
  complianceIssues?: string[];
}

interface AvailabilityBlock {
  id: number;
  vehicle_id: number;
  block_date: string;
  start_time: string;
  end_time: string;
  block_type: 'maintenance' | 'blackout' | 'hold' | 'booking';
  reason: string;
  vehicle_name: string;
}

interface Vehicle {
  id: number;
  name: string;
  capacity: number;
  is_active: boolean;
}

interface Driver {
  id: number;
  name: string;
  is_active: boolean;
}

interface DailySummary {
  bookings: number;
  blockedVehicles: number;
  availableVehicles: number;
  totalCapacity: number;
  bookedCapacity: number;
}

// Tentative event types
type EventSource = 'proposal' | 'corporate_request' | 'reservation';

interface TentativeEvent {
  id: string;
  source: EventSource;
  sourceId: number;
  title: string;
  date: string;
  status: string;
  eventType: 'tentative';
  color: string;
  partySize?: number;
  customerName?: string;
  companyName?: string;
  link: string;
}

interface ComplianceIssue {
  type: 'driver' | 'vehicle';
  entityId: number;
  entityName: string;
  field: string;
  expiryDate: string;
  daysUntilExpiry: number;
  severity: 'expired' | 'critical' | 'urgent' | 'warning';
  affectedBookings: number[];
}

export default function CalendarView() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dailySummaries, setDailySummaries] = useState<Record<string, DailySummary>>({});
  const [loading, setLoading] = useState(true);
  const [_viewMode, _setViewMode] = useState<'month' | 'week'>('month');

  // Tentative events state
  const [tentativeEvents, setTentativeEvents] = useState<TentativeEvent[]>([]);
  const [tentativeEventsByDate, setTentativeEventsByDate] = useState<Record<string, TentativeEvent[]>>({});

  // Compliance state
  const [complianceIssues, setComplianceIssues] = useState<ComplianceIssue[]>([]);

  // Filters
  const [filterDriver, setFilterDriver] = useState<string>('all');
  const [filterVehicle, setFilterVehicle] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showBlocks, setShowBlocks] = useState(true);
  const [showTentative, setShowTentative] = useState(true);
  const [showComplianceWarnings, setShowComplianceWarnings] = useState(true);

  // Quick availability
  const [showAvailability, setShowAvailability] = useState(false);
  const [selectedDateForAvailability, setSelectedDateForAvailability] = useState<string>('');

  // Selected booking for action modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCalendarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDriver, filterVehicle, filterStatus, allBookings]);

  const loadCalendarData = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      // Fetch main calendar data and tentative events in parallel
      const [calendarResponse, eventsResponse] = await Promise.all([
        fetch(`/api/admin/calendar?year=${year}&month=${month}`),
        fetch(`/api/admin/calendar/events?year=${year}&month=${month}`)
      ]);

      if (calendarResponse.ok) {
        const data = await calendarResponse.json();
        setAllBookings(data.bookings || []);
        setBookings(data.bookings || []);
        setBlocks(data.blocks || []);
        setVehicles(data.vehicles || []);
        setDrivers(data.drivers || []);
        setDailySummaries(data.dailySummaries || {});
        setComplianceIssues(data.complianceIssues || []);
      }

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setTentativeEvents(eventsData.events || []);
        setTentativeEventsByDate(eventsData.eventsByDate || {});
      }
    } catch (error) {
      logger.error('Error loading calendar data', { error });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allBookings];

    if (filterDriver !== 'all') {
      filtered = filtered.filter(b => String(b.driver_id) === filterDriver);
    }

    if (filterVehicle !== 'all') {
      filtered = filtered.filter(b => String(b.vehicle_id) === filterVehicle);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(b => b.status === filterStatus);
    }

    setBookings(filtered);
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

  const getBookingsForDate = (dateStr: string): Booking[] => {
    return bookings.filter(booking => booking.tour_date === dateStr);
  };

  const getBlocksForDate = (dateStr: string): AvailabilityBlock[] => {
    return blocks.filter(block => block.block_date === dateStr);
  };

  const getTentativeEventsForDate = (dateStr: string): TentativeEvent[] => {
    return tentativeEventsByDate[dateStr] || [];
  };

  const getBookingsWithComplianceIssues = (dateStr: string): Booking[] => {
    const dayBookings = getBookingsForDate(dateStr);
    return dayBookings.filter(b => b.complianceIssues && b.complianceIssues.length > 0);
  };

  const checkAvailability = (dateStr: string) => {
    const summary = dailySummaries[dateStr];
    const dayBookings = allBookings.filter(b => b.tour_date === dateStr);
    const dayBlocks = blocks.filter(b => b.block_date === dateStr);
    const dayTentative = getTentativeEventsForDate(dateStr);

    return {
      total: dayBookings.length,
      available: summary?.availableVehicles ?? vehicles.length,
      bookings: dayBookings,
      blocks: dayBlocks,
      tentative: dayTentative,
      bookedCapacity: summary?.bookedCapacity ?? 0,
      totalCapacity: summary?.totalCapacity ?? 0,
      blockedVehicles: summary?.blockedVehicles ?? 0
    };
  };

  const getEventSourceLabel = (source: EventSource): string => {
    switch (source) {
      case 'proposal': return 'Proposal';
      case 'corporate_request': return 'Corporate';
      case 'reservation': return 'Reservation';
      default: return source;
    }
  };

  const getEventSourceIcon = (source: EventSource): string => {
    switch (source) {
      case 'proposal': return '📄';
      case 'corporate_request': return '🏢';
      case 'reservation': return '📋';
      default: return '📌';
    }
  };

  const getSeverityColor = (severity: 'expired' | 'critical' | 'urgent' | 'warning'): string => {
    switch (severity) {
      case 'expired': return 'bg-red-600 text-white';
      case 'critical': return 'bg-red-500 text-white';
      case 'urgent': return 'bg-orange-500 text-white';
      case 'warning': return 'bg-yellow-400 text-gray-900';
    }
  };

  const getBlockTypeColor = (blockType: string): string => {
    switch (blockType) {
      case 'maintenance':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'blackout':
        return 'bg-gray-800 text-white border-gray-900';
      case 'hold':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getBlockTypeIcon = (blockType: string): string => {
    switch (blockType) {
      case 'maintenance':
        return '🔧';
      case 'blackout':
        return '⛔';
      case 'hold':
        return '⏸️';
      default:
        return '📅';
    }
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

  const handleDeleteBooking = async () => {
    if (!selectedBooking) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setAllBookings(prev => prev.filter(b => b.id !== selectedBooking.id));
        setBookings(prev => prev.filter(b => b.id !== selectedBooking.id));
        setSelectedBooking(null);
        setShowDeleteConfirm(false);
      } else {
        const data = await response.json();
        alert(`Failed to delete booking: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Error deleting booking', { error });
      alert('Failed to delete booking. Please try again.');
    } finally {
      setDeleting(false);
    }
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
        <div className="text-gray-900 text-xl font-semibold">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-gray-900">Booking Calendar</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTentative(!showTentative)}
              className={`px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                showTentative
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {showTentative ? '📄 Tentative On' : '📄 Tentative Off'}
            </button>
            <button
              onClick={() => setShowBlocks(!showBlocks)}
              className={`px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                showBlocks
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {showBlocks ? '🔧 Blocks On' : '🔧 Blocks Off'}
            </button>
            <button
              onClick={() => setShowAvailability(!showAvailability)}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              {showAvailability ? '📅 Calendar' : '🔍 Check Date'}
            </button>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-gray-900 hover:text-gray-700 font-semibold text-lg"
            >
              ← Dashboard
            </button>
          </div>
        </div>

        {/* Compliance Alert Banner */}
        {showComplianceWarnings && complianceIssues.length > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="font-bold text-gray-900">Compliance Attention Needed</h3>
                  <p className="text-sm text-gray-700">
                    {complianceIssues.filter(i => i.severity === 'expired').length > 0 && (
                      <span className="text-red-600 font-semibold mr-3">
                        {complianceIssues.filter(i => i.severity === 'expired').length} expired
                      </span>
                    )}
                    {complianceIssues.filter(i => i.severity === 'critical').length > 0 && (
                      <span className="text-red-500 font-semibold mr-3">
                        {complianceIssues.filter(i => i.severity === 'critical').length} critical (1-5 days)
                      </span>
                    )}
                    {complianceIssues.filter(i => i.severity === 'urgent').length > 0 && (
                      <span className="text-orange-600 font-semibold mr-3">
                        {complianceIssues.filter(i => i.severity === 'urgent').length} urgent (6-10 days)
                      </span>
                    )}
                    {complianceIssues.filter(i => i.severity === 'warning').length > 0 && (
                      <span className="text-yellow-700 font-semibold">
                        {complianceIssues.filter(i => i.severity === 'warning').length} warning (11-40 days)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const details = complianceIssues.map(i =>
                      `${i.severity === 'expired' ? '🔴' : i.severity === 'critical' ? '🔴' : i.severity === 'urgent' ? '🟠' : '🟡'} ${i.type === 'driver' ? 'Driver' : 'Vehicle'}: ${i.entityName} - ${i.field.replace('_', ' ')} ${i.severity === 'expired' ? 'EXPIRED' : `expires in ${i.daysUntilExpiry} days`}`
                    ).join('\n');
                    alert(`Compliance Issues:\n\n${details}`);
                  }}
                  className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  View Details
                </button>
                <button
                  onClick={() => setShowComplianceWarnings(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Availability Checker */}
        {showAvailability && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Availability Checker</h2>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-base font-bold text-gray-900 mb-2">Check Date</label>
                <input
                  type="date"
                  value={selectedDateForAvailability}
                  onChange={(e) => setSelectedDateForAvailability(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold text-base focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  if (selectedDateForAvailability) {
                    const avail = checkAvailability(selectedDateForAvailability);
                    const blockInfo = avail.blocks.length > 0
                      ? `\n\n🔧 Blocks (${avail.blockedVehicles} vehicles):\n${avail.blocks.map(b => `- ${getBlockTypeIcon(b.block_type)} ${b.vehicle_name}: ${b.reason}`).join('\n')}`
                      : '';
                    alert(`📅 ${selectedDateForAvailability}\n\n🚐 Vehicles: ${avail.available} available of ${vehicles.length}\n👥 Capacity: ${avail.bookedCapacity} / ${avail.totalCapacity} seats booked\n📋 Bookings: ${avail.total}\n\nBookings:\n${avail.bookings.map(b => `- ${formatTime(b.start_time || b.pickup_time || '')}: ${b.customer_name} (${b.party_size} guests)`).join('\n') || 'None'}${blockInfo}`);
                  }
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg"
              >
                Check Availability
              </button>
            </div>
          </div>
        )}

        {/* Filters & Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={previousMonth}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-gray-900"
              >
                ← Previous
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-gray-900"
              >
                Next →
              </button>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {monthName} {year}
            </h2>
            <button
              onClick={() => router.push('/admin/bookings/new')}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg"
            >
              + New Booking
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-gray-200">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Filter by Driver</label>
              <select
                value={filterDriver}
                onChange={(e) => setFilterDriver(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500"
              >
                <option value="all">All Drivers</option>
                {drivers.map(driver => (
                  <option key={driver.id} value={String(driver.id)}>{driver.name}</option>
                ))}
                <option value="">Unassigned</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Filter by Vehicle</label>
              <select
                value={filterVehicle}
                onChange={(e) => setFilterVehicle(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:border-blue-500"
              >
                <option value="all">All Vehicles</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={String(vehicle.id)}>{vehicle.name} ({vehicle.capacity} seats)</option>
                ))}
                <option value="">Unassigned</option>
              </select>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-sm font-semibold mt-4 pt-4 border-t-2 border-gray-200">
            <span className="text-gray-500 font-bold">Bookings:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
              <span className="text-gray-700">Confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
              <span className="text-gray-700">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
              <span className="text-gray-700">Completed</span>
            </div>

            <span className="text-gray-400">|</span>
            <span className="text-gray-500 font-bold">Tentative:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
              <span className="text-gray-700">📄 Proposal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8B5CF6' }}></div>
              <span className="text-gray-700">🏢 Corporate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
              <span className="text-gray-700">📋 Reservation</span>
            </div>

            <span className="text-gray-400">|</span>
            <span className="text-gray-500 font-bold">Blocks:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded"></div>
              <span className="text-gray-700">🔧 Maint</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-800 border-2 border-gray-900 rounded"></div>
              <span className="text-gray-700">⛔ Blackout</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm font-semibold mt-2 pt-2 border-t border-gray-100">
            <div className="text-gray-900 font-bold">
              {bookings.length} bookings | {tentativeEvents.length} tentative | {blocks.length} blocks | {vehicles.length} vehicles
            </div>
            {complianceIssues.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Compliance:</span>
                {complianceIssues.filter(i => i.severity === 'expired').length > 0 && (
                  <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-xs">
                    {complianceIssues.filter(i => i.severity === 'expired').length} expired
                  </span>
                )}
                {complianceIssues.filter(i => i.severity === 'critical').length > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs">
                    {complianceIssues.filter(i => i.severity === 'critical').length} critical
                  </span>
                )}
                {complianceIssues.filter(i => i.severity === 'urgent').length > 0 && (
                  <span className="px-2 py-0.5 bg-orange-500 text-white rounded-full text-xs">
                    {complianceIssues.filter(i => i.severity === 'urgent').length} urgent
                  </span>
                )}
                {complianceIssues.filter(i => i.severity === 'warning').length > 0 && (
                  <span className="px-2 py-0.5 bg-yellow-400 text-gray-900 rounded-full text-xs">
                    {complianceIssues.filter(i => i.severity === 'warning').length} warning
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-gray-100 border-b-2 border-gray-300">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
              <div key={day} className="p-4 text-center font-bold text-gray-900 text-lg">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="min-h-[160px] bg-gray-50 border border-gray-200"></div>;
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayBookings = getBookingsForDate(dateStr);
              const dayBlocks = getBlocksForDate(dateStr);
              const dayTentative = getTentativeEventsForDate(dateStr);
              const dayComplianceBookings = getBookingsWithComplianceIssues(dateStr);
              const availability = checkAvailability(dateStr);
              const isToday = new Date().toDateString() === new Date(dateStr).toDateString();
              const hasBlocks = dayBlocks.length > 0;
              const hasTentative = dayTentative.length > 0;
              const hasComplianceIssues = dayComplianceBookings.length > 0;

              // Check for conflicts (booking + tentative on same date)
              const hasConflict = dayBookings.length > 0 && dayTentative.length > 0;

              return (
                <div
                  key={day}
                  className={`min-h-[160px] border border-gray-200 p-2 ${
                    isToday ? 'bg-blue-50' :
                    hasConflict ? 'bg-amber-50' :
                    hasBlocks ? 'bg-orange-50/30' :
                    hasTentative && showTentative ? 'bg-purple-50/30' :
                    'bg-white'
                  } hover:bg-gray-50 transition-colors`}
                >
                  {/* Date Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-base font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {day}
                    </span>
                    <div className="flex items-center gap-1">
                      {hasComplianceIssues && showComplianceWarnings && (
                        <span className="text-xs font-bold bg-red-500 text-white px-1 py-0.5 rounded" title="Compliance issue">
                          ⚠️
                        </span>
                      )}
                      {hasConflict && (
                        <span className="text-xs font-bold bg-amber-500 text-white px-1 py-0.5 rounded" title="Potential conflict">
                          ⚡
                        </span>
                      )}
                      {dayBookings.length > 0 && (
                        <span className="text-xs font-bold bg-green-600 text-white px-1.5 py-0.5 rounded-full">
                          {dayBookings.length}
                        </span>
                      )}
                      {hasTentative && showTentative && (
                        <span className="text-xs font-bold bg-purple-500 text-white px-1.5 py-0.5 rounded-full">
                          📄{dayTentative.length}
                        </span>
                      )}
                      {hasBlocks && showBlocks && (
                        <span className="text-xs font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full">
                          🔧{dayBlocks.length}
                        </span>
                      )}
                      {availability.available === 0 && (
                        <span className="text-xs font-bold bg-red-600 text-white px-1.5 py-0.5 rounded-full">
                          FULL
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  {dailySummaries[dateStr] && (
                    <div className="mb-1">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            availability.bookedCapacity / availability.totalCapacity > 0.8
                              ? 'bg-red-500'
                              : availability.bookedCapacity / availability.totalCapacity > 0.5
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (availability.bookedCapacity / availability.totalCapacity) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Blocks */}
                  {showBlocks && dayBlocks.length > 0 && (
                    <div className="space-y-1 mb-1">
                      {dayBlocks.slice(0, 1).map(block => (
                        <div
                          key={block.id}
                          className={`px-1.5 py-0.5 rounded text-xs border cursor-pointer hover:shadow-sm ${getBlockTypeColor(block.block_type)}`}
                          title={`${block.vehicle_name}: ${block.reason}`}
                        >
                          <span>{getBlockTypeIcon(block.block_type)} {block.vehicle_name.substring(0, 8)}</span>
                        </div>
                      ))}
                      {dayBlocks.length > 1 && (
                        <div className="text-xs font-bold text-orange-600 text-center">
                          +{dayBlocks.length - 1} blocks
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tentative Events */}
                  {showTentative && dayTentative.length > 0 && (
                    <div className="space-y-1 mb-1">
                      {dayTentative.slice(0, 1).map(event => (
                        <div
                          key={event.id}
                          onClick={() => router.push(event.link)}
                          className="px-1.5 py-0.5 rounded text-xs border border-dashed cursor-pointer hover:shadow-sm"
                          style={{
                            backgroundColor: `${event.color}15`,
                            borderColor: event.color,
                            color: event.color
                          }}
                          title={`${getEventSourceLabel(event.source)}: ${event.title}${event.partySize ? ` (${event.partySize} guests)` : ''}`}
                        >
                          <span className="font-semibold">{getEventSourceIcon(event.source)} {event.title.substring(0, 10)}</span>
                        </div>
                      ))}
                      {dayTentative.length > 1 && (
                        <div className="text-xs font-bold text-purple-600 text-center">
                          +{dayTentative.length - 1} tentative
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bookings */}
                  <div className="space-y-1">
                    {dayBookings.slice(0, 2).map(booking => (
                      <div
                        key={booking.id}
                        onClick={() => setSelectedBooking(booking)}
                        className={`p-1.5 rounded border cursor-pointer hover:shadow-md transition-shadow relative ${getStatusColor(booking.status)}`}
                      >
                        {booking.complianceIssues && booking.complianceIssues.length > 0 && (
                          <span
                            className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"
                            title={booking.complianceIssues.join(', ')}
                          />
                        )}
                        <div className="font-bold text-xs truncate">{formatTime(booking.start_time || booking.pickup_time || '')}</div>
                        <div className="text-xs truncate font-semibold">{booking.customer_name}</div>
                      </div>
                    ))}
                    {dayBookings.length > 2 && (
                      <div className="text-xs font-bold text-gray-600 text-center">
                        +{dayBookings.length - 2} more
                      </div>
                    )}
                  </div>

                  {dayBookings.length === 0 && dayBlocks.length === 0 && (!showTentative || dayTentative.length === 0) && (
                    <button
                      onClick={() => router.push(`/admin/bookings/new?date=${dateStr}`)}
                      className="mt-1 w-full py-1 text-xs font-semibold text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      + Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Booking Action Modal */}
      {selectedBooking && !showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedBooking(null)}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Booking Actions</h3>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="font-bold text-gray-900">{selectedBooking.booking_number}</div>
              <div className="text-gray-700">{selectedBooking.customer_name}</div>
              <div className="text-sm text-gray-600">
                {selectedBooking.tour_date} at {formatTime(selectedBooking.start_time || selectedBooking.pickup_time || '')}
              </div>
              <div className="text-sm text-gray-600">{selectedBooking.party_size} guests</div>
              <div className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${getStatusColor(selectedBooking.status)}`}>
                {selectedBooking.status}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  router.push(`/itinerary-builder/${selectedBooking.id}`);
                  setSelectedBooking(null);
                }}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg transition-colors"
              >
                View / Edit Booking
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-lg transition-colors"
              >
                Delete Booking
              </button>

              <button
                onClick={() => setSelectedBooking(null)}
                className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-bold text-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {selectedBooking && showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-red-600 mb-4">Confirm Delete</h3>

            <p className="text-gray-700 mb-4">
              Are you sure you want to permanently delete this booking?
            </p>

            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-bold text-gray-900">{selectedBooking.booking_number}</div>
              <div className="text-gray-700">{selectedBooking.customer_name}</div>
              <div className="text-sm text-gray-600">
                {selectedBooking.tour_date} - {selectedBooking.party_size} guests
              </div>
            </div>

            <p className="text-sm text-red-600 font-semibold mb-4">
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedBooking(null);
                }}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-bold text-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBooking}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
