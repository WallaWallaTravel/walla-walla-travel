'use client';

import { useState, useEffect } from 'react';

interface LunchOrder {
  id: number;
  booking_id: number;
  customer_name: string;
  tour_date: string;
  restaurant_name: string;
  restaurant_email: string;
  party_size: number;
  total: number;
  status: string;
  email_body: string;
  created_at: string;
}

export default function AdminLunchOrdersPage() {
  const [orders, setOrders] = useState<LunchOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<LunchOrder | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await fetch('/api/admin/lunch-orders');
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (orderId: number) => {
    if (!confirm('Approve and send this lunch order to the restaurant?')) {
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/admin/lunch-orders/${orderId}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Lunch order approved and sent to restaurant!');
        setSelectedOrder(null);
        loadOrders();
      } else {
        throw new Error('Failed to approve order');
      }
    } catch (error) {
      console.error('Error approving order:', error);
      alert('Failed to approve order. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lunch orders...</p>
        </div>
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pending_approval');
  const sentOrders = orders.filter(o => o.status === 'sent');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🍽️ Lunch Orders</h1>
          <p className="text-gray-600 mt-2">
            Review and approve client lunch orders
          </p>
        </div>

        {/* Pending Orders */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Pending Approval ({pendingOrders.length})
          </h2>
          
          {pendingOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No pending lunch orders
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingOrders.map(order => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {order.customer_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Tour Date: {new Date(order.tour_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Restaurant: {order.restaurant_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">
                        ${order.total.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Party of {order.party_size}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="flex-1 px-4 py-2 border-2 border-purple-600 text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
                    >
                      📄 View Details
                    </button>
                    <button
                      onClick={() => handleApprove(order.id)}
                      disabled={sending}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      ✅ Approve & Send
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sent Orders */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Sent Orders ({sentOrders.length})
          </h2>
          
          {sentOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No sent orders yet
            </div>
          ) : (
            <div className="grid gap-4">
              {sentOrders.map(order => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow p-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {order.customer_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(order.tour_date).toLocaleDateString()} • {order.restaurant_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        ${order.total.toFixed(2)}
                      </div>
                      <div className="text-xs text-green-600">✓ Sent</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Order Details
                </h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800">
                  {selectedOrder.email_body}
                </pre>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => handleApprove(selectedOrder.id)}
                  disabled={sending}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {sending ? 'Sending...' : '✅ Approve & Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

