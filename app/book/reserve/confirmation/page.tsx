/**
 * Reserve & Refine Confirmation Page
 * Server Component — fetches reservation data directly via Prisma
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Decimal } from '@prisma/client/runtime/library';
import { getReservationById } from '@/lib/actions/reservation-actions';
import { PrintButton } from './PrintButton';

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function ReservationConfirmationPage({ searchParams }: PageProps) {
  const { id } = await searchParams;

  if (!id) {
    redirect('/book');
  }

  const reservationId = parseInt(id);
  if (isNaN(reservationId)) {
    redirect('/book');
  }

  const reservation = await getReservationById(reservationId);
  if (!reservation) {
    redirect('/book');
  }

  const depositAmount = reservation.deposit_amount instanceof Decimal
    ? Number(reservation.deposit_amount)
    : Number(reservation.deposit_amount);
  const depositPaid = reservation.deposit_paid as boolean;
  const paymentMethod = reservation.payment_method as string;
  const reservationNumber = reservation.reservation_number as string;
  const customerName = reservation.customer_name as string;
  const customerEmail = reservation.customer_email as string;
  const customerPhone = reservation.customer_phone as string;
  const partySize = reservation.party_size as number;
  const preferredDate = new Date(reservation.preferred_date as string);
  const alternateDate = reservation.alternate_date ? new Date(reservation.alternate_date as string) : null;
  const eventType = reservation.event_type as string;
  const specialRequests = reservation.special_requests as string | null;
  const consultationDeadline = new Date(reservation.consultation_deadline as string);
  const createdAt = new Date(reservation.created_at as string);

  const hoursUntilDeadline = Math.max(0, Math.round((consultationDeadline.getTime() - Date.now()) / (1000 * 60 * 60)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Success Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Reservation Confirmed!
            </h1>
            <p className="text-xl text-gray-600">
              Your date is secured - Ryan will call you soon
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Reservation Details */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-6 pb-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Reservation #{reservationNumber}</h2>
              <p className="text-gray-600">Created {createdAt.toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">${depositAmount}</div>
              <div className="text-sm text-gray-600">Deposit {depositPaid ? 'Paid' : 'Pending'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <span className="ml-2 font-medium">{customerName}</span>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <span className="ml-2 font-medium">{customerEmail}</span>
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <span className="ml-2 font-medium">{customerPhone}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Tour Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Party Size:</span>
                  <span className="ml-2 font-medium">{partySize} guests</span>
                </div>
                <div>
                  <span className="text-gray-600">Preferred Date:</span>
                  <span className="ml-2 font-medium">{preferredDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                {alternateDate && (
                  <div>
                    <span className="text-gray-600">Alternate Date:</span>
                    <span className="ml-2 font-medium">{alternateDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Event Type:</span>
                  <span className="ml-2 font-medium capitalize">{eventType.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          </div>

          {specialRequests && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Your Notes</h3>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{specialRequests}</p>
            </div>
          )}
        </div>

        {/* What's Next */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What Happens Next?</h2>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">Ryan Calls You</h3>
                <p className="text-gray-600 text-sm">
                  Within {hoursUntilDeadline} hours (by {consultationDeadline.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })})
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">Design Your Perfect Day</h3>
                <p className="text-gray-600 text-sm">
                  Together you&apos;ll choose wineries, timing, lunch spots, and any special touches. Ryan knows the area inside and out and will make sure it&apos;s perfect for your group.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">Enjoy Your Tour!</h3>
                <p className="text-gray-600 text-sm">
                  Show up ready to have an amazing time. We handle all the driving, planning, and logistics so you can relax and enjoy Walla Walla wine country.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">Final Payment</h3>
                <p className="text-gray-600 text-sm">
                  Final payment is due 48 hours after your tour concludes to accurately reflect final service time, lunch costs, and any added services provided during your experience.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        {paymentMethod === 'check' && !depositPaid && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg mb-6">
            <h3 className="font-bold text-gray-900 mb-2">Mail Your Check</h3>
            <p className="text-gray-700 mb-4">
              Please mail a check for <strong>${depositAmount}</strong> to:
            </p>
            <div className="bg-white rounded-lg p-4 font-mono text-sm">
              Walla Walla Travel<br />
              [Your Address]<br />
              Walla Walla, WA [ZIP]
            </div>
            <p className="text-xs text-gray-600 mt-4">
              Make checks payable to &quot;Walla Walla Travel&quot;
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <PrintButton />
          <Link
            href="/"
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-center"
          >
            Back to Home
          </Link>
        </div>

        {/* Contact */}
        <div className="mt-8 text-center text-gray-600">
          <p className="mb-2">Questions? We&apos;re here to help!</p>
          <div className="flex items-center justify-center gap-6">
            <a href="mailto:info@wallawalla.travel" className="text-blue-600 hover:underline font-medium">
              Email Us
            </a>
            <a href="tel:509-200-8000" className="text-blue-600 hover:underline font-medium">
              Call Us
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
