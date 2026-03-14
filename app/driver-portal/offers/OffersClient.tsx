'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { respondToDriverOffer } from '@/lib/actions/driverOffers'

interface TourOffer {
  id: number
  booking_id: number
  driver_id: number
  vehicle_id: number | null
  offered_at: string
  expires_at: string | null
  status: string
  notes: string | null
  booking_number: string
  customer_name: string
  tour_date: string
  start_time: string
  end_time: string | null
  party_size: number
  pickup_location: string | null
  estimated_hours: string | null
  hourly_rate: string | null
  total_pay: string | null
  vehicle_name: string | null
}

interface Props {
  initialOffers: TourOffer[]
}

function formatTime(time: string | null): string {
  if (!time) return ''
  const [hourStr, minuteStr] = time.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = minuteStr ?? '00'
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${minute} ${ampm}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'accepted') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        ✓ Accepted
      </span>
    )
  }
  if (status === 'declined') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        Declined
      </span>
    )
  }
  if (status === 'expired') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Expired
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      {status}
    </span>
  )
}

export default function OffersClient({ initialOffers }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [respondingId, setRespondingId] = useState<number | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    offer: TourOffer
    action: 'accept' | 'decline'
  } | null>(null)
  const [declineNotes, setDeclineNotes] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const pendingOffers = initialOffers.filter(o => o.status === 'pending')
  const recentOffers = initialOffers.filter(o => o.status !== 'pending').slice(0, 5)

  const openModal = (offer: TourOffer, action: 'accept' | 'decline') => {
    setDeclineNotes('')
    setModalError(null)
    setConfirmModal({ offer, action })
  }

  const closeModal = () => {
    setConfirmModal(null)
    setDeclineNotes('')
    setModalError(null)
  }

  const handleConfirm = () => {
    if (!confirmModal) return
    const { offer, action } = confirmModal
    setRespondingId(offer.id)
    setModalError(null)

    startTransition(async () => {
      const result = await respondToDriverOffer(offer.id, action, declineNotes || undefined)
      if (result.success) {
        if (action === 'accept') {
          setSuccessMessage('✅ Tour accepted!')
        }
        closeModal()
        router.refresh()
      } else {
        setModalError(typeof result.error === 'string' ? result.error : 'Something went wrong. Please try again.')
      }
      setRespondingId(null)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ backgroundColor: '#1E3A5F' }} className="px-4 pt-8 pb-6">
        <div className="max-w-2xl mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Tour Offers</h1>
            <p className="text-blue-200 mt-1 text-sm">Review and respond to tour offers from dispatch</p>
          </div>
          <button
            onClick={() => router.refresh()}
            className="mt-1 px-3 py-1.5 rounded-lg border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Success banner */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-green-800 font-medium text-sm">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800 ml-4 text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Pending offers */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Pending Offers</h2>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1E3A5F] text-white text-xs font-bold">
              {pendingOffers.length}
            </span>
          </div>

          {pendingOffers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-700 font-medium">No pending tour offers</p>
              <p className="text-gray-500 text-sm mt-1">Check back later or contact dispatch</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingOffers.map(offer => {
                const expiresIn = offer.expires_at
                  ? new Date(offer.expires_at).getTime() - Date.now()
                  : null
                const hoursUntilExpiry = expiresIn != null
                  ? Math.floor(expiresIn / (1000 * 60 * 60))
                  : null
                const isExpiringSoon = hoursUntilExpiry != null && hoursUntilExpiry < 24

                const totalPay = offer.total_pay ? parseFloat(offer.total_pay) : null
                const hourlyRate = offer.hourly_rate ? parseFloat(offer.hourly_rate) : null
                const estimatedHours = offer.estimated_hours ? parseFloat(offer.estimated_hours) : null

                return (
                  <div
                    key={offer.id}
                    className={`bg-white rounded-xl border shadow-sm p-6 ${
                      isExpiringSoon ? 'border-orange-400 border-2' : 'border-gray-200'
                    }`}
                  >
                    {isExpiringSoon && hoursUntilExpiry != null && (
                      <div className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                        ⏰ Expires in {hoursUntilExpiry}h
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6 mb-5">
                      {/* Left: tour details */}
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">{offer.customer_name}</h3>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex gap-2">
                            <span className="text-gray-500 w-20 shrink-0">Booking:</span>
                            <span className="font-semibold text-gray-900">{offer.booking_number}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-gray-500 w-20 shrink-0">Date:</span>
                            <span className="font-semibold text-gray-900">{formatDate(offer.tour_date)}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-gray-500 w-20 shrink-0">Time:</span>
                            <span className="font-semibold text-gray-900">
                              {formatTime(offer.start_time)}
                              {offer.end_time ? ` – ${formatTime(offer.end_time)}` : ''}
                            </span>
                          </div>
                          {estimatedHours != null && (
                            <div className="flex gap-2">
                              <span className="text-gray-500 w-20 shrink-0">Duration:</span>
                              <span className="font-semibold text-gray-900">{estimatedHours} hrs</span>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <span className="text-gray-500 w-20 shrink-0">Party:</span>
                            <span className="font-semibold text-gray-900">{offer.party_size} guests</span>
                          </div>
                          {offer.vehicle_name && (
                            <div className="flex gap-2">
                              <span className="text-gray-500 w-20 shrink-0">Vehicle:</span>
                              <span className="font-semibold text-gray-900">{offer.vehicle_name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: pay + pickup */}
                      <div className="space-y-3">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <p className="text-xs text-gray-600 mb-1">Your Pay</p>
                          {totalPay != null ? (
                            <>
                              <p className="text-3xl font-bold text-blue-700">
                                ${totalPay.toFixed(2)}
                              </p>
                              {hourlyRate != null && estimatedHours != null && (
                                <p className="text-xs text-gray-500 mt-1">
                                  ${hourlyRate.toFixed(2)}/hr × {estimatedHours} hrs
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">TBD</p>
                          )}
                        </div>

                        {offer.pickup_location && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-gray-700 mb-1">📍 Pickup Location</p>
                            <p className="text-sm text-gray-700">{offer.pickup_location}</p>
                          </div>
                        )}

                        {offer.notes && (
                          <div className="bg-yellow-50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-gray-700 mb-1">📝 Notes from Dispatch</p>
                            <p className="text-sm text-gray-700">{offer.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => openModal(offer, 'decline')}
                        disabled={respondingId === offer.id}
                        className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => openModal(offer, 'accept')}
                        disabled={respondingId === offer.id}
                        className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                      >
                        {respondingId === offer.id ? 'Processing...' : 'Accept Tour'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Recent responses */}
        {recentOffers.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Responses</h2>
            <div className="space-y-2">
              {recentOffers.map(offer => (
                <div
                  key={offer.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{offer.customer_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(offer.tour_date)} · {formatTime(offer.start_time)}
                    </p>
                  </div>
                  <StatusBadge status={offer.status} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            {confirmModal.action === 'accept' ? (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Accept this tour?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {formatDate(confirmModal.offer.tour_date)} · {confirmModal.offer.customer_name}
                </p>
                {modalError && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                    {modalError}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    disabled={respondingId === confirmModal.offer.id}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={respondingId === confirmModal.offer.id}
                    className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                  >
                    {respondingId === confirmModal.offer.id ? 'Accepting...' : 'Yes, Accept'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Decline this tour?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {formatDate(confirmModal.offer.tour_date)} · {confirmModal.offer.customer_name}
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Reason <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={declineNotes}
                    onChange={(e) => setDeclineNotes(e.target.value)}
                    placeholder="Let dispatch know why you're declining..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
                  />
                </div>
                {modalError && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                    {modalError}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    disabled={respondingId === confirmModal.offer.id}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={respondingId === confirmModal.offer.id}
                    className="flex-1 px-4 py-2.5 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 text-sm"
                  >
                    {respondingId === confirmModal.offer.id ? 'Declining...' : 'Decline Tour'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
