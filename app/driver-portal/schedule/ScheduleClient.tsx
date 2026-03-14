'use client'

import { useRouter } from 'next/navigation'

interface Props {
  bookings: Array<{
    id: number
    customer_name: string
    tour_date: string | Date
    start_time: string | Date | null
    party_size: number
    status: string
  }>
  year: number
  month: number
}

function toDateKey(d: string | Date): string {
  const date = new Date(d)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function formatTime(time: string | Date | null): string {
  if (time === null || time === undefined) return ''

  if (time instanceof Date) {
    const h = time.getUTCHours()
    const m = time.getUTCMinutes()
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 || 12
    return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`
  }

  if (typeof time === 'string') {
    if (!time) return ''
    // Handle "HH:MM:SS" string format
    const parts = time.split(':').map(Number)
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const h = parts[0]
      const m = parts[1]
      const ampm = h >= 12 ? 'PM' : 'AM'
      const displayH = h % 12 || 12
      return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`
    }
  }

  return ''
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'bg-green-100 text-green-800 border-green-300'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'completed':
      return 'bg-blue-100 text-blue-800 border-blue-300'
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-300'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300'
  }
}

export default function ScheduleClient({ bookings, year, month }: Props) {
  const router = useRouter()

  const navigateMonth = (direction: -1 | 1) => {
    let newMonth = month + direction
    let newYear = year
    if (newMonth < 1) {
      newMonth = 12
      newYear = year - 1
    } else if (newMonth > 12) {
      newMonth = 1
      newYear = year + 1
    }
    router.push(`/driver-portal/schedule?year=${newYear}&month=${newMonth}`)
  }

  const goToToday = () => {
    const now = new Date()
    router.push(`/driver-portal/schedule?year=${now.getUTCFullYear()}&month=${now.getUTCMonth() + 1}`)
  }

  // Build calendar structure using UTC
  const firstDayOfWeek = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d)
  }

  // Build a map of dateKey -> bookings
  const bookingsByDate = bookings.reduce(
    (acc, booking) => {
      const key = toDateKey(booking.tour_date)
      if (!acc[key]) acc[key] = []
      acc[key].push(booking)
      return acc
    },
    {} as Record<string, typeof bookings>
  )

  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  })

  // Today detection via UTC
  const nowUtc = new Date()
  const todayKey = `${nowUtc.getUTCFullYear()}-${String(nowUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(nowUtc.getUTCDate()).padStart(2, '0')}`

  const confirmedCount = bookings.filter(b => b.status.toLowerCase() === 'confirmed').length

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white">📅 My Schedule</h1>
          <p className="text-blue-100 text-lg mt-1">Your assigned tours</p>
        </div>
      </div>

      {/* Sticky Controls */}
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigateMonth(-1)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-gray-700 transition-colors"
          >
            ← Previous
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Today
            </button>
            <h2 className="text-xl font-bold text-gray-900">
              {monthName} {year}
            </h2>
          </div>
          <button
            onClick={() => navigateMonth(1)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-gray-700 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-gray-100 border-b border-gray-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center font-bold text-gray-600 text-sm">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[100px] bg-gray-50 border border-gray-100"
                  />
                )
              }

              const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayBookings = bookingsByDate[dateKey] || []
              const isToday = dateKey === todayKey

              return (
                <div
                  key={day}
                  onClick={() =>
                    router.push(`/driver-portal/dashboard?viewMode=today&date=${dateKey}`)
                  }
                  className={`min-h-[100px] border border-gray-100 p-2 cursor-pointer transition-colors ${
                    isToday ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}
                    >
                      {day}
                    </span>
                    {dayBookings.length > 0 && (
                      <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                        {dayBookings.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayBookings.map(booking => (
                      <div
                        key={booking.id}
                        className={`p-1.5 rounded border text-xs ${getStatusColor(booking.status)}`}
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="font-bold truncate">{formatTime(booking.start_time)}</div>
                        <div className="truncate font-semibold">{booking.customer_name}</div>
                        <div className="font-medium">{booking.party_size} guests</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="mt-6 bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-900">This Month Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="text-3xl font-bold text-blue-600">{bookings.length}</div>
              <div className="text-gray-700 font-medium">Total Tours</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <div className="text-3xl font-bold text-green-600">{confirmedCount}</div>
              <div className="text-gray-700 font-medium">Confirmed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
