'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';

const TRIP_TYPES = [
  { value: 'wine_tour', label: 'Wine Tour', icon: '🍷' },
  { value: 'wine_group', label: 'Wine Group', icon: '🍇' },
  { value: 'celebration', label: 'Celebration', icon: '🎉' },
  { value: 'corporate', label: 'Corporate', icon: '🏢' },
  { value: 'wedding', label: 'Wedding', icon: '💒' },
  { value: 'anniversary', label: 'Anniversary', icon: '💍' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
  { value: 'romantic', label: 'Romantic', icon: '💕' },
  { value: 'custom', label: 'Custom', icon: '✨' },
];

const CATEGORIES = [
  { value: 'transportation', label: 'Transportation' },
  { value: 'airport_transfer', label: 'Airport Transfer' },
  { value: 'tasting_fees', label: 'Tasting Fees' },
  { value: 'dining', label: 'Dining' },
  { value: 'lunch_catering', label: 'Lunch & Catering' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'planning_fee', label: 'Planning Fee' },
  { value: 'misc', label: 'Miscellaneous' },
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

interface TripEstimate {
  id: number;
  estimate_number: string;
  status: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  trip_type: string;
  trip_title: string | null;
  trip_description: string | null;
  start_date: string | null;
  end_date: string | null;
  party_size: number;
  subtotal: number | string;
  deposit_amount: number | string;
  deposit_reason: string | null;
  deposit_paid: boolean;
  deposit_paid_at: string | null;
  payment_intent_id: string | null;
  trip_proposal_id: number | null;
  valid_until: string | null;
  brand_id: number | null;
  created_at: string;
  updated_at: string;
  items: Array<{
    id: number;
    category: string;
    description: string | null;
    quantity: number | string;
    unit_label: string | null;
    unit_price: number | string;
    total_price: number | string;
    notes: string | null;
    sort_order: number;
  }>;
}

export default function EditTripEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estimate, setEstimate] = useState<TripEstimate | null>(null);

  // Editable fields
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tripType, setTripType] = useState('wine_tour');
  const [tripTitle, setTripTitle] = useState('');
  const [tripDescription, setTripDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [items, setItems] = useState<LineItem[]>([]);
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositReason, setDepositReason] = useState('');
  const [validUntil, setValidUntil] = useState('');

  const loadEstimate = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/trip-estimates/${id}`);
      const result = await response.json();

      if (result.success && result.data) {
        const est = result.data as TripEstimate;
        setEstimate(est);

        // Populate form
        setCustomerName(est.customer_name);
        setCustomerEmail(est.customer_email || '');
        setCustomerPhone(est.customer_phone || '');
        setTripType(est.trip_type || 'wine_tour');
        setTripTitle(est.trip_title || '');
        setTripDescription(est.trip_description || '');
        setStartDate(est.start_date || '');
        setEndDate(est.end_date || '');
        setPartySize(est.party_size || 2);
        setDepositAmount(parseFloat(String(est.deposit_amount)) || 0);
        setDepositReason(est.deposit_reason || '');
        setValidUntil(est.valid_until || '');

        // Populate items
        if (est.items && est.items.length > 0) {
          setItems(
            est.items.map((item, i) => ({
              id: `item-${item.id || i}`,
              category: item.category,
              description: item.description || '',
              quantity: parseFloat(String(item.quantity)) || 0,
              unit_label: item.unit_label || '',
              unit_price: parseFloat(String(item.unit_price)) || 0,
              total_price: parseFloat(String(item.total_price)) || 0,
            }))
          );
        }
      } else {
        alert('Estimate not found');
        router.push('/admin/trip-estimates');
      }
    } catch (error) {
      logger.error('Failed to load trip estimate', { error });
      alert('Failed to load estimate');
      router.push('/admin/trip-estimates');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadEstimate();
  }, [loadEstimate]);

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const isDraft = estimate?.status === 'draft';

  const updateItem = (itemId: string, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updated = { ...item, [field]: value };
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

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0);
  };

  const handleSave = async () => {
    if (!customerName.trim()) {
      alert('Please enter a customer name');
      return;
    }

    setSaving(true);
    try {
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

      const response = await fetch(`/api/admin/trip-estimates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      });
      const result = await response.json();

      if (result.success) {
        loadEstimate();
      } else {
        alert(result.error?.message || result.error || 'Failed to update estimate');
      }
    } catch (error) {
      logger.error('Failed to save trip estimate', { error });
      alert('Failed to save estimate');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/trip-estimates/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await response.json();

      if (result.success) {
        if (newStatus === 'sent') {
          const clientUrl = `${window.location.origin}/trip-estimates/${estimate?.estimate_number}`;
          alert(`Status updated to Sent!\n\nClient link:\n${clientUrl}`);
          navigator.clipboard.writeText(clientUrl).catch(() => {});
        }
        loadEstimate();
      } else {
        alert(result.error?.message || result.error || 'Failed to update status');
      }
    } catch (error) {
      logger.error('Failed to update status', { error });
      alert('Failed to update status');
    }
  };

  const handleConvert = async () => {
    if (!confirm('Convert this estimate to a full trip proposal? This will create a new draft proposal.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/trip-estimates/${id}/convert`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        alert(`Proposal ${result.data.proposal_number} created! Redirecting...`);
        router.push(`/admin/trip-proposals/${result.data.proposal_id}`);
      } else {
        alert(result.error?.message || result.error || 'Failed to convert estimate');
      }
    } catch (error) {
      logger.error('Failed to convert estimate', { error });
      alert('Failed to convert estimate');
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; icon: string; label: string }> = {
      draft: { bg: 'bg-gray-100 text-gray-800', icon: '📝', label: 'DRAFT' },
      sent: { bg: 'bg-blue-100 text-blue-800', icon: '📧', label: 'SENT' },
      viewed: { bg: 'bg-yellow-100 text-yellow-800', icon: '👁️', label: 'VIEWED' },
      deposit_paid: { bg: 'bg-green-100 text-green-800', icon: '💰', label: 'DEPOSIT PAID' },
      converted: { bg: 'bg-purple-100 text-purple-800', icon: '🎉', label: 'CONVERTED' },
    };
    const c = config[status] || config.draft!;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${c.bg}`}>
        {c.icon} {c.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64" />
            <div className="h-64 bg-gray-200 rounded-xl" />
            <div className="h-96 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!estimate) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/trip-estimates"
            className="text-sm text-gray-600 hover:text-[#8B1538] mb-2 inline-block"
          >
            &larr; Back to Trip Estimates
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                💰 {estimate.estimate_number}
              </h1>
              <div className="mt-2 flex items-center gap-3">
                {getStatusBadge(estimate.status)}
                {estimate.trip_proposal_id && (
                  <Link
                    href={`/admin/trip-proposals/${estimate.trip_proposal_id}`}
                    className="text-sm text-purple-700 hover:text-purple-900 font-medium"
                  >
                    View Linked Proposal &rarr;
                  </Link>
                )}
              </div>
            </div>

            {/* Status Actions */}
            <div className="flex items-center gap-3">
              {estimate.status === 'draft' && (
                <button
                  onClick={() => handleStatusChange('sent')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  📧 Mark as Sent
                </button>
              )}
              {(estimate.status === 'sent' || estimate.status === 'viewed') && (
                <button
                  onClick={() => handleStatusChange('deposit_paid')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  💰 Mark Deposit Paid
                </button>
              )}
              {estimate.status === 'viewed' && (
                <button
                  onClick={() => handleStatusChange('sent')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  📧 Resend
                </button>
              )}
              {estimate.status === 'deposit_paid' && !estimate.trip_proposal_id && (
                <button
                  onClick={handleConvert}
                  className="px-4 py-2 bg-[#8B1538] hover:bg-[#7A1230] text-white rounded-lg font-bold transition-colors shadow-lg"
                >
                  🗺️ Convert to Full Proposal
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Client Link Banner */}
        {['sent', 'viewed', 'deposit_paid'].includes(estimate.status) && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Client deposit link:</p>
                <p className="text-sm text-blue-700 font-mono">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/trip-estimates/{estimate.estimate_number}
                </p>
              </div>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/trip-estimates/${estimate.estimate_number}`;
                  navigator.clipboard.writeText(url);
                  alert('Link copied to clipboard!');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}

        {/* Deposit Paid Banner */}
        {estimate.deposit_paid && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-bold text-green-900">Deposit Received: {formatCurrency(estimate.deposit_amount)}</p>
                {estimate.deposit_paid_at && (
                  <p className="text-sm text-green-700">
                    Paid on {new Date(estimate.deposit_paid_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Trip Basics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Trip Basics</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-900 mb-2">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={!isDraft}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    disabled={!isDraft}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    disabled={!isDraft}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Trip Type</label>
                  <select
                    value={tripType}
                    onChange={(e) => setTripType(e.target.value)}
                    disabled={!isDraft}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none disabled:bg-gray-100 disabled:text-gray-600"
                  >
                    {TRIP_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Trip Title</label>
                  <input
                    type="text"
                    value={tripTitle}
                    onChange={(e) => setTripTitle(e.target.value)}
                    disabled={!isDraft}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-900 mb-2">Description</label>
                  <textarea
                    value={tripDescription}
                    onChange={(e) => setTripDescription(e.target.value)}
                    rows={2}
                    disabled={!isDraft}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none disabled:bg-gray-100 disabled:text-gray-600 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={!isDraft}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={!isDraft}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Party Size</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={partySize}
                    onChange={(e) => setPartySize(parseInt(e.target.value) || 2)}
                    disabled={!isDraft}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Cost Estimate */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Cost Estimate</h2>

              <div className="space-y-3">
                {/* Header */}
                <div className="hidden md:grid grid-cols-12 gap-2 px-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="col-span-2">Category</div>
                  <div className="col-span-3">Description</div>
                  <div className="col-span-1">Qty</div>
                  <div className="col-span-2">Unit</div>
                  <div className="col-span-1">Rate</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-1" />
                </div>

                {items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 rounded-lg border border-gray-100 hover:border-gray-200 bg-gray-50/50"
                  >
                    <div className="md:col-span-2">
                      <select
                        value={item.category}
                        onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                        disabled={!isDraft}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#8B1538] outline-none disabled:bg-gray-100"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        disabled={!isDraft}
                        placeholder="Description..."
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#8B1538] outline-none disabled:bg-gray-100"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        disabled={!isDraft}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:border-[#8B1538] outline-none disabled:bg-gray-100"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        value={item.unit_label}
                        onChange={(e) => updateItem(item.id, 'unit_label', e.target.value)}
                        disabled={!isDraft}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:border-[#8B1538] outline-none disabled:bg-gray-100"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unit_price || ''}
                        onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                        disabled={!isDraft}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-right focus:border-[#8B1538] outline-none disabled:bg-gray-100"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center justify-end">
                      <span className="font-semibold text-gray-900 text-sm">
                        {formatCurrency(item.total_price)}
                      </span>
                    </div>
                    <div className="md:col-span-1 flex items-center justify-center">
                      {isDraft && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {isDraft && (
                  <button
                    onClick={addItem}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-[#8B1538] hover:text-[#8B1538] transition-colors"
                  >
                    + Add Line Item
                  </button>
                )}
              </div>
            </div>

            {/* Deposit */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Deposit Request</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Deposit Amount ($)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={depositAmount || ''}
                    onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                    disabled={!isDraft}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none text-lg font-semibold disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Valid Until</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    disabled={!isDraft}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none disabled:bg-gray-100"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-900 mb-2">Deposit Note</label>
                  <input
                    type="text"
                    value={depositReason}
                    onChange={(e) => setDepositReason(e.target.value)}
                    disabled={!isDraft}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4] outline-none disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Summary */}
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
                  <hr className="border-gray-200" />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status</span>
                      {getStatusBadge(estimate.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customer</span>
                      <span className="font-medium text-gray-900 text-right">{customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Party Size</span>
                      <span className="font-medium text-gray-900">{partySize} guests</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Items</span>
                      <span className="font-medium text-gray-900">
                        {items.filter((i) => i.total_price > 0).length} active
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {isDraft && (
                <div className="space-y-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : '💾 Save Changes'}
                  </button>
                  <button
                    onClick={async () => {
                      await handleSave();
                      await handleStatusChange('sent');
                    }}
                    disabled={saving}
                    className="w-full px-6 py-3 bg-[#8B1538] hover:bg-[#7A1230] text-white rounded-lg font-bold transition-colors shadow-lg disabled:opacity-50"
                  >
                    📧 Save & Send to Client
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
