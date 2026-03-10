'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import {
  getCalendarData,
  type CalendarData,
  type CalendarProposal,
} from '@/lib/actions/calendar'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts.length > 1 ? parts[parts.length - 1] : fullName
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0]
}

function formatTourType(t: string | null): string {
  if (!t) return ''
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function statusLabel(s: string | null): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Expand a proposal across its date range and return dates it covers */
function proposalDates(p: CalendarProposal): string[] {
  const dates: string[] = [p.start_date]
  if (p.end_date && p.end_date !== p.start_date) {
    const cur = new Date(p.start_date + 'T12:00:00')
    const end = new Date(p.end_date + 'T12:00:00')
    cur.setDate(cur.getDate() + 1)
    while (cur <= end) {
      dates.push(cur.toISOString().split('T')[0])
      cur.setDate(cur.getDate() + 1)
    }
  }
  return dates
}

// ---------------------------------------------------------------------------
// Day cell types
// ---------------------------------------------------------------------------

interface DayItem {
  type: 'booking' | 'proposal' | 'sharedTour'
  id: number
  label: string
  sublabel?: string
  href: string
  statusBadge?: string
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CalendarViewProps {
  initialData: CalendarData
  initialYear: number
  initialMonth: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarView({
  initialData,
  initialYear,
  initialMonth,
}: CalendarViewProps) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [data, setData] = useState<CalendarData>(initialData)
  const [isPending, startTransition] = useTransition()

  // ---- Navigation ----
  function navigate(dir: -1 | 0 | 1) {
    let newYear = year
    let newMonth = month

    if (dir === 0) {
      const now = new Date()
      newYear = now.getFullYear()
      newMonth = now.getMonth() + 1
    } else {
      newMonth += dir
      if (newMonth < 1) {
        newMonth = 12
        newYear -= 1
      } else if (newMonth > 12) {
        newMonth = 1
        newYear += 1
      }
    }

    setYear(newYear)
    setMonth(newMonth)

    startTransition(async () => {
      const result = await getCalendarData(newYear, newMonth)
      setData(result)
    })
  }

  // ---- Calendar grid computation ----
  const monthName = new Date(year, month - 1).toLocaleString('default', {
    month: 'long',
  })

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const gridDays = useMemo(() => {
    const firstOfMonth = new Date(year, month - 1, 1)
    const lastOfMonth = new Date(year, month, 0)
    const startDay = firstOfMonth.getDay() // 0=Sun
    const totalDays = lastOfMonth.getDate()

    const days: Array<{ date: string; day: number; inMonth: boolean }> = []

    // Leading days from previous month
    const prevMonthLast = new Date(year, month - 1, 0).getDate()
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevMonthLast - i
      const m = month - 1 < 1 ? 12 : month - 1
      const y = month - 1 < 1 ? year - 1 : year
      days.push({
        date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        inMonth: false,
      })
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      days.push({
        date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        inMonth: true,
      })
    }

    // Trailing days to fill the last week
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const m = month + 1 > 12 ? 1 : month + 1
        const y = month + 1 > 12 ? year + 1 : year
        days.push({
          date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
          day: d,
          inMonth: false,
        })
      }
    }

    return days
  }, [year, month])

  // ---- Build lookup maps ----
  const itemsByDate = useMemo(() => {
    const map: Record<string, DayItem[]> = {}

    function push(date: string, item: DayItem) {
      if (!map[date]) map[date] = []
      map[date].push(item)
    }

    // Bookings — green
    for (const b of data.bookings) {
      push(b.tour_date, {
        type: 'booking',
        id: b.id,
        label: `${lastName(b.customer_name)}${b.tour_type ? ' \u00B7 ' + formatTourType(b.tour_type) : ''}`,
        sublabel: b.driver_name ? firstName(b.driver_name) : undefined,
        href: `/admin/bookings/${b.id}`,
      })
    }

    // Proposals — amber, expanded across date range
    for (const p of data.proposals) {
      const dates = proposalDates(p)
      for (const date of dates) {
        push(date, {
          type: 'proposal',
          id: p.id,
          label: p.customer_name,
          href: `/admin/trip-proposals/${p.id}`,
          statusBadge: statusLabel(p.status),
        })
      }
    }

    // Shared tours — sky blue
    for (const t of data.sharedTours) {
      const spotsLeft = t.max_guests - t.current_guests
      push(t.tour_date, {
        type: 'sharedTour',
        id: t.id,
        label: t.title,
        sublabel: `${spotsLeft} spots left`,
        href: `/admin/shared-tours/${t.id}`,
      })
    }

    return map
  }, [data])

  // ---- Chip styles ----
  const chipStyles: Record<string, string> = {
    booking:
      'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
    proposal:
      'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
    sharedTour:
      'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100',
  }

  const statusBadgeColor: Record<string, string> = {
    Draft: 'bg-gray-200 text-gray-700',
    Sent: 'bg-blue-100 text-blue-700',
    Accepted: 'bg-emerald-100 text-emerald-700',
  }

  // ---- Render ----
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 text-sm text-gray-700">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-emerald-500" />
              Booking
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-amber-500" />
              Proposal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-sky-500" />
              Shared Tour
            </span>
          </div>

          <Link
            href="/admin/bookings/quick-create"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Quick Create
          </Link>
        </div>
      </div>

      {/* Mobile legend */}
      <div className="flex lg:hidden items-center gap-3 text-sm text-gray-700 mb-4">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-emerald-500" />
          Booking
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-amber-500" />
          Proposal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-sky-500" />
          Shared Tour
        </span>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            disabled={isPending}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={() => navigate(0)}
            disabled={isPending}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Today
          </button>
          <button
            onClick={() => navigate(1)}
            disabled={isPending}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        <h2 className="text-xl font-semibold text-gray-900">
          {monthName} {year}
          {isPending && (
            <span className="ml-2 inline-block w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin align-middle" />
          )}
        </h2>

        {/* Spacer for alignment */}
        <div className="w-[140px]" />
      </div>

      {/* ---- Desktop: Calendar Grid ---- */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              className="py-3 text-center text-sm font-semibold text-gray-600"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {gridDays.map(({ date, day, inMonth }) => {
            const isToday = date === todayStr
            const items = itemsByDate[date] || []
            const maxShow = 3
            const overflow = items.length - maxShow

            return (
              <div
                key={date}
                className={`min-h-[120px] border-b border-r border-gray-100 p-1.5 ${
                  !inMonth ? 'bg-gray-50' : ''
                }`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-medium ${
                      isToday
                        ? 'bg-indigo-600 text-white w-7 h-7 flex items-center justify-center rounded-full'
                        : inMonth
                          ? 'text-gray-900'
                          : 'text-gray-400'
                    }`}
                  >
                    {day}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-1">
                  {items.slice(0, maxShow).map((item) => (
                    <Link
                      key={`${item.type}-${item.id}-${date}`}
                      href={item.href}
                      className={`block px-1.5 py-0.5 rounded border text-xs truncate transition-colors ${chipStyles[item.type]}`}
                    >
                      <span className="font-medium">{item.label}</span>
                      {item.sublabel && (
                        <span className="ml-1 opacity-70">
                          {item.sublabel}
                        </span>
                      )}
                      {item.statusBadge && (
                        <span
                          className={`ml-1 inline-flex px-1 py-px rounded text-[10px] font-medium ${statusBadgeColor[item.statusBadge] || 'bg-gray-200 text-gray-700'}`}
                        >
                          {item.statusBadge}
                        </span>
                      )}
                    </Link>
                  ))}
                  {overflow > 0 && (
                    <div className="text-xs text-gray-500 font-medium pl-1.5">
                      +{overflow} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ---- Mobile: List View ---- */}
      <div className="md:hidden space-y-2">
        {gridDays
          .filter((d) => d.inMonth)
          .map(({ date, day }) => {
            const isToday = date === todayStr
            const items = itemsByDate[date] || []
            if (items.length === 0 && !isToday) return null

            const dayOfWeek = new Date(date + 'T12:00:00').toLocaleString(
              'default',
              { weekday: 'short' }
            )

            return (
              <div
                key={date}
                className={`rounded-xl border p-3 ${
                  isToday
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-sm font-semibold ${
                      isToday ? 'text-indigo-700' : 'text-gray-900'
                    }`}
                  >
                    {dayOfWeek} {day}
                  </span>
                  {isToday && (
                    <span className="text-xs font-medium text-indigo-600">
                      Today
                    </span>
                  )}
                  {items.length > 0 && (
                    <span className="ml-auto text-xs text-gray-500">
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {items.length === 0 && isToday && (
                  <p className="text-sm text-gray-500">No events today</p>
                )}

                <div className="space-y-1.5">
                  {items.map((item) => (
                    <Link
                      key={`${item.type}-${item.id}-${date}`}
                      href={item.href}
                      className={`block px-2.5 py-1.5 rounded-lg border text-sm transition-colors ${chipStyles[item.type]}`}
                    >
                      <span className="font-medium">{item.label}</span>
                      {item.sublabel && (
                        <span className="ml-1.5 opacity-70">
                          {item.sublabel}
                        </span>
                      )}
                      {item.statusBadge && (
                        <span
                          className={`ml-1.5 inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${statusBadgeColor[item.statusBadge] || 'bg-gray-200 text-gray-700'}`}
                        >
                          {item.statusBadge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
