import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { getBrandEmailConfig } from '@/lib/email-brands'
import Link from 'next/link'
import AcceptButton from './AcceptButton'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRIP_TYPE_LABELS: Record<string, string> = {
  wine_tour: 'Wine Tour',
  celebration: 'Celebration',
  corporate: 'Corporate Retreat',
  family: 'Family Trip',
  romantic: 'Romantic Getaway',
  birthday: 'Birthday Celebration',
  anniversary: 'Anniversary Trip',
  bachelor: 'Bachelor Party',
  bachelorette: 'Bachelorette Party',
  wedding: 'Wedding',
  golf: 'Golf Outing',
  brewery: 'Brewery Tour',
  other: 'Custom Experience',
}

const STOP_TYPE_ICONS: Record<string, string> = {
  winery: '\uD83C\uDF77',
  restaurant: '\uD83C\uDF7D\uFE0F',
  hotel: '\uD83C\uDFE8',
  pickup: '\uD83D\uDE97',
  dropoff: '\uD83C\uDFC1',
  activity: '\uD83C\uDF88',
  transportation: '\uD83D\uDE97',
  custom: '\uD83D\uDCCD',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatTime(time: Date | null): string | null {
  if (!time) return null
  const h = time.getUTCHours()
  const m = time.getUTCMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

// ---------------------------------------------------------------------------
// Not-available fallback (rendered inline, not a 404)
// ---------------------------------------------------------------------------

function ProposalNotAvailable() {
  return (
    <div className="font-body min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="font-display text-4xl text-[#C4A35A] mb-6">
          Walla Walla Travel
        </p>
        <h1 className="font-display text-2xl font-bold text-stone-900 mb-3">
          Proposal Not Available
        </h1>
        <p className="text-stone-600 mb-8 leading-relaxed">
          This proposal is not currently available for viewing.
          If you believe this is an error, please contact us.
        </p>
        <a
          href="mailto:info@wallawalla.travel"
          className="inline-block bg-[#722F37] text-white px-6 py-3 rounded-lg font-semibold
            hover:bg-[#5a252c] transition-colors min-h-[44px]"
        >
          Contact Us
        </a>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ proposalNumber: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { proposalNumber } = await params
  const { preview } = await searchParams
  const isPreview = preview === 'true'

  // Admin preview check
  let isAdminPreview = false
  if (isPreview) {
    const session = await getSession()
    isAdminPreview = session?.user?.role === 'admin'
  }

  // Fetch proposal with all relations
  const proposal = await prisma.trip_proposals.findUnique({
    where: { proposal_number: proposalNumber },
    include: {
      trip_proposal_days: {
        orderBy: { day_number: 'asc' },
        include: {
          trip_proposal_stops: {
            orderBy: { stop_order: 'asc' },
            include: {
              wineries: { select: { id: true, name: true } },
              restaurants: { select: { id: true, name: true } },
              hotels: { select: { id: true, name: true } },
            },
          },
        },
      },
      trip_proposal_inclusions: {
        where: { show_on_proposal: true },
        orderBy: { sort_order: 'asc' },
      },
      trip_proposal_guests: {
        orderBy: [{ is_primary: 'desc' }, { name: 'asc' }],
      },
    },
  })

  if (!proposal) notFound()

  // Access control
  const publicStatuses = ['sent', 'viewed', 'accepted']
  if (!isAdminPreview && !publicStatuses.includes(proposal.status || '')) {
    return <ProposalNotAvailable />
  }

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const brandConfig = getBrandEmailConfig(proposal.brand_id ?? undefined)
  const days = proposal.trip_proposal_days
  const inclusions = proposal.trip_proposal_inclusions
  const guests = proposal.trip_proposal_guests
  const dayCount = days.length || 1
  const partySize = proposal.party_size

  const tripTypeLabel = TRIP_TYPE_LABELS[proposal.trip_type || ''] || 'Wine Country Experience'

  const subtotal = Number(proposal.subtotal) || 0
  const discountAmount = Number(proposal.discount_amount) || 0
  const discountPercentage = Number(proposal.discount_percentage) || 0
  const taxRate = Number(proposal.tax_rate) || 0
  const taxDisplay = `${(taxRate * 100).toFixed(1)}%`
  const taxes = Number(proposal.taxes) || 0
  const gratuityPercentage = proposal.gratuity_percentage || 0
  const gratuityAmount = Number(proposal.gratuity_amount) || 0
  const total = Number(proposal.total) || 0
  const depositPercentage = proposal.deposit_percentage || 50
  const depositAmount = Number(proposal.deposit_amount) || 0

  const isExpired = proposal.valid_until && new Date(proposal.valid_until) < new Date()
  const canAccept = ['sent', 'viewed'].includes(proposal.status || '') && !isExpired

  const hasMultipleDays = dayCount > 1
  const startDateFormatted = formatShortDate(proposal.start_date)
  const endDateFormatted = proposal.end_date ? formatShortDate(proposal.end_date) : null

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="font-body min-h-screen bg-[#FAF8F5]">

      {/* ================================================================= */}
      {/* Admin Preview Banner */}
      {/* ================================================================= */}
      {isAdminPreview && (
        <div className="fixed top-0 inset-x-0 z-50 bg-indigo-600 text-white text-center py-2.5 px-4 text-sm font-medium shadow-lg">
          <span className="uppercase tracking-wider">Admin Preview</span>
          <span className="mx-2 text-indigo-300">|</span>
          Status: <span className="capitalize font-bold">{proposal.status}</span>
          <span className="mx-2 text-indigo-300">|</span>
          This is how the client will see this proposal
          <Link
            href={`/admin/trip-proposals/${proposal.id}`}
            className="ml-4 underline hover:text-indigo-200 transition-colors"
          >
            Back to Editor
          </Link>
        </div>
      )}

      {/* ================================================================= */}
      {/* Hero Section */}
      {/* ================================================================= */}
      <section
        className={`relative overflow-hidden bg-gradient-to-br from-[#722F37] via-[#5C2630] to-[#3D1A20] text-white ${
          isAdminPreview ? 'pt-12' : ''
        }`}
      >
        {/* Subtle radial glow for visual depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(196,163,90,0.15)_0%,_transparent_60%)]" />

        <div className="relative max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20 lg:py-24">
          {/* Brand wordmark */}
          <p className="font-display text-base sm:text-lg tracking-[0.2em] text-[#C4A35A] mb-10 uppercase">
            {brandConfig.name}
          </p>

          {/* Title */}
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-5 leading-tight">
            {proposal.trip_title || 'Your Walla Walla Wine Country Experience'}
          </h1>

          {/* Customer */}
          <p className="text-white/70 text-lg sm:text-xl mb-10">
            Prepared exclusively for{' '}
            <span className="text-white font-semibold">{proposal.customer_name}</span>
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-3">
            <span className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium min-h-[36px] flex items-center">
              {startDateFormatted}
              {endDateFormatted && endDateFormatted !== startDateFormatted && (
                <span> &ndash; {endDateFormatted}</span>
              )}
            </span>
            <span className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium min-h-[36px] flex items-center">
              {partySize} Guest{partySize !== 1 ? 's' : ''}
            </span>
            <span className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium min-h-[36px] flex items-center">
              {tripTypeLabel}
            </span>
            {hasMultipleDays && (
              <span className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium min-h-[36px] flex items-center">
                {dayCount}-Day Experience
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* Introduction */}
      {/* ================================================================= */}
      {proposal.introduction && (
        <section className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
          <div className="border-l-4 border-[#C4A35A] pl-6 sm:pl-8">
            <p className="font-display text-stone-700 text-lg sm:text-xl leading-[1.8]">
              {proposal.introduction}
            </p>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* Itinerary */}
      {/* ================================================================= */}
      {days.length > 0 && (
        <section className="max-w-3xl mx-auto px-5 sm:px-8 pb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-8">
            Your Itinerary
          </h2>

          <div className="space-y-8">
            {days.map((day) => {
              const stops = day.trip_proposal_stops
              return (
                <div
                  key={day.id}
                  className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden"
                >
                  {/* Day header */}
                  <div className="px-6 py-5 border-b border-stone-100">
                    <p className="text-xs font-bold text-[#C4A35A] uppercase tracking-widest mb-1">
                      Day {day.day_number}
                    </p>
                    <h3 className="font-display text-xl font-bold text-stone-900">
                      {day.title || formatDate(day.date)}
                    </h3>
                    {day.title && (
                      <p className="text-stone-500 text-sm mt-1">{formatDate(day.date)}</p>
                    )}
                  </div>

                  {/* Stops */}
                  <div className="p-6">
                    {stops.length === 0 ? (
                      <p className="text-stone-400 italic text-center py-4">
                        Details being finalized
                      </p>
                    ) : (
                      <div className="relative">
                        {/* Timeline line */}
                        {stops.length > 1 && (
                          <div className="absolute left-[19px] top-5 bottom-5 w-px bg-stone-200" />
                        )}

                        <div className="space-y-6">
                          {stops.map((stop) => {
                            const icon = STOP_TYPE_ICONS[stop.stop_type] || '\uD83D\uDCCD'
                            const name =
                              stop.wineries?.name ||
                              stop.restaurants?.name ||
                              stop.hotels?.name ||
                              stop.custom_name ||
                              'Stop'
                            const time = formatTime(stop.scheduled_time)

                            return (
                              <div key={stop.id} className="relative flex gap-4">
                                {/* Timeline dot */}
                                <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-[#722F37] text-white flex items-center justify-center text-base shadow-sm">
                                  {icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 pt-1">
                                  <h4 className="font-bold text-stone-900 text-base">{name}</h4>
                                  {(time || stop.duration_minutes) && (
                                    <p className="text-sm text-stone-500 mt-0.5">
                                      {time}
                                      {time && stop.duration_minutes && ' \u00B7 '}
                                      {stop.duration_minutes && `${stop.duration_minutes} min`}
                                    </p>
                                  )}
                                  {stop.custom_description && (
                                    <p className="text-stone-600 text-sm mt-2 leading-relaxed">
                                      {stop.custom_description}
                                    </p>
                                  )}
                                  {stop.cost_note && (
                                    <p className="text-stone-500 text-sm mt-1.5 italic">
                                      {stop.cost_note}
                                    </p>
                                  )}
                                  {stop.client_notes && (
                                    <p className="text-stone-600 text-sm mt-1.5">
                                      {stop.client_notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* Guest List */}
      {/* ================================================================= */}
      {guests.length > 0 && (
        <section className="max-w-3xl mx-auto px-5 sm:px-8 pb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-8">
            Your Party
          </h2>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="divide-y divide-stone-100">
              {guests.map((guest) => (
                <div key={guest.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-semibold text-sm">
                    {guest.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900 truncate">
                      {guest.name}
                    </p>
                    {guest.email && (
                      <p className="text-sm text-stone-500 truncate">{guest.email}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {guest.is_primary ? (
                      <span className="text-xs font-semibold bg-[#722F37] text-white px-2.5 py-1 rounded-full">
                        Primary
                      </span>
                    ) : (
                      <span className="text-xs font-medium bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full capitalize">
                        {guest.rsvp_status || 'Pending'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* Services & Investment */}
      {/* ================================================================= */}
      {(inclusions.length > 0 || total > 0) && (
        <section className="max-w-3xl mx-auto px-5 sm:px-8 pb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-8">
            Your Investment
          </h2>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            {/* Service line items */}
            {inclusions.length > 0 && (
              <div className="p-6">
                <div className="space-y-1">
                  {inclusions.map((inc) => {
                    const unitPrice = Number(inc.unit_price) || 0
                    const totalPrice = Number(inc.total_price) || 0
                    const quantity = Number(inc.quantity) || 1
                    let detail = ''

                    if (inc.unit === 'per_person') {
                      detail = `${formatCurrency(unitPrice)} \u00D7 ${partySize} guests`
                    } else if (inc.unit === 'per_day' && quantity > 1) {
                      detail = `${formatCurrency(unitPrice)} \u00D7 ${quantity} days`
                    }

                    return (
                      <div
                        key={inc.id}
                        className="flex items-start justify-between py-3 border-b border-stone-100 last:border-0"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-medium text-stone-900">{inc.description}</p>
                          {detail && (
                            <p className="text-sm text-stone-500 mt-0.5">{detail}</p>
                          )}
                          {inc.notes && (
                            <p className="text-sm text-stone-500 mt-0.5 italic">{inc.notes}</p>
                          )}
                        </div>
                        {totalPrice > 0 && (
                          <span className="font-semibold text-stone-900 whitespace-nowrap">
                            {formatCurrency(totalPrice)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Pricing summary */}
            <div className="bg-stone-50 p-6 border-t border-stone-100">
              <div className="space-y-3">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-800">{formatCurrency(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>
                      Discount
                      {discountPercentage > 0 && ` (${discountPercentage}%)`}
                      {proposal.discount_reason && (
                        <span className="text-stone-500 ml-1">&mdash; {proposal.discount_reason}</span>
                      )}
                    </span>
                    <span className="font-semibold">&minus;{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-stone-600">
                  <span>Tax ({taxDisplay})</span>
                  <span className="font-semibold text-stone-800">{formatCurrency(taxes)}</span>
                </div>

                {gratuityAmount > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>Gratuity ({gratuityPercentage}%)</span>
                    <span className="font-semibold text-stone-800">{formatCurrency(gratuityAmount)}</span>
                  </div>
                )}

                {/* Total */}
                <div className="border-t-2 border-stone-300 pt-4 flex justify-between items-baseline">
                  <span className="text-lg font-bold text-stone-900">Total</span>
                  <span className="font-display text-2xl sm:text-3xl font-bold text-[#722F37]">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Deposit box */}
              {depositAmount > 0 && (
                <div className="mt-6 bg-white rounded-xl border border-stone-200 p-5">
                  <div className="flex justify-between items-baseline gap-4">
                    <span className="text-stone-700 font-medium">
                      {depositPercentage}% deposit to secure your trip
                    </span>
                    <span className="text-xl font-bold text-[#722F37] whitespace-nowrap">
                      {formatCurrency(depositAmount)}
                    </span>
                  </div>
                  <p className="text-sm text-stone-500 mt-2">
                    Remaining balance due 48 hours after your tour concludes
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* Call to Action */}
      {/* ================================================================= */}
      <section className="max-w-3xl mx-auto px-5 sm:px-8 pb-16">
        {/* Sent/Viewed — accept + contact */}
        {canAccept && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 sm:p-10 text-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 mb-3">
              Ready to Book Your Experience?
            </h2>
            {proposal.valid_until && (
              <p className="text-stone-500 mb-8">
                This proposal is valid until {formatDate(proposal.valid_until)}
              </p>
            )}

            <div className="max-w-sm mx-auto space-y-4">
              <AcceptButton proposalNumber={proposalNumber} />

              <a
                href={`mailto:${brandConfig.reply_to}?subject=Changes to Proposal ${proposalNumber}`}
                className="block text-center py-3 text-[#722F37] font-medium hover:underline min-h-[44px] flex items-center justify-center"
              >
                Request Changes
              </a>
            </div>

            <p className="text-stone-500 text-sm mt-8">
              Questions? Call{' '}
              <a
                href={`tel:${brandConfig.phone.replace(/[^+\d]/g, '')}`}
                className="text-[#722F37] font-semibold hover:underline"
              >
                {brandConfig.phone}
              </a>
            </p>
          </div>
        )}

        {/* Accepted */}
        {proposal.status === 'accepted' && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-8 sm:p-10">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-display text-2xl font-bold text-emerald-800 mb-2">
                You&apos;ve accepted this proposal!
              </h2>
              <p className="text-emerald-700 mb-6">
                We&apos;ll be in touch to finalize details.
              </p>

              {depositPercentage > 0 && !proposal.deposit_paid && (
                <div className="bg-white rounded-xl border border-emerald-200 p-6 max-w-sm mx-auto">
                  <p className="text-stone-700 font-medium mb-4">
                    Next step: Secure your trip with a {depositPercentage}% deposit
                  </p>
                  <Link
                    href={`/trip-proposals/${proposalNumber}/pay`}
                    className="block w-full rounded-xl bg-[#722F37] text-white px-8 py-4 font-bold text-lg
                      hover:bg-[#5a252c] transition-colors text-center min-h-[56px] flex items-center justify-center"
                  >
                    Pay Deposit ({formatCurrency(depositAmount)})
                  </Link>
                </div>
              )}

              {proposal.deposit_paid && (
                <div className="bg-white rounded-xl border border-emerald-200 p-6 max-w-sm mx-auto">
                  <p className="text-emerald-700 font-semibold">
                    Deposit received &mdash; you&apos;re all set!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expired */}
        {isExpired && !['accepted', 'declined'].includes(proposal.status || '') && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-8 text-center">
            <p className="text-amber-800 font-medium mb-4">
              This proposal has expired. Contact us to discuss a new itinerary.
            </p>
            <a
              href={`mailto:${brandConfig.reply_to}?subject=Expired Proposal ${proposalNumber}`}
              className="inline-block bg-[#722F37] text-white px-6 py-3 rounded-lg font-semibold
                hover:bg-[#5a252c] transition-colors min-h-[44px]"
            >
              Contact Us
            </a>
          </div>
        )}

        {/* Declined */}
        {proposal.status === 'declined' && (
          <div className="bg-stone-100 rounded-2xl border border-stone-200 p-8 text-center">
            <p className="text-stone-700 mb-4">
              This proposal was declined. We&apos;d love to plan something new for you.
            </p>
            <a
              href={`mailto:${brandConfig.reply_to}?subject=New Proposal Request`}
              className="inline-block bg-[#722F37] text-white px-6 py-3 rounded-lg font-semibold
                hover:bg-[#5a252c] transition-colors min-h-[44px]"
            >
              Get in Touch
            </a>
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* Footer */}
      {/* ================================================================= */}
      <footer className="bg-[#2C1215] text-white">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
          <div className="text-center mb-6">
            <p className="font-display text-2xl font-bold text-[#C4A35A] mb-2">
              {brandConfig.name}
            </p>
            <p className="text-white/50 text-sm">{brandConfig.tagline}</p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-8 mb-5 text-sm">
            <a
              href={`tel:${brandConfig.phone.replace(/[^+\d]/g, '')}`}
              className="text-white/70 hover:text-white transition-colors min-h-[44px] flex items-center"
            >
              {brandConfig.phone}
            </a>
            <span className="hidden sm:inline text-white/20">|</span>
            <a
              href={`mailto:${brandConfig.reply_to}`}
              className="text-white/70 hover:text-white transition-colors min-h-[44px] flex items-center"
            >
              {brandConfig.reply_to}
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs text-white/40">
            <Link href="/privacy" className="hover:text-white/70 transition-colors min-h-[44px] flex items-center">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white/70 transition-colors min-h-[44px] flex items-center">
              Terms of Service
            </Link>
            <Link href="/cancellation-policy" className="hover:text-white/70 transition-colors min-h-[44px] flex items-center">
              Cancellation Policy
            </Link>
          </div>

          <p className="text-center text-white/25 text-xs mt-5">
            &copy; {new Date().getFullYear()} {brandConfig.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
