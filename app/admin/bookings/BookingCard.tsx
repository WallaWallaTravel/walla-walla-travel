'use client';

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

interface Props {
  booking: Booking;
  onAssign: () => void;
  onView: () => void;
}

export default function BookingCard({ booking, onAssign, onView }: Props) {
  const tourDate = new Date(booking.tour_date);
  const needsAssignment = !booking.driver_id || !booking.vehicle_id;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">{booking.customer_name}</h3>
          <p className="text-gray-600 font-semibold">{booking.booking_number}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(booking.status)}`}>
          {booking.status}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-gray-600 text-sm font-semibold mb-1">Date</p>
          <p className="text-gray-900 font-bold">
            {tourDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-sm font-semibold mb-1">Time</p>
          <p className="text-gray-900 font-bold">{booking.start_time}</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm font-semibold mb-1">Party</p>
          <p className="text-gray-900 font-bold">{booking.party_size} guests</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm font-semibold mb-1">Duration</p>
          <p className="text-gray-900 font-bold">{booking.duration_hours}h</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-gray-600 text-sm font-semibold mb-1">Contact</p>
          <p className="text-gray-900">{booking.customer_email}</p>
          <p className="text-gray-900">{booking.customer_phone}</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm font-semibold mb-1">Pickup</p>
          <p className="text-gray-900">{booking.pickup_location}</p>
        </div>
      </div>

      {/* Assignment Status */}
      <div className="border-t-2 border-gray-200 pt-4 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600 text-sm font-semibold mb-1">Driver</p>
            {booking.driver_name ? (
              <p className="text-gray-900 font-bold">👤 {booking.driver_name}</p>
            ) : (
              <p className="text-yellow-600 font-semibold">⚠️ Not assigned</p>
            )}
          </div>
          <div>
            <p className="text-gray-600 text-sm font-semibold mb-1">Vehicle</p>
            {booking.vehicle_name ? (
              <p className="text-gray-900 font-bold">🚐 {booking.vehicle_name}</p>
            ) : (
              <p className="text-yellow-600 font-semibold">⚠️ Not assigned</p>
            )}
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="border-t-2 border-gray-200 pt-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-semibold">Total: ${parseFloat(booking.total_price).toFixed(2)}</p>
            <div className="flex gap-4 mt-1">
              <span className={`text-sm font-semibold ${booking.deposit_paid ? 'text-green-600' : 'text-yellow-600'}`}>
                {booking.deposit_paid ? '✓' : '○'} Deposit
              </span>
              <span className={`text-sm font-semibold ${booking.final_payment_paid ? 'text-green-600' : 'text-gray-400'}`}>
                {booking.final_payment_paid ? '✓' : '○'} Final
              </span>
            </div>
          </div>
          {booking.winery_count && (
            <div className="text-right">
              <p className="text-gray-600 text-sm font-semibold">Wineries</p>
              <p className="text-gray-900 font-bold">{booking.winery_count} stops</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onView}
          className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold transition-colors"
        >
          View Details
        </button>
        {needsAssignment && booking.status !== 'cancelled' && (
          <button
            onClick={onAssign}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
          >
            Assign Driver/Vehicle
          </button>
        )}
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'assigned': return 'bg-blue-100 text-blue-800';
    case 'in_progress': return 'bg-purple-100 text-purple-800';
    case 'completed': return 'bg-gray-100 text-gray-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

