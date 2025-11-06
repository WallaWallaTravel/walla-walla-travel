'use client';

interface Booking {
  id: number;
  booking_number: string;
  customer_name: string;
  tour_date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  status: string;
  driver_name?: string;
  vehicle_name?: string;
}

interface Props {
  bookings: Booking[];
  view: 'day' | 'week' | 'month';
  selectedDate: Date;
  onBookingClick: (booking: Booking) => void;
}

export default function CalendarView({ bookings, view, selectedDate, onBookingClick }: Props) {
  if (view === 'day') {
    return <DayView bookings={bookings} selectedDate={selectedDate} onBookingClick={onBookingClick} />;
  } else if (view === 'week') {
    return <WeekView bookings={bookings} selectedDate={selectedDate} onBookingClick={onBookingClick} />;
  } else {
    return <MonthView bookings={bookings} selectedDate={selectedDate} onBookingClick={onBookingClick} />;
  }
}

// Day View - Hourly timeline
function DayView({ bookings, selectedDate, onBookingClick }: Omit<Props, 'view'>) {
  const dateStr = selectedDate.toISOString().split('T')[0];
  const dayBookings = bookings.filter(b => b.tour_date === dateStr);

  const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-gray-50 border-b-2 border-gray-200">
        <h3 className="font-bold text-gray-900 text-lg">
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h3>
        <p className="text-gray-600">{dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="p-4">
        {dayBookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-gray-600 font-semibold">No bookings for this day</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayBookings.map((booking) => (
              <button
                key={booking.id}
                onClick={() => onBookingClick(booking)}
                className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-purple-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{booking.customer_name}</h4>
                    <p className="text-sm text-gray-600">{booking.booking_number}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Time:</span>
                    <p className="font-semibold text-gray-900">{booking.start_time} - {booking.end_time}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Party:</span>
                    <p className="font-semibold text-gray-900">{booking.party_size} guests</p>
                  </div>
                  {booking.driver_name && (
                    <div>
                      <span className="text-gray-600">Driver:</span>
                      <p className="font-semibold text-gray-900">{booking.driver_name}</p>
                    </div>
                  )}
                  {booking.vehicle_name && (
                    <div>
                      <span className="text-gray-600">Vehicle:</span>
                      <p className="font-semibold text-gray-900">{booking.vehicle_name}</p>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Week View - 7-day grid
function WeekView({ bookings, selectedDate, onBookingClick }: Omit<Props, 'view'>) {
  const startOfWeek = new Date(selectedDate);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - day);

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    return date;
  });

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {days.map((date, index) => {
          const dateStr = date.toISOString().split('T')[0];
          const dayBookings = bookings.filter(b => b.tour_date === dateStr);
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <div key={index} className="bg-white min-h-[200px]">
              <div className={`p-3 border-b-2 ${isToday ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 border-gray-200'}`}>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-600 uppercase">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <p className={`text-2xl font-bold ${isToday ? 'text-purple-600' : 'text-gray-900'}`}>
                    {date.getDate()}
                  </p>
                </div>
              </div>

              <div className="p-2 space-y-2">
                {dayBookings.map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => onBookingClick(booking)}
                    className={`w-full text-left p-2 rounded text-xs hover:shadow-md transition-all ${getStatusBgColor(booking.status)}`}
                  >
                    <p className="font-bold text-gray-900 truncate">{booking.start_time}</p>
                    <p className="truncate text-gray-700">{booking.customer_name}</p>
                    <p className="text-gray-600">{booking.party_size} guests</p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Month View - Calendar grid
function MonthView({ bookings, selectedDate, onBookingClick }: Omit<Props, 'view'>) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="bg-gray-100 p-3 text-center">
            <p className="font-bold text-gray-700 text-sm">{day}</p>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {days.map((date, index) => {
          if (!date) {
            return <div key={index} className="bg-gray-50 min-h-[100px]" />;
          }

          const dateStr = date.toISOString().split('T')[0];
          const dayBookings = bookings.filter(b => b.tour_date === dateStr);
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <div key={index} className="bg-white min-h-[100px] p-2">
              <p className={`text-right font-bold mb-1 ${isToday ? 'text-purple-600' : 'text-gray-900'}`}>
                {date.getDate()}
              </p>
              <div className="space-y-1">
                {dayBookings.slice(0, 3).map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => onBookingClick(booking)}
                    className={`w-full text-left px-2 py-1 rounded text-xs hover:shadow-md transition-all ${getStatusBgColor(booking.status)}`}
                  >
                    <p className="font-semibold truncate">{booking.start_time}</p>
                    <p className="truncate">{booking.customer_name}</p>
                  </button>
                ))}
                {dayBookings.length > 3 && (
                  <p className="text-xs text-gray-600 text-center">+{dayBookings.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
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

function getStatusBgColor(status: string): string {
  switch (status) {
    case 'confirmed': return 'bg-green-50 border-2 border-green-200';
    case 'pending': return 'bg-yellow-50 border-2 border-yellow-200';
    case 'assigned': return 'bg-blue-50 border-2 border-blue-200';
    case 'in_progress': return 'bg-purple-50 border-2 border-purple-200';
    case 'completed': return 'bg-gray-50 border-2 border-gray-200';
    case 'cancelled': return 'bg-red-50 border-2 border-red-200';
    default: return 'bg-gray-50 border-2 border-gray-200';
  }
}

