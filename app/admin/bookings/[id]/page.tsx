/**
 * Booking Detail Page
 * View and manage individual booking details
 */

import { getSession } from '@/lib/auth/session';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { BookingActions } from './BookingActions';
import { BookingAssignment } from './BookingAssignment';

interface BookingDetail {
  id: number;
  booking_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  party_size: number;
  tour_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  pickup_location: string;
  dropoff_location: string;
  special_requests: string | null;
  status: string;
  base_price: number;
  total_price: number;
  deposit_amount: number;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  final_payment_amount: number;
  final_payment_paid: boolean;
  final_payment_paid_at: string | null;
  driver_id: number | null;
  driver_name: string | null;
  vehicle_id: number | null;
  vehicle_number: string | null;
  booking_source: string;
  created_at: string;
  updated_at: string;
}

interface Driver {
  id: number;
  name: string;
}

interface Vehicle {
  id: number;
  vehicle_number: string;
  make: string;
  model: string;
}

async function getBooking(id: string): Promise<BookingDetail | null> {
  try {
    const result = await query<BookingDetail>(
      `SELECT 
        b.*,
        u.name as driver_name,
        v.vehicle_number
       FROM bookings b
       LEFT JOIN users u ON b.driver_id = u.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('[Booking] Error fetching booking', { error });
    return null;
  }
}

async function getDrivers(): Promise<Driver[]> {
  try {
    const result = await query<Driver>(
      `SELECT id, name FROM users WHERE role IN ('driver', 'owner') AND is_active = true ORDER BY name`
    );
    return result.rows;
  } catch {
    return [];
  }
}

async function getVehicles(): Promise<Vehicle[]> {
  try {
    const result = await query<Vehicle>(
      `SELECT id, vehicle_number, make, model FROM vehicles WHERE is_active = true ORDER BY vehicle_number`
    );
    return result.rows;
  } catch {
    return [];
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getDaysUntil(dateStr: string): { days: number; label: string; urgent: boolean } {
  const tourDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  tourDate.setHours(0, 0, 0, 0);
  
  const diffTime = tourDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { days: diffDays, label: `${Math.abs(diffDays)} days ago`, urgent: false };
  if (diffDays === 0) return { days: 0, label: 'TODAY', urgent: true };
  if (diffDays === 1) return { days: 1, label: 'Tomorrow', urgent: true };
  if (diffDays <= 3) return { days: diffDays, label: `In ${diffDays} days`, urgent: true };
  return { days: diffDays, label: `In ${diffDays} days`, urgent: false };
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  
  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }
  
  const booking = await getBooking(id);
  
  if (!booking) {
    notFound();
  }

  const drivers = await getDrivers();
  const vehicles = await getVehicles();
  const daysUntil = getDaysUntil(booking.tour_date);
  
  // Calculate payment status
  const totalPaid = (booking.deposit_paid ? booking.deposit_amount : 0) + 
                   (booking.final_payment_paid ? booking.final_payment_amount : 0);
  const totalDue = booking.total_price;
  const paymentStatus = totalPaid >= totalDue ? 'Paid in Full' : 
                       booking.deposit_paid ? 'Deposit Paid' : 'Awaiting Payment';
  
  // Identify issues
  const issues: string[] = [];
  if (!booking.driver_id && daysUntil.days <= 7 && daysUntil.days >= 0) {
    issues.push('No driver assigned');
  }
  if (!booking.deposit_paid && daysUntil.days <= 14 && daysUntil.days >= 0) {
    issues.push('Deposit not received');
  }
  if (!booking.final_payment_paid && daysUntil.days <= 3 && daysUntil.days >= 0) {
    issues.push('Final payment pending');
  }
  
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/admin/bookings" 
          className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 inline-block"
        >
          ← Back to Bookings
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Booking #{booking.booking_number}
            </h1>
            <p className="text-gray-600 mt-1">
              Created {new Date(booking.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(booking.status)}`}>
              {booking.status.toUpperCase()}
            </span>
            {daysUntil.urgent && booking.status !== 'completed' && booking.status !== 'cancelled' && (
              <span className="px-4 py-2 rounded-full text-sm font-semibold bg-red-600 text-white">
                {daysUntil.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Issues Alert */}
      {issues.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-bold text-amber-800 mb-2">⚠️ Action Required</h3>
          <ul className="list-disc list-inside text-amber-700 space-y-1">
            {issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tour Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tour Details</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Tour Date</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {formatDate(booking.tour_date)}
                </p>
                <p className={`text-sm mt-1 ${daysUntil.urgent ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                  {daysUntil.label}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Time</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {booking.duration_hours} hour tour
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Party Size</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {booking.party_size} guests
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Source</label>
                <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">
                  {booking.booking_source || 'Website'}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Pickup Location</label>
                  <p className="text-gray-900 mt-1">{booking.pickup_location}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Dropoff Location</label>
                  <p className="text-gray-900 mt-1">{booking.dropoff_location || 'Same as pickup'}</p>
                </div>
              </div>
            </div>

            {booking.special_requests && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="text-sm font-medium text-gray-500">Special Requests</label>
                <p className="text-gray-900 mt-1 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  {booking.special_requests}
                </p>
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Customer Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-lg font-semibold text-gray-900">{booking.customer_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">
                    <a href={`mailto:${booking.customer_email}`} className="text-blue-600 hover:underline">
                      {booking.customer_email}
                    </a>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-gray-900">
                    <a href={`tel:${booking.customer_phone}`} className="text-blue-600 hover:underline">
                      {booking.customer_phone || 'Not provided'}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <BookingAssignment
            bookingId={booking.id}
            currentDriverId={booking.driver_id}
            currentDriverName={booking.driver_name}
            currentVehicleId={booking.vehicle_id}
            currentVehicleNumber={booking.vehicle_number}
            drivers={drivers}
            vehicles={vehicles}
          />
        </div>

        {/* Sidebar - Right column */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Payment</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Price</span>
                <span className="font-medium">${parseFloat(String(booking.base_price)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-bold text-lg">${parseFloat(String(booking.total_price)).toFixed(2)}</span>
              </div>
              
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Deposit (${parseFloat(String(booking.deposit_amount)).toFixed(2)})</span>
                  {booking.deposit_paid ? (
                    <span className="text-green-600 font-medium">✓ Paid</span>
                  ) : (
                    <span className="text-red-600 font-medium">Pending</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Final (${parseFloat(String(booking.final_payment_amount)).toFixed(2)})</span>
                  {booking.final_payment_paid ? (
                    <span className="text-green-600 font-medium">✓ Paid</span>
                  ) : (
                    <span className="text-red-600 font-medium">Pending</span>
                  )}
                </div>
              </div>
              
              <div className={`mt-4 p-3 rounded-lg text-center font-semibold ${
                paymentStatus === 'Paid in Full' 
                  ? 'bg-green-100 text-green-800' 
                  : paymentStatus === 'Deposit Paid'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {paymentStatus}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <BookingActions
            bookingId={booking.id}
            bookingNumber={booking.booking_number}
            status={booking.status}
            customerEmail={booking.customer_email}
          />

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Activity</h2>
            
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
                <div>
                  <p className="font-medium text-gray-900">Booking Created</p>
                  <p className="text-gray-500">{new Date(booking.created_at).toLocaleString()}</p>
                </div>
              </div>
              {booking.deposit_paid && booking.deposit_paid_at && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                  <div>
                    <p className="font-medium text-gray-900">Deposit Received</p>
                    <p className="text-gray-500">{new Date(booking.deposit_paid_at).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {booking.driver_id && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5"></div>
                  <div>
                    <p className="font-medium text-gray-900">Driver Assigned</p>
                    <p className="text-gray-500">{booking.driver_name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}








