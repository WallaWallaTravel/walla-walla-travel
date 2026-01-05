'use client'

import { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'

interface LunchOrder {
  id: number
  booking_id: number
  booking_number: string
  customer_name: string
  tour_date: string
  restaurant_id: number
  restaurant_name: string
  restaurant_email: string
  order_items: Array<{
    name: string
    quantity: number
    price: number
    for_person?: string
    modifications?: string
  }>
  subtotal: number
  tax: number
  total: number
  estimated_arrival_time: string
  dietary_restrictions?: string
  special_instructions?: string
  status: string
  created_at: string
  approved_at?: string
  email_sent_at?: string
  commission_amount?: number
}

export default function AdminLunchOrdersPage() {
  const [orders, setOrders] = useState<LunchOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending')
  const [approving, setApproving] = useState<number | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<LunchOrder | null>(null)

  useEffect(() => {
    loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const loadOrders = async () => {
    try {
      const response = await fetch(`/api/admin/lunch-orders?status=${filter}`)
      const data = await response.json()
      setOrders(data.orders || [])
    } catch (error) {
      logger.error('Error loading orders', { error })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (orderId: number) => {
    if (!confirm('Approve this order and send to restaurant?')) return
    
    setApproving(orderId)
    try {
      const response = await fetch(`/api/admin/lunch-orders/${orderId}/approve`, {
        method: 'POST',
      })

      if (response.ok) {
        alert('✅ Order approved and email sent to restaurant!')
        loadOrders()
        setSelectedOrder(null)
      } else {
        throw new Error('Failed to approve order')
      }
    } catch (error) {
      logger.error('Error approving order', { error })
      alert('Failed to approve order. Please try again.')
    } finally {
      setApproving(null)
    }
  }

  const handleReject = async (orderId: number) => {
    const reason = prompt('Reason for rejection (optional):')
    
    try {
      const response = await fetch(`/api/admin/lunch-orders/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (response.ok) {
        alert('Order rejected.')
        loadOrders()
        setSelectedOrder(null)
      } else {
        throw new Error('Failed to reject order')
      }
    } catch (error) {
      logger.error('Error rejecting order', { error })
      alert('Failed to reject order.')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending_approval: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      sent_to_restaurant: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-purple-100 text-purple-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lunch orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🍽️ Lunch Orders</h1>
          <p className="text-gray-600 mt-2">
            Review and approve lunch orders from tour clients
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'approved', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg font-medium capitalize ${
                filter === tab
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab === 'pending' ? '⏳ Pending' : tab === 'approved' ? '✅ Approved' : '📋 All'}
            </button>
          ))}
        </div>

        {/* Orders Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Orders List */}
          <div className="lg:col-span-2 space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                <div className="text-4xl mb-4">🍽️</div>
                <p>No {filter === 'all' ? '' : filter} lunch orders</p>
              </div>
            ) : (
              orders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`w-full text-left bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow ${
                    selectedOrder?.id === order.id ? 'ring-2 ring-purple-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {order.customer_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {order.restaurant_name}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>
                      {new Date(order.tour_date).toLocaleDateString()} • {order.estimated_arrival_time}
                    </span>
                    <span className="font-medium text-gray-900">
                      ${order.total.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    {order.order_items.length} items • Booking #{order.booking_number}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Order Details */}
          <div className="lg:col-span-1">
            {selectedOrder ? (
              <div className="bg-white rounded-lg shadow p-6 sticky top-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Order Details
                </h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Customer</p>
                    <p className="font-medium">{selectedOrder.customer_name}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Restaurant</p>
                    <p className="font-medium">{selectedOrder.restaurant_name}</p>
                    <p className="text-sm text-gray-600">{selectedOrder.restaurant_email}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Tour Date</p>
                    <p className="font-medium">
                      {new Date(selectedOrder.tour_date).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Arrival Time</p>
                    <p className="font-medium">{selectedOrder.estimated_arrival_time}</p>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500 mb-2">Order Items</p>
                    <div className="space-y-2">
                      {selectedOrder.order_items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>
                            {item.quantity}x {item.name}
                            {item.for_person && <span className="text-gray-500"> ({item.for_person})</span>}
                          </span>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>${selectedOrder.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax</span>
                      <span>${selectedOrder.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold mt-2">
                      <span>Total</span>
                      <span>${selectedOrder.total.toFixed(2)}</span>
                    </div>
                    {selectedOrder.commission_amount && (
                      <div className="flex justify-between text-sm text-green-600 mt-1">
                        <span>Commission (10%)</span>
                        <span>${selectedOrder.commission_amount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {selectedOrder.dietary_restrictions && (
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800">⚠️ Dietary Restrictions</p>
                      <p className="text-sm text-yellow-700">{selectedOrder.dietary_restrictions}</p>
                    </div>
                  )}

                  {selectedOrder.special_instructions && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">📝 Special Instructions</p>
                      <p className="text-sm text-blue-700">{selectedOrder.special_instructions}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {(selectedOrder.status === 'pending' || selectedOrder.status === 'pending_approval') && (
                    <div className="flex gap-2 mt-6">
                      <button
                        onClick={() => handleReject(selectedOrder.id)}
                        className="flex-1 px-4 py-2 border-2 border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(selectedOrder.id)}
                        disabled={approving === selectedOrder.id}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        {approving === selectedOrder.id ? 'Sending...' : '✅ Approve & Send'}
                      </button>
                    </div>
                  )}

                  {selectedOrder.approved_at && (
                    <div className="text-center text-sm text-green-600 mt-4">
                      ✅ Approved on {new Date(selectedOrder.approved_at).toLocaleString()}
                    </div>
                  )}

                  {selectedOrder.email_sent_at && (
                    <div className="text-center text-sm text-blue-600">
                      📧 Email sent on {new Date(selectedOrder.email_sent_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                <div className="text-4xl mb-4">👈</div>
                <p>Select an order to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
