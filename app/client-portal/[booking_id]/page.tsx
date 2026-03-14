import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ booking_id: string }>;
}

export default async function ClientBookingPage({ params }: PageProps) {
  const { booking_id } = await params;
  const bookingId = parseInt(booking_id);

  if (isNaN(bookingId)) {
    notFound();
  }

  const booking = await prisma.bookings.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      tour_date: true,
      party_size: true,
      status: true,
      customer_name: true,
      booking_number: true,
    },
  });

  if (!booking) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Booking</h1>
          <p className="text-gray-600 mb-6">Booking #{booking.booking_number}</p>

          <div className="space-y-3 mb-8">
            {booking.customer_name && (
              <div className="flex justify-between">
                <span className="text-gray-600">Name</span>
                <span className="font-medium text-gray-900">{booking.customer_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Tour Date</span>
              <span className="font-medium text-gray-900">
                {booking.tour_date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Party Size</span>
              <span className="font-medium text-gray-900">{booking.party_size} guests</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <span className="font-medium text-gray-900 capitalize">{booking.status}</span>
            </div>
          </div>

          <Link
            href={`/client-portal/${bookingId}/lunch`}
            className="block w-full text-center py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Order Lunch for Your Tour
          </Link>

          <Link
            href="/client-portal"
            className="block text-center mt-4 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Booking Lookup
          </Link>
        </div>
      </div>
    </div>
  );
}
