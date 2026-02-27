'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { TRIP_TYPE_OPTIONS } from '@/lib/types/trip-proposal';
import PhoneInput from '@/components/ui/PhoneInput';

const CATEGORIES = [
  { value: 'transportation', label: 'Transportation', defaultUnit: 'days', defaultDesc: 'Daily touring' },
  { value: 'airport_transfer', label: 'Airport Transfer', defaultUnit: 'trips', defaultDesc: 'Arrival + departure' },
  { value: 'tasting_fees', label: 'Tasting Fees', defaultUnit: 'people', defaultDesc: 'Winery tasting fees' },
  { value: 'dining', label: 'Dining', defaultUnit: 'reservations', defaultDesc: 'Dinner reservations' },
  { value: 'lunch_catering', label: 'Lunch & Catering', defaultUnit: 'days', defaultDesc: 'Tour lunches' },
  { value: 'hotel', label: 'Hotel', defaultUnit: 'nights', defaultDesc: 'Hotel deposit/holds' },
  { value: 'planning_fee', label: 'Planning Fee', defaultUnit: 'flat', defaultDesc: 'Trip coordination' },
  { value: 'misc', label: 'Miscellaneous', defaultUnit: 'each', defaultDesc: '' },
];

interface LineItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit_label: string;
  unit_price: number;
  total_price: number;
}

function createDefaultItems(): LineItem[] {
  return CATEGORIES.map((cat, i) => ({
    id: `item-${i}`,
    category: cat.value,
    description: cat.defaultDesc,
    quantity: cat.value === 'planning_fee' ? 1 : 0,
    unit_label: cat.defaultUnit,
    unit_price: 0,
    total_price: 0,
  }));
}

export default function NewTripEstimatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'saving' | 'sending'>('idle');

  // Trip basics
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tripType, setTripType] = useState('wine_tour');
  const [tripTitle, setTripTitle] = useState('');
  const [tripDescription, setTripDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [partySize, setPartySize] = useState(2);

  // Line items
  const [items, setItems] = useState<LineItem[]>(createDefaultItems());

  // Deposit
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositReason, setDepositReason] = useState('Covers planning time and venue deposits');
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Calculate subtotal from items
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        // Auto-calculate total when quantity or unit_price changes
        if (field === 'quantity' || field === 'unit_price') {
          updated.total_price = Number(updated.quantity) * Number(updated.unit_price);
        }
        return updated;
      })
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        category: 'misc',
        description: '',
        quantity: 1,
        unit_label: 'each',
        unit_price: 0,
        total_price: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const buildPayload = () => {
    // Filter out items with zero total
    const activeItems = items
      .filter((item) => item.total_price > 0 || item.description)
      .map((item, i) => ({
        category: item.category,
        description: item.description || undefined,
        quantity: item.quantity,
        unit_label: item.unit_label || undefined,
        unit_price: item.unit_price,
        total_price: item.total_price,
        sort_order: i,
      }));

    return {
      customer_name: customerName,
      customer_email: customerEmail || undefined,
      customer_phone: customerPhone || undefined,
      trip_type: tripType,
      trip_title: tripTitle || undefined,
      trip_description: tripDescription || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      party_size: partySize,
      deposit_amount: depositAmount,
      deposit_reason: depositReason || undefined,
      valid_until: validUntil || undefined,
      items: activeItems,
    };
  };

  const handleSaveDraft = async () => {
    if (!customerName.trim()) {
      alert('Please enter a customer name');
      return;
    }

    setSaving(true);
    setSendingStatus('saving');
    try {
      const response = await fetch('/api/admin/trip-estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const result = await response.json();

      if (result.success) {
        router.push(`/admin/trip-estimates/${result.data.id}`);
      } else {
        alert(result.error || 'Failed to create estimate');
      }
    } catch (error) {
      logger.error('Failed to save estimate', { error });
      alert('Failed to save estimate');
    } finally {
      setSaving(false);
      setSendingStatus('idle');
    }
  };

  const handleSaveAndSend = async () => {
    if (!customerName.trim()) {
      alert('Please enter a customer name');
      return;
    }
    if (!customerEmail.trim()) {
      alert('Please enter a customer email to send the estimate');
      return;
    }

    setSaving(true);
    setSendingStatus('sending');
    try {
      // Create first
      const createResponse = await fetch('/api/admin/trip-estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const createResult = await createResponse.json();

      if (!createResult.success) {
        alert(createResult.error || 'Failed to create estimate');
        return;
      }

      // Then update status to sent
      const statusResponse = await fetch(
        `/api/admin/trip-estimates/${createResult.data.id}/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'sent' }),
        }
      );
      const statusResult = await statusResponse.json();

      if (statusResult.success) {
        alert(
          `Estimate created and marked as sent!\n\nClient link:\n${window.location.origin}/trip-estimates/${createResult.data.estimate_number}`
        );
        router.push(`/admin/trip-estimates/${createResult.data.id}`);
      } else {
        // Created but failed to send — still redirect
        alert('Estimate created but failed to update status. You can send it from the edit page.');
        router.push(`/admin/trip-estimates/${createResult.data.id}`);
      }
    } catch (error) {
      logger.error('Failed to save and send estimate', { error });
      alert('Failed to save estimate');
    } finally {
      setSaving(false);
      setSendingStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/trip-proposals"
            className="text-sm text-gray-600 hover:text-[#8B1538] mb-2 inline-block"
          >
            &larr; Back to Proposals
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">💰 New Trip Estimate</h1>
          <p className="text-gray-600 mt-2">
            Quick cost tally — estimate the trip, set a deposit, and send to the client
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Section 1: Trip Basics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Trip Basics</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Customer Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g., John & Jane Smith"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="client@email.com"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Phone</label>
                  <PhoneInput
                    value={customerPhone}
                    onChange={(value) => setCustomerPhone(value)}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none"
                  />
                </div>

                {/* Trip Type */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Trip Type</label>
                  <select
                    value={tripType}
                    onChange={(e) => setTripType(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none"
                  >
                    {TRIP_TYPE_OPTIONS.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Trip Title */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Trip Title</label>
                  <input
                    type="text"
                    value={tripTitle}
                    onChange={(e) => setTripTitle(e.target.value)}
                    placeholder="e.g., Smith Anniversary Wine Weekend"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Brief Description
                  </label>
                  <textarea
                    value={tripDescription}
                    onChange={(e) => setTripDescription(e.target.value)}
                    rows={2}
                    placeholder="Brief summary of what's planned (visible to client)..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none resize-none"
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none"
                  />
                </div>

                {/* Party Size */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Party Size</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={partySize}
                    onChange={(e) => setPartySize(parseInt(e.target.value) || 2)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Cost Estimate (Line Items) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Cost Estimate</h2>

              <div className="space-y-3">
                {/* Header Row */}
                <div className="hidden md:grid grid-cols-12 gap-2 px-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="col-span-2">Category</div>
                  <div className="col-span-3">Description</div>
                  <div className="col-span-1">Qty</div>
                  <div className="col-span-2">Unit</div>
                  <div className="col-span-1">Rate</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1" />
                </div>

                {/* Items */}
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 rounded-lg border border-gray-100 hover:border-gray-200 bg-gray-50/50"
                  >
                    {/* Category */}
                    <div className="md:col-span-2">
                      <label className="md:hidden block text-xs font-bold text-gray-700 mb-1">Category</label>
                      <select
                        value={item.category}
                        onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#8B1538] outline-none"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Description */}
                    <div className="md:col-span-3">
                      <label className="md:hidden block text-xs font-bold text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Description..."
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#8B1538] outline-none"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-1">
                      <label className="md:hidden block text-xs font-bold text-gray-700 mb-1">Qty</label>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:border-[#8B1538] outline-none"
                      />
                    </div>

                    {/* Unit */}
                    <div className="md:col-span-2">
                      <label className="md:hidden block text-xs font-bold text-gray-700 mb-1">Unit</label>
                      <input
                        type="text"
                        value={item.unit_label}
                        onChange={(e) => updateItem(item.id, 'unit_label', e.target.value)}
                        placeholder="days/people/etc"
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#8B1538] outline-none"
                      />
                    </div>

                    {/* Rate */}
                    <div className="md:col-span-1">
                      <label className="md:hidden block text-xs font-bold text-gray-700 mb-1">Rate ($)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unit_price || ''}
                        onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                        placeholder="$0"
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-right focus:border-[#8B1538] outline-none"
                      />
                    </div>

                    {/* Total */}
                    <div className="md:col-span-2 flex items-center justify-end">
                      <label className="md:hidden block text-xs font-bold text-gray-700 mb-1 mr-2">Total</label>
                      <span className="font-semibold text-gray-900 text-sm">
                        {formatCurrency(item.total_price)}
                      </span>
                    </div>

                    {/* Remove */}
                    <div className="md:col-span-1 flex items-center justify-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Row */}
                <button
                  onClick={addItem}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-[#8B1538] hover:text-[#8B1538] transition-colors"
                >
                  + Add Line Item
                </button>
              </div>
            </div>

            {/* Section 3: Deposit */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Deposit Request</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Deposit Amount ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={depositAmount || ''}
                    onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none text-lg font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Deposit Note
                  </label>
                  <input
                    type="text"
                    value={depositReason}
                    onChange={(e) => setDepositReason(e.target.value)}
                    placeholder="e.g., Covers planning time and venue deposits"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Summary Card */}
              <div className="bg-white rounded-xl shadow-lg border-2 border-[#8B1538] p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Estimate Summary</h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Estimated Total</span>
                    <span className="text-2xl font-bold text-gray-900">{formatCurrency(subtotal)}</span>
                  </div>

                  <hr className="border-gray-200" />

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Deposit Request</span>
                    <span className="text-xl font-bold text-[#8B1538]">
                      {formatCurrency(depositAmount)}
                    </span>
                  </div>

                  {subtotal > 0 && depositAmount > 0 && (
                    <div className="text-right text-sm text-gray-500">
                      {Math.round((depositAmount / subtotal) * 100)}% of total
                    </div>
                  )}
                </div>

                {/* Trip Info */}
                {(startDate || customerName) && (
                  <>
                    <hr className="border-gray-200 my-4" />
                    <div className="space-y-2 text-sm">
                      {customerName && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Customer</span>
                          <span className="font-medium text-gray-900">{customerName}</span>
                        </div>
                      )}
                      {startDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dates</span>
                          <span className="font-medium text-gray-900">
                            {new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {endDate && endDate !== startDate && (
                              <> – {new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Party Size</span>
                        <span className="font-medium text-gray-900">{partySize} guests</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Active Items</span>
                        <span className="font-medium text-gray-900">
                          {items.filter((i) => i.total_price > 0).length}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {sendingStatus === 'saving' ? 'Saving...' : '📝 Save Draft'}
                </button>

                <button
                  onClick={handleSaveAndSend}
                  disabled={saving}
                  className="w-full px-6 py-3 bg-[#8B1538] hover:bg-[#7A1230] text-white rounded-lg font-bold transition-colors shadow-lg disabled:opacity-50"
                >
                  {sendingStatus === 'sending' ? 'Sending...' : '📧 Save & Send to Client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
