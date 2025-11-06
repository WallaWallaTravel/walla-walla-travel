'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PendingInvoice {
  booking_id: number;
  booking_number: string;
  customer_name: string;
  customer_email: string;
  tour_date: string;
  estimated_hours: number;
  actual_hours: number | null;
  hourly_rate: number;
  base_price: number;
  calculated_amount: number;
  hours_since_tour: number;
  driver_name: string;
  final_invoice_count: number;
}

export default function AdminInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<number | null>(null);

  useEffect(() => {
    loadPendingInvoices();
  }, []);

  const loadPendingInvoices = async () => {
    try {
      const response = await fetch('/api/admin/pending-invoices');
      const data = await response.json();
      
      if (data.success) {
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bookingId: number) => {
    if (!confirm('Send final invoice to customer?')) return;

    setApproving(bookingId);
    try {
      const response = await fetch(`/api/admin/approve-invoice/${bookingId}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Invoice sent successfully!');
        loadPendingInvoices(); // Refresh list
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error approving invoice:', error);
      alert('❌ Failed to send invoice');
    } finally {
      setApproving(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl font-bold text-gray-900">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Pending Final Invoices</h1>
            <p className="text-gray-600 mt-2">
              Tours completed 48+ hours ago, ready for final billing
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-gray-600 text-sm font-semibold mb-2">PENDING INVOICES</div>
            <div className="text-4xl font-bold text-blue-600">{invoices.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-gray-600 text-sm font-semibold mb-2">TOTAL AMOUNT</div>
            <div className="text-4xl font-bold text-green-600">
              {formatCurrency(invoices.reduce((sum, inv) => sum + inv.calculated_amount, 0))}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-gray-600 text-sm font-semibold mb-2">AVG HOURS</div>
            <div className="text-4xl font-bold text-purple-600">
              {invoices.length > 0
                ? (invoices.reduce((sum, inv) => sum + parseFloat(inv.actual_hours || inv.estimated_hours), 0) / invoices.length).toFixed(1)
                : '0.0'}
            </div>
          </div>
        </div>

        {/* Invoices List */}
        {invoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All caught up!</h2>
            <p className="text-gray-600">No pending final invoices at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.booking_id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Customer & Tour Info */}
                  <div className="lg:col-span-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {invoice.customer_name}
                        </h3>
                        <p className="text-gray-600 text-sm">{invoice.customer_email}</p>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        {invoice.booking_number}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tour Date:</span>
                        <span className="font-semibold">{formatDate(invoice.tour_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Driver:</span>
                        <span className="font-semibold">{invoice.driver_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hours Since Tour:</span>
                        <span className="font-semibold">
                          {Math.floor(invoice.hours_since_tour)} hours
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Hours & Pricing */}
                  <div className="lg:col-span-4 border-l border-r border-gray-200 px-6">
                    <div className="space-y-3">
                      <div>
                        <div className="text-gray-600 text-sm mb-1">Hours</div>
                        <div className="flex items-baseline gap-2">
                          {invoice.actual_hours ? (
                            <>
                              <span className="text-2xl font-bold text-green-600">
                                {Number(invoice.actual_hours).toFixed(1)}
                              </span>
                              <span className="text-sm text-gray-500">
                                (est: {Number(invoice.estimated_hours).toFixed(1)})
                              </span>
                            </>
                          ) : (
                            <span className="text-2xl font-bold text-yellow-600">
                              {Number(invoice.estimated_hours).toFixed(1)} <span className="text-sm">(estimated)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-600 text-sm mb-1">Hourly Rate</div>
                        <div className="text-xl font-bold text-gray-900">
                          {formatCurrency(invoice.hourly_rate)}/hr
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <div className="text-gray-600 text-sm mb-1">Final Amount</div>
                        <div className="text-3xl font-bold text-blue-600">
                          {formatCurrency(invoice.calculated_amount)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          (before tip)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="lg:col-span-3 flex flex-col justify-center">
                    <button
                      onClick={() => handleApprove(invoice.booking_id)}
                      disabled={approving === invoice.booking_id}
                      className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                        approving === invoice.booking_id
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {approving === invoice.booking_id ? (
                        '⏳ Sending...'
                      ) : (
                        <>
                          ✅ Approve & Send
                          <div className="text-sm font-normal mt-1">
                            Final invoice to customer
                          </div>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => router.push(`/bookings/${invoice.booking_id}`)}
                      className="w-full mt-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
                    >
                      View Booking Details
                    </button>
                  </div>
                </div>

                {/* Warning if using estimated hours */}
                {!invoice.actual_hours && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <span className="text-xl">⚠️</span>
                      <span className="font-semibold">
                        Using estimated hours - actual hours not yet synced from time clock
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


