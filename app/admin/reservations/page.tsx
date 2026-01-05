"use client";

/**
 * Admin Reservations Dashboard
 * Manage Reserve & Refine bookings
 */

import { useState, useEffect } from 'react';

interface TourDayDetails {
  date: string;
  guests: number | string;
  hours: number;
}

interface BookingDetails {
  provider?: string;
  providerId?: string;
  tourDays?: TourDayDetails[];
  additionalServices?: { type: string; details: string }[];
  estimatedTotal?: string;
  customerNotes?: string;
  textConsent?: boolean;
}

interface Reservation {
  id: number;
  reservation_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  party_size: number;
  preferred_date: string;
  alternate_date?: string;
  event_type: string;
  special_requests?: string;
  deposit_amount: number;
  deposit_paid: boolean;
  payment_method: string;
  status: string;
  consultation_deadline: string;
  contacted_at?: string;
  created_at: string;
  tour_type?: string;
  tour_duration_type?: string;
  sms_consent?: boolean;
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'contacted' | 'confirmed'>('all');
  const [depositModal, setDepositModal] = useState<{
    open: boolean;
    reservation: Reservation | null;
    depositAmount: string;
    emailSubject: string;
    emailBody: string;
    smsMessage: string;
    sendEmail: boolean;
    sendSms: boolean;
  }>({
    open: false,
    reservation: null,
    depositAmount: '',
    emailSubject: '',
    emailBody: '',
    smsMessage: '',
    sendEmail: true,
    sendSms: false,
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      const response = await fetch('/api/admin/reservations');
      if (response.ok) {
        const data = await response.json();
        setReservations(data.reservations);
      }
    } catch (error) {
      console.error('Failed to load reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsContacted = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/reservations/${id}/contact`, {
        method: 'POST'
      });

      if (response.ok) {
        loadReservations();
      }
    } catch (error) {
      console.error('Failed to mark as contacted:', error);
    }
  };

  // Parse booking details from special_requests JSON
  const parseBookingDetails = (specialRequests: string | undefined): BookingDetails | null => {
    if (!specialRequests) return null;
    try {
      return JSON.parse(specialRequests);
    } catch {
      return null;
    }
  };

  // Open deposit request modal with pre-filled content
  const openDepositModal = (reservation: Reservation) => {
    const details = parseBookingDetails(reservation.special_requests);
    const depositAmount = reservation.party_size <= 7 ? 250 : 350;
    // Format as MM/DD/YYYY
    const date = new Date(reservation.preferred_date);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const tourDate = `${month}/${day}/${year}`;

    const emailSubject = `Deposit Request - ${reservation.reservation_number}`;
    const emailBody = `Hi ${reservation.customer_name.split(' ')[0]},

Thank you for your booking request! We're excited to help you plan your wine tour experience.

**Tour Details:**
- Date: ${tourDate}
- Party Size: ${reservation.party_size} guests
- Experience: ${(reservation.tour_type || 'Wine Tour').replace('_', ' ')}
${details?.estimatedTotal ? `- Estimated Total: ${details.estimatedTotal}` : ''}

**Deposit Required:** $${depositAmount}

To confirm your reservation, please submit your deposit at:
[PAYMENT LINK]

Once we receive your deposit, we'll call within 24 hours to customize your perfect wine country experience.

Questions? Reply to this email or call us at (509) 555-0123.

Best,
The Walla Walla Travel Team`;

    const smsMessage = `Hi ${reservation.customer_name.split(' ')[0]}! Thanks for your booking request (${reservation.reservation_number}). To confirm your ${tourDate} tour for ${reservation.party_size} guests, please submit your $${depositAmount} deposit: [LINK]. Questions? Reply here or call (509) 555-0123.`;

    setDepositModal({
      open: true,
      reservation,
      depositAmount: depositAmount.toString(),
      emailSubject,
      emailBody,
      smsMessage,
      sendEmail: true,
      sendSms: details?.textConsent || false,
    });
  };

  // Send deposit request
  const sendDepositRequest = async () => {
    if (!depositModal.reservation) return;

    setSending(true);
    try {
      const response = await fetch(`/api/admin/reservations/${depositModal.reservation.id}/deposit-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depositAmount: parseFloat(depositModal.depositAmount),
          emailSubject: depositModal.emailSubject,
          emailBody: depositModal.emailBody,
          smsMessage: depositModal.smsMessage,
          sendEmail: depositModal.sendEmail,
          sendSms: depositModal.sendSms,
        }),
      });

      if (response.ok) {
        setDepositModal(prev => ({ ...prev, open: false }));
        loadReservations();
        alert('Deposit request sent successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to send: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to send deposit request:', error);
      alert('Failed to send deposit request');
    } finally {
      setSending(false);
    }
  };

  const filtered = reservations.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'contacted': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (deadline: string, contacted: boolean) => {
    if (contacted) return false;
    return new Date(deadline) < new Date();
  };

  // Format date as MM/DD/YYYY
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Format datetime as MM/DD/YYYY h:mm AM/PM
  const formatDateTime = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reserve & Refine Bookings</h1>
              <p className="text-gray-600 mt-1">Manage customer reservations waiting for consultation</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{reservations.length}</div>
              <div className="text-sm text-gray-600">Total Reservations</div>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-4">
            {[
              { key: 'all', label: 'All', count: reservations.length },
              { key: 'pending', label: 'Pending Contact', count: reservations.filter(r => r.status === 'pending').length },
              { key: 'contacted', label: 'Contacted', count: reservations.filter(r => r.status === 'contacted').length },
              { key: 'confirmed', label: 'Confirmed', count: reservations.filter(r => r.status === 'confirmed').length }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as 'all' | 'pending' | 'confirmed')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === f.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reservations List */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Reservations</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'No reservations yet. When customers use Reserve & Refine, they\'ll appear here.'
                : `No ${filter} reservations.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(reservation => {
              const overdue = isOverdue(reservation.consultation_deadline, !!reservation.contacted_at);
              
              return (
                <div
                  key={reservation.id}
                  className={`bg-white rounded-lg shadow-md p-6 ${
                    overdue ? 'ring-2 ring-red-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {reservation.reservation_number}
                      </h3>
                      <p className="text-gray-600">{reservation.customer_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {overdue && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                          ⚠️ OVERDUE
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(reservation.status)}`}>
                        {reservation.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Contact</div>
                      <div className="text-sm">
                        <div>{reservation.customer_email}</div>
                        <div>{reservation.customer_phone}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-1">Tour Details</div>
                      <div className="text-sm">
                        <div><strong>{reservation.party_size} guests</strong></div>
                        <div>{formatDate(reservation.preferred_date)}</div>
                        <div className="capitalize">{reservation.event_type.replace('_', ' ')}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-1">Deposit</div>
                      <div className="text-sm">
                        <div><strong>${reservation.deposit_amount}</strong> via {reservation.payment_method}</div>
                        <div className={reservation.deposit_paid ? 'text-green-600' : 'text-yellow-600'}>
                          {reservation.deposit_paid ? '✓ Paid' : '⏳ Pending'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {reservation.special_requests && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-4">
                      <div className="text-sm font-semibold text-gray-900 mb-1">Customer Notes:</div>
                      <div className="text-sm text-gray-700">{reservation.special_requests}</div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      <div>Created: {formatDateTime(reservation.created_at)}</div>
                      <div>
                        Call deadline: <strong>{formatDateTime(reservation.consultation_deadline)}</strong>
                      </div>
                      {reservation.contacted_at && (
                        <div className="text-green-600">
                          ✓ Contacted: {formatDateTime(reservation.contacted_at)}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {reservation.status === 'pending' && !reservation.deposit_paid && (
                        <button
                          onClick={() => openDepositModal(reservation)}
                          className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A5632B] transition font-semibold"
                        >
                          💰 Send Deposit Request
                        </button>
                      )}
                      <a
                        href={`mailto:${reservation.customer_email}`}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        📧 Email
                      </a>
                      <a
                        href={`tel:${reservation.customer_phone}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        📞 Call
                      </a>
                      {reservation.status === 'pending' && (
                        <button
                          onClick={() => markAsContacted(reservation.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          ✓ Mark Contacted
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Deposit Request Modal */}
      {depositModal.open && depositModal.reservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Send Deposit Request
                </h2>
                <button
                  onClick={() => setDepositModal(prev => ({ ...prev, open: false }))}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mt-1">
                {depositModal.reservation.reservation_number} - {depositModal.reservation.customer_name}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Deposit Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deposit Amount
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">$</span>
                  <input
                    type="number"
                    value={depositModal.depositAmount}
                    onChange={(e) => setDepositModal(prev => ({ ...prev, depositAmount: e.target.value }))}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Send Options */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={depositModal.sendEmail}
                    onChange={(e) => setDepositModal(prev => ({ ...prev, sendEmail: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Send Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={depositModal.sendSms}
                    onChange={(e) => setDepositModal(prev => ({ ...prev, sendSms: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Send SMS
                    {parseBookingDetails(depositModal.reservation.special_requests)?.textConsent && (
                      <span className="text-green-600 ml-1">(Customer consented)</span>
                    )}
                  </span>
                </label>
              </div>

              {/* Email Content */}
              {depositModal.sendEmail && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Email Content</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={depositModal.emailSubject}
                      onChange={(e) => setDepositModal(prev => ({ ...prev, emailSubject: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                    <textarea
                      value={depositModal.emailBody}
                      onChange={(e) => setDepositModal(prev => ({ ...prev, emailBody: e.target.value }))}
                      rows={12}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              {/* SMS Content */}
              {depositModal.sendSms && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">SMS Content</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message <span className="text-gray-400">({depositModal.smsMessage.length}/160 characters)</span>
                    </label>
                    <textarea
                      value={depositModal.smsMessage}
                      onChange={(e) => setDepositModal(prev => ({ ...prev, smsMessage: e.target.value }))}
                      rows={4}
                      maxLength={320}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setDepositModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={sendDepositRequest}
                disabled={sending || (!depositModal.sendEmail && !depositModal.sendSms)}
                className="px-6 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A5632B] transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send Deposit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


