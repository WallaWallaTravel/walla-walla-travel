'use client'

import { useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import type { InvoiceDetail, PendingInvoiceItem } from '@/lib/actions/invoice-queries'
import {
  addLineItem,
  updateLineItem,
  deleteLineItem,
  recalculateInvoiceTotals,
  updateInvoiceStatus,
  type SerializedLineItem,
} from '@/lib/actions/invoice-line-items'
import { approveAndSendInvoice } from '@/lib/actions/invoices'

// ============================================================================
// Types
// ============================================================================

type InvoiceFilter = {
  status: string
  type: string
  search: string
}

type EditingLineItem = {
  id?: number // undefined = new item
  description: string
  service_type: string
  quantity: string
  unit_price: string
}

// ============================================================================
// Constants
// ============================================================================

const TAX_RATE = 0.091

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-700' },
  sent: { label: 'Sent', bg: 'bg-blue-50', text: 'text-blue-700' },
  paid: { label: 'Paid', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  overdue: { label: 'Overdue', bg: 'bg-red-50', text: 'text-red-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-slate-100', text: 'text-slate-500' },
}

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Deposit',
  final: 'Final',
  final_payment: 'Final',
  tip: 'Tip',
  per_person: 'Per Person',
}

const SERVICE_TYPES = [
  { value: '', label: 'Select type...' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'tasting_fee', label: 'Tasting Fee' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'guide', label: 'Guide' },
  { value: 'gratuity', label: 'Gratuity' },
  { value: 'discount', label: 'Discount' },
  { value: 'tax', label: 'Tax' },
  { value: 'other', label: 'Other' },
]

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

// ============================================================================
// Component
// ============================================================================

export default function InvoiceManager({
  initialInvoices,
  pendingInvoices,
}: {
  initialInvoices: InvoiceDetail[]
  pendingInvoices: PendingInvoiceItem[]
}) {
  // State
  const [invoices, setInvoices] = useState(initialInvoices)
  const [pending] = useState(pendingInvoices)
  const [filters, setFilters] = useState<InvoiceFilter>({ status: '', type: '', search: '' })
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all')
  const [isPending, startTransition] = useTransition()

  // Line item editing
  const [editingItem, setEditingItem] = useState<EditingLineItem | null>(null)
  const [lineItemsMap, setLineItemsMap] = useState<Record<number, SerializedLineItem[]>>(() => {
    const map: Record<number, SerializedLineItem[]> = {}
    for (const inv of initialInvoices) {
      if (inv.line_items.length > 0) {
        map[inv.id] = inv.line_items.map(li => ({
          ...li,
          created_at: null,
          updated_at: null,
        }))
      }
    }
    return map
  })
  const [totalsMap, setTotalsMap] = useState<Record<number, { subtotal: number; tax_amount: number; tip_amount: number; total_amount: number }>>({})

  // Pending invoice review
  const [reviewingPendingId, setReviewingPendingId] = useState<number | null>(null)
  const [reviewHours, setReviewHours] = useState('')

  // Toast messages
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // ============================================================================
  // Filtering
  // ============================================================================

  const filteredInvoices = invoices.filter((inv) => {
    if (filters.status && inv.status !== filters.status) return false
    if (filters.type && inv.invoice_type !== filters.type) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const matchesCustomer = inv.booking.customer_name.toLowerCase().includes(q)
      const matchesNumber = inv.invoice_number.toLowerCase().includes(q)
      const matchesBooking = inv.booking.booking_number.toLowerCase().includes(q)
      if (!matchesCustomer && !matchesNumber && !matchesBooking) return false
    }
    return true
  })

  // Stats
  const stats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    totalAmount: invoices.reduce((sum, i) => sum + i.total_amount, 0),
    pendingCount: pending.length,
    pendingAmount: pending.reduce((sum, p) => sum + p.calculated_amount, 0),
  }

  // ============================================================================
  // Line Item Actions
  // ============================================================================

  function getLineItems(invoiceId: number): SerializedLineItem[] {
    return lineItemsMap[invoiceId] || []
  }

  function getTotals(invoice: InvoiceDetail) {
    if (totalsMap[invoice.id]) return totalsMap[invoice.id]
    return {
      subtotal: invoice.subtotal,
      tax_amount: invoice.tax_amount ?? 0,
      tip_amount: invoice.tip_amount ?? 0,
      total_amount: invoice.total_amount,
    }
  }

  function startNewLineItem() {
    setEditingItem({ description: '', service_type: '', quantity: '1', unit_price: '' })
  }

  function startEditLineItem(item: SerializedLineItem) {
    setEditingItem({
      id: item.id,
      description: item.description,
      service_type: item.service_type || '',
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
    })
  }

  function cancelEditLineItem() {
    setEditingItem(null)
  }

  async function saveLineItem(invoiceId: number) {
    if (!editingItem) return
    const qty = parseFloat(editingItem.quantity) || 1
    const price = parseFloat(editingItem.unit_price) || 0
    const amount = Math.round(qty * price * 100) / 100

    startTransition(async () => {
      try {
        if (editingItem.id) {
          // Update
          const updated = await updateLineItem(editingItem.id, {
            description: editingItem.description,
            service_type: editingItem.service_type || undefined,
            quantity: qty,
            unit_price: price,
            amount,
          })
          setLineItemsMap(prev => ({
            ...prev,
            [invoiceId]: (prev[invoiceId] || []).map(li => li.id === updated.id ? updated : li),
          }))
        } else {
          // Create
          const maxSort = getLineItems(invoiceId).reduce((max, li) => Math.max(max, li.sort_order), 0)
          const created = await addLineItem({
            invoice_id: invoiceId,
            description: editingItem.description,
            service_type: editingItem.service_type || undefined,
            quantity: qty,
            unit_price: price,
            amount,
            sort_order: maxSort + 1,
          })
          setLineItemsMap(prev => ({
            ...prev,
            [invoiceId]: [...(prev[invoiceId] || []), created],
          }))
        }

        // Recalculate totals
        const newTotals = await recalculateInvoiceTotals(invoiceId)
        setTotalsMap(prev => ({ ...prev, [invoiceId]: newTotals }))

        // Update the invoice in the list
        setInvoices(prev => prev.map(inv =>
          inv.id === invoiceId
            ? { ...inv, subtotal: newTotals.subtotal, tax_amount: newTotals.tax_amount, tip_amount: newTotals.tip_amount, total_amount: newTotals.total_amount }
            : inv
        ))

        setEditingItem(null)
        showToast(editingItem.id ? 'Line item updated' : 'Line item added')
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to save line item', 'error')
      }
    })
  }

  async function handleDeleteLineItem(invoiceId: number, lineItemId: number) {
    startTransition(async () => {
      try {
        await deleteLineItem(lineItemId)
        setLineItemsMap(prev => ({
          ...prev,
          [invoiceId]: (prev[invoiceId] || []).filter(li => li.id !== lineItemId),
        }))

        const newTotals = await recalculateInvoiceTotals(invoiceId)
        setTotalsMap(prev => ({ ...prev, [invoiceId]: newTotals }))
        setInvoices(prev => prev.map(inv =>
          inv.id === invoiceId
            ? { ...inv, subtotal: newTotals.subtotal, tax_amount: newTotals.tax_amount, tip_amount: newTotals.tip_amount, total_amount: newTotals.total_amount }
            : inv
        ))

        showToast('Line item deleted')
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to delete', 'error')
      }
    })
  }

  // ============================================================================
  // Invoice Status Actions
  // ============================================================================

  async function handleStatusChange(invoiceId: number, newStatus: string) {
    startTransition(async () => {
      try {
        await updateInvoiceStatus(invoiceId, newStatus)
        setInvoices(prev => prev.map(inv =>
          inv.id === invoiceId ? { ...inv, status: newStatus } : inv
        ))
        showToast(`Invoice marked as ${newStatus}`)
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to update status', 'error')
      }
    })
  }

  // ============================================================================
  // Pending Invoice Approve
  // ============================================================================

  async function handleApprovePending(bookingId: number) {
    const inv = pending.find(p => p.booking_id === bookingId)
    if (!inv) return

    const hours = reviewHours ? parseFloat(reviewHours) : undefined

    startTransition(async () => {
      try {
        const result = await approveAndSendInvoice({ bookingId, reviewedHours: hours })
        if (result.success) {
          showToast(`Invoice ${result.invoice?.invoice_number} sent to ${inv.customer_name}`)
          setReviewingPendingId(null)
          setReviewHours('')
          // Reload would be ideal but we just remove from the list for immediate feedback
        } else {
          const errMsg = typeof result.error === 'string' ? result.error : 'Failed to send invoice'
          showToast(errMsg, 'error')
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to approve', 'error')
      }
    })
  }

  // ============================================================================
  // Render
  // ============================================================================

  const expandedInvoice = expandedId ? invoices.find(inv => inv.id === expandedId) : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-600 mt-1">Manage invoices, line items, and payments</p>
        </div>
        <Link
          href="/admin/dashboard"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Draft" value={stats.draft} color="text-slate-700" />
        <StatCard label="Sent" value={stats.sent} color="text-blue-600" />
        <StatCard label="Paid" value={stats.paid} color="text-emerald-600" />
        <StatCard label="Overdue" value={stats.overdue} color="text-red-600" />
        <StatCard label="Pending Approval" value={stats.pendingCount} color="text-amber-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-lg border border-gray-200 p-1 w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'pending' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending Approval ({pending.length})
        </button>
      </div>

      {/* Pending Approval Tab */}
      {activeTab === 'pending' && (
        <PendingInvoicesSection
          pending={pending}
          reviewingId={reviewingPendingId}
          reviewHours={reviewHours}
          isPending={isPending}
          onReview={(id, hours) => {
            setReviewingPendingId(id)
            setReviewHours(String(hours))
          }}
          onCancelReview={() => { setReviewingPendingId(null); setReviewHours('') }}
          onHoursChange={setReviewHours}
          onApprove={handleApprovePending}
        />
      )}

      {/* All Invoices Tab */}
      {activeTab === 'all' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <select
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filters.type}
              onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="deposit">Deposit</option>
              <option value="final">Final</option>
              <option value="tip">Tip</option>
            </select>
            <input
              type="text"
              placeholder="Search customer, invoice #, booking #..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-72"
            />
            {(filters.status || filters.type || filters.search) && (
              <button
                onClick={() => setFilters({ status: '', type: '', search: '' })}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Invoices Table */}
          {filteredInvoices.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="text-gray-400 text-4xl mb-3">📄</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No invoices found</h3>
              <p className="text-sm text-gray-600">
                {filters.status || filters.type || filters.search
                  ? 'Try adjusting your filters.'
                  : 'Invoices will appear here when created.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-slate-50">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Invoice #</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Customer</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Type</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Date</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Amount</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${expandedId === inv.id ? 'bg-blue-50/50' : ''}`}
                      onClick={() => { setExpandedId(expandedId === inv.id ? null : inv.id); setEditingItem(null) }}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.invoice_number}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{inv.booking.customer_name}</div>
                        <div className="text-xs text-gray-500">{inv.booking.booking_number}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{TYPE_LABELS[inv.invoice_type] || inv.invoice_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(inv.created_at)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(inv.total_amount)}</td>
                      <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === inv.id ? null : inv.id); setEditingItem(null) }}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {expandedId === inv.id ? 'Close' : 'Details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Expanded Detail Panel */}
              {expandedInvoice && (
                <InvoiceDetailPanel
                  invoice={expandedInvoice}
                  lineItems={getLineItems(expandedInvoice.id)}
                  totals={getTotals(expandedInvoice)}
                  editingItem={editingItem}
                  isPending={isPending}
                  onStartNew={startNewLineItem}
                  onStartEdit={startEditLineItem}
                  onCancelEdit={cancelEditLineItem}
                  onSave={() => saveLineItem(expandedInvoice.id)}
                  onDelete={(liId) => handleDeleteLineItem(expandedInvoice.id, liId)}
                  onEditingChange={setEditingItem}
                  onStatusChange={(status) => handleStatusChange(expandedInvoice.id, status)}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

function StatCard({ label, value, color = 'text-gray-900' }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  )
}

function InvoiceDetailPanel({
  invoice,
  lineItems,
  totals,
  editingItem,
  isPending,
  onStartNew,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onEditingChange,
  onStatusChange,
}: {
  invoice: InvoiceDetail
  lineItems: SerializedLineItem[]
  totals: { subtotal: number; tax_amount: number; tip_amount: number; total_amount: number }
  editingItem: EditingLineItem | null
  isPending: boolean
  onStartNew: () => void
  onStartEdit: (item: SerializedLineItem) => void
  onCancelEdit: () => void
  onSave: () => void
  onDelete: (id: number) => void
  onEditingChange: (item: EditingLineItem) => void
  onStatusChange: (status: string) => void
}) {
  return (
    <div className="border-t-2 border-blue-200 bg-white px-6 py-6">
      {/* Header row */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-gray-900">{invoice.invoice_number}</h3>
            <StatusBadge status={invoice.status} />
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <div className="text-gray-500">Customer</div>
            <div className="text-gray-900 font-medium">{invoice.booking.customer_name}</div>
            <div className="text-gray-500">Email</div>
            <div className="text-gray-900">{invoice.booking.customer_email}</div>
            <div className="text-gray-500">Booking</div>
            <div className="text-gray-900">{invoice.booking.booking_number}</div>
            <div className="text-gray-500">Tour Date</div>
            <div className="text-gray-900">{formatDate(invoice.booking.tour_date)}</div>
            {invoice.sent_at && (
              <>
                <div className="text-gray-500">Sent</div>
                <div className="text-gray-900">{formatDate(invoice.sent_at)}</div>
              </>
            )}
            {invoice.due_date && (
              <>
                <div className="text-gray-500">Due</div>
                <div className="text-gray-900">{formatDate(invoice.due_date)}</div>
              </>
            )}
            {invoice.paid_at && (
              <>
                <div className="text-gray-500">Paid</div>
                <div className="text-gray-900">{formatDate(invoice.paid_at)}</div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {invoice.status === 'draft' && (
            <button
              onClick={() => onStatusChange('sent')}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Send Invoice
            </button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <button
              onClick={() => onStatusChange('paid')}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              Mark as Paid
            </button>
          )}
          {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
            <button
              onClick={() => onStatusChange('cancelled')}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            disabled
            className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
            title="Coming soon"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Line Items</h4>
          {!editingItem && (
            <button
              onClick={onStartNew}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              + Add Line Item
            </button>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2">Description</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2 w-28">Type</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-2 w-20">Qty</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-2 w-28">Unit Price</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-2 w-28">Amount</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-4 py-2 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lineItems.map((li) => (
                editingItem?.id === li.id ? (
                  <LineItemEditRow
                    key={li.id}
                    item={editingItem}
                    isPending={isPending}
                    onChange={onEditingChange}
                    onSave={onSave}
                    onCancel={onCancelEdit}
                  />
                ) : (
                  <tr key={li.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-sm text-gray-900">{li.description}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{li.service_type || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{li.quantity}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-900 text-right">{formatCurrency(li.unit_price)}</td>
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900 text-right">{formatCurrency(li.amount)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => onStartEdit(li)} className="text-xs text-blue-600 hover:text-blue-800 mr-2">Edit</button>
                      <button onClick={() => onDelete(li.id)} disabled={isPending} className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50">Delete</button>
                    </td>
                  </tr>
                )
              ))}
              {/* New item row */}
              {editingItem && !editingItem.id && (
                <LineItemEditRow
                  item={editingItem}
                  isPending={isPending}
                  onChange={onEditingChange}
                  onSave={onSave}
                  onCancel={onCancelEdit}
                />
              )}
              {lineItems.length === 0 && !editingItem && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-sm text-gray-500 text-center">
                    No line items yet.{' '}
                    <button onClick={onStartNew} className="text-blue-600 hover:text-blue-800 font-medium">Add one</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium text-gray-900">{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Tax (9.1%)</span>
            <span className="font-medium text-gray-900">{formatCurrency(totals.tax_amount)}</span>
          </div>
          {totals.tip_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Tip</span>
              <span className="font-medium text-gray-900">{formatCurrency(totals.tip_amount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="font-semibold text-gray-900">Total</span>
            <span className="font-bold text-gray-900 text-lg">{formatCurrency(totals.total_amount)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function LineItemEditRow({
  item,
  isPending,
  onChange,
  onSave,
  onCancel,
}: {
  item: EditingLineItem
  isPending: boolean
  onChange: (item: EditingLineItem) => void
  onSave: () => void
  onCancel: () => void
}) {
  const qty = parseFloat(item.quantity) || 0
  const price = parseFloat(item.unit_price) || 0
  const computed = Math.round(qty * price * 100) / 100

  return (
    <tr className="bg-blue-50/30">
      <td className="px-3 py-2">
        <input
          type="text"
          value={item.description}
          onChange={(e) => onChange({ ...item, description: e.target.value })}
          placeholder="Description"
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          autoFocus
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={item.service_type}
          onChange={(e) => onChange({ ...item, service_type: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {SERVICE_TYPES.map(st => (
            <option key={st.value} value={st.value}>{st.label}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={item.quantity}
          onChange={(e) => onChange({ ...item, quantity: e.target.value })}
          step="0.5"
          min="0.5"
          className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          value={item.unit_price}
          onChange={(e) => onChange({ ...item, unit_price: e.target.value })}
          step="0.01"
          placeholder="0.00"
          className="w-full px-2 py-1.5 text-sm text-right border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </td>
      <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
        {formatCurrency(computed)}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          onClick={onSave}
          disabled={isPending || !item.description}
          className="text-xs font-medium text-emerald-600 hover:text-emerald-800 mr-2 disabled:opacity-50"
        >
          Save
        </button>
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </td>
    </tr>
  )
}

function PendingInvoicesSection({
  pending,
  reviewingId,
  reviewHours,
  isPending,
  onReview,
  onCancelReview,
  onHoursChange,
  onApprove,
}: {
  pending: PendingInvoiceItem[]
  reviewingId: number | null
  reviewHours: string
  isPending: boolean
  onReview: (id: number, hours: number) => void
  onCancelReview: () => void
  onHoursChange: (h: string) => void
  onApprove: (id: number) => void
}) {
  if (pending.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-gray-400 text-4xl mb-3">&#10003;</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">All caught up!</h3>
        <p className="text-sm text-gray-600">No tours awaiting final invoicing.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">Tours completed 48+ hours ago, ready for final billing.</p>
      {pending.map((inv) => (
        <div key={inv.booking_id} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-gray-900">{inv.customer_name}</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{inv.booking_number}</span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                <span>Tour: {formatDate(inv.tour_date)}</span>
                <span>Driver: {inv.driver_name}</span>
                <span>Hours: {inv.actual_hours ? <strong className="text-gray-900">{Number(inv.actual_hours).toFixed(1)}</strong> : <em>{Number(inv.estimated_hours).toFixed(1)} (est)</em>}</span>
                <span>Rate: {formatCurrency(inv.hourly_rate)}/hr</span>
              </div>
            </div>

            {/* Amount + Action */}
            <div className="flex items-center gap-4">
              {reviewingId === inv.booking_id ? (
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={reviewHours}
                      onChange={(e) => onHoursChange(e.target.value)}
                      className="w-20 px-2 py-1.5 text-sm text-center font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Total</div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatCurrency((parseFloat(reviewHours) || 0) * inv.hourly_rate)}
                    </div>
                  </div>
                  <button
                    onClick={() => onApprove(inv.booking_id)}
                    disabled={isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isPending ? 'Sending...' : 'Confirm & Send'}
                  </button>
                  <button
                    onClick={onCancelReview}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">{formatCurrency(inv.calculated_amount)}</div>
                    <div className="text-xs text-gray-500">before tip</div>
                  </div>
                  <button
                    onClick={() => onReview(inv.booking_id, inv.actual_hours || inv.estimated_hours)}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Review & Send
                  </button>
                </>
              )}
            </div>
          </div>

          {!inv.actual_hours && (
            <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 font-medium">
              Using estimated hours — actual hours not yet synced from time clock
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
