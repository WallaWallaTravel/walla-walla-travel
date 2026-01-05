'use client';

interface Booking {
  id: number;
  tour_date: string;
  total_price: string;
  deposit_paid: boolean;
  final_payment_paid: boolean;
  status: string;
  party_size: number;
  duration_hours: number;
}

interface Props {
  bookings: Booking[];
  onClose: () => void;
}

export default function RevenueStats({ bookings, onClose }: Props) {
  // Calculate stats
  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(b => b.status !== 'cancelled').length;
  const _cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
  
  const totalRevenue = bookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + parseFloat(b.total_price), 0);
  
  const depositCollected = bookings
    .filter(b => b.deposit_paid && b.status !== 'cancelled')
    .reduce((sum, b) => sum + parseFloat(b.total_price) * 0.5, 0);
  
  const finalPaymentCollected = bookings
    .filter(b => b.final_payment_paid && b.status !== 'cancelled')
    .reduce((sum, b) => sum + parseFloat(b.total_price) * 0.5, 0);
  
  const totalCollected = depositCollected + finalPaymentCollected;
  const outstandingBalance = totalRevenue - totalCollected;
  
  const totalGuests = bookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + b.party_size, 0);
  
  const averageBookingValue = activeBookings > 0 ? totalRevenue / activeBookings : 0;
  const averagePartySize = activeBookings > 0 ? totalGuests / activeBookings : 0;
  
  // Group by status
  const byStatus = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Group by duration
  const byDuration = bookings
    .filter(b => b.status !== 'cancelled')
    .reduce((acc, b) => {
      const key = `${b.duration_hours}h`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">📊 Revenue Dashboard</h2>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-900 font-bold text-2xl"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
          <p className="text-gray-600 font-semibold text-sm mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-gray-600 mt-1">{activeBookings} active bookings</p>
        </div>

        {/* Collected */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
          <p className="text-gray-600 font-semibold text-sm mb-1">Collected</p>
          <p className="text-3xl font-bold text-blue-600">${totalCollected.toFixed(2)}</p>
          <p className="text-xs text-gray-600 mt-1">
            {((totalCollected / totalRevenue) * 100).toFixed(0)}% of total
          </p>
        </div>

        {/* Outstanding */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg p-4">
          <p className="text-gray-600 font-semibold text-sm mb-1">Outstanding</p>
          <p className="text-3xl font-bold text-orange-600">${outstandingBalance.toFixed(2)}</p>
          <p className="text-xs text-gray-600 mt-1">
            {((outstandingBalance / totalRevenue) * 100).toFixed(0)}% remaining
          </p>
        </div>

        {/* Average Booking */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
          <p className="text-gray-600 font-semibold text-sm mb-1">Avg Booking Value</p>
          <p className="text-3xl font-bold text-purple-600">${averageBookingValue.toFixed(2)}</p>
          <p className="text-xs text-gray-600 mt-1">{averagePartySize.toFixed(1)} avg guests</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Breakdown */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-bold text-gray-900 mb-4">💳 Payment Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Deposits Collected:</span>
              <span className="font-bold text-green-600">${depositCollected.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Final Payments:</span>
              <span className="font-bold text-green-600">${finalPaymentCollected.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-gray-300 pt-3 flex justify-between items-center">
              <span className="font-bold text-gray-900">Total Collected:</span>
              <span className="text-xl font-bold text-green-600">${totalCollected.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Booking Status */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-bold text-gray-900 mb-4">📋 Booking Status</h3>
          <div className="space-y-2">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="text-gray-700 capitalize">{status.replace('_', ' ')}:</span>
                <span className="font-bold text-gray-900">{count}</span>
              </div>
            ))}
            <div className="border-t-2 border-gray-300 pt-2 flex justify-between items-center">
              <span className="font-bold text-gray-900">Total:</span>
              <span className="font-bold text-gray-900">{totalBookings}</span>
            </div>
          </div>
        </div>

        {/* Tour Duration */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-bold text-gray-900 mb-4">⏰ Tour Duration</h3>
          <div className="space-y-2">
            {Object.entries(byDuration).map(([duration, count]) => (
              <div key={duration} className="flex justify-between items-center">
                <span className="text-gray-700">{duration} tours:</span>
                <span className="font-bold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Guest Stats */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-bold text-gray-900 mb-4">👥 Guest Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Total Guests:</span>
              <span className="font-bold text-gray-900">{totalGuests}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Avg Party Size:</span>
              <span className="font-bold text-gray-900">{averagePartySize.toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Revenue per Guest:</span>
              <span className="font-bold text-gray-900">
                ${totalGuests > 0 ? (totalRevenue / totalGuests).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="mt-6 pt-6 border-t-2 border-gray-200">
        <button
          onClick={() => alert('Export functionality coming soon!')}
          className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-bold transition-colors"
        >
          📥 Export Report (CSV)
        </button>
      </div>
    </div>
  );
}

