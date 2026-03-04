'use client';

import React, { useState } from 'react';
import { formatCurrency } from '@/lib/utils/formatters';
import type { ProposalDetail, GuestData, ReminderRecord, ToastFn } from '@/lib/types/proposal-detail';

interface BillingTabProps {
  proposal: ProposalDetail;
  updateProposal: (updates: Partial<ProposalDetail>) => Promise<void>;
  recalculateBilling: () => Promise<void>;
  verifyBilling: () => Promise<void>;
  updateGuestSponsored: (guestId: number, sponsored: boolean) => Promise<void>;
  updateGuestOverride: (guestId: number, overrideAmount: number | null) => Promise<void>;
  recordPayment: (guestId: number, amount: number) => Promise<void>;
  createPaymentGroup: (name: string, guestIds: number[]) => Promise<void>;
  pauseResumeReminders: (paused: boolean) => Promise<void>;
  generateReminderSchedule: () => Promise<void>;
  cancelReminder: (reminderId: number) => Promise<void>;
  addCustomReminder: (date: string, urgency: string, customMessage?: string) => Promise<void>;
  reminderHistory: ReminderRecord[];
  loadReminderHistory: () => Promise<void>;
  saving: boolean;
  toast: ToastFn;
}

export const BillingTab = React.memo(function BillingTab({
  proposal,
  updateProposal,
  recalculateBilling,
  verifyBilling,
  updateGuestSponsored,
  updateGuestOverride,
  recordPayment,
  createPaymentGroup,
  pauseResumeReminders,
  generateReminderSchedule,
  cancelReminder,
  addCustomReminder,
  reminderHistory,
  loadReminderHistory,
  saving,
  toast,
}: BillingTabProps) {
  // Record Payment modal state
  const [paymentGuest, setPaymentGuest] = useState<{ id: number; name: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Create Payment Group modal state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGuestIds, setSelectedGuestIds] = useState<number[]>([]);

  // Custom reminder form state
  const [customReminderDate, setCustomReminderDate] = useState('');
  const [customReminderUrgency, setCustomReminderUrgency] = useState('friendly');
  const [customReminderMessage, setCustomReminderMessage] = useState('');

  const handleRecordPayment = async () => {
    if (!paymentGuest) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast('Enter a valid amount', 'error');
      return;
    }
    await recordPayment(paymentGuest.id, amount);
    setPaymentGuest(null);
    setPaymentAmount('');
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast('Enter a group name', 'error');
      return;
    }
    if (selectedGuestIds.length < 1) {
      toast('Select at least one guest', 'error');
      return;
    }
    await createPaymentGroup(groupName.trim(), selectedGuestIds);
    setShowGroupModal(false);
    setGroupName('');
    setSelectedGuestIds([]);
  };

  const handleAddCustomReminder = async () => {
    await addCustomReminder(customReminderDate, customReminderUrgency, customReminderMessage);
    setCustomReminderDate('');
    setCustomReminderMessage('');
  };

  const toggleGuestSelection = (guestId: number) => {
    setSelectedGuestIds((prev) =>
      prev.includes(guestId)
        ? prev.filter((id) => id !== guestId)
        : [...prev, guestId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Record Payment Modal */}
      {paymentGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPaymentGuest(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-[calc(100vw-2rem)] sm:max-w-sm w-full mx-4 p-4 sm:p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Record Payment</h2>
            <p className="text-sm text-gray-600 mb-4">
              Manual payment for <span className="font-semibold">{paymentGuest.name}</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-1">Amount ($)</label>
              <input
                autoFocus
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRecordPayment()}
                placeholder="0.00"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => { setPaymentGuest(null); setPaymentAmount(''); }}
                className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm disabled:opacity-50 transition-colors"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Payment Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowGroupModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-[calc(100vw-2rem)] sm:max-w-md w-full mx-4 p-4 sm:p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Payment Group</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Group Name</label>
                <input
                  autoFocus
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder='e.g., "The Smiths"'
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Select Guests</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(proposal.guests || []).map((guest) => (
                    <label key={guest.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedGuestIds.includes(guest.id)}
                        onChange={() => toggleGuestSelection(guest.id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-sm text-gray-900">{guest.name}</span>
                      {guest.is_primary && <span className="text-xs text-indigo-600">(Primary)</span>}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowGroupModal(false); setGroupName(''); setSelectedGuestIds([]); }}
                className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedGuestIds.length < 1}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm disabled:opacity-50 transition-colors"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enable Individual Billing Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Individual Guest Billing</h3>
          <p className="text-xs text-gray-600 mt-0.5">Split the total among individual guests with separate payment links</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={proposal.individual_billing_enabled || false}
            onChange={() => updateProposal({ individual_billing_enabled: !proposal.individual_billing_enabled } as Partial<ProposalDetail>)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {proposal.individual_billing_enabled && (
        <>
          {/* Payment Deadline */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Payment Deadline</label>
            <input
              type="date"
              value={proposal.payment_deadline || ''}
              onChange={(e) => updateProposal({ payment_deadline: e.target.value || null } as Partial<ProposalDetail>)}
              className="w-full max-w-xs px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-brand"
            />
          </div>

          {/* Guest Billing Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Guest Amounts</h3>
              <div className="flex gap-2">
                <button
                  onClick={recalculateBilling}
                  disabled={saving}
                  className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  🔄 Recalculate All
                </button>
                <button
                  onClick={verifyBilling}
                  disabled={saving}
                  className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-900 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Verify Billing
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 px-2 text-gray-700 font-semibold">Guest</th>
                    <th className="text-center py-2 px-2 text-gray-700 font-semibold">Sponsored</th>
                    <th className="text-right py-2 px-2 text-gray-700 font-semibold">Amount</th>
                    <th className="text-right py-2 px-2 text-gray-700 font-semibold">Override</th>
                    <th className="text-right py-2 px-2 text-gray-700 font-semibold">Paid</th>
                    <th className="text-center py-2 px-2 text-gray-700 font-semibold">Status</th>
                    <th className="text-right py-2 px-2 text-gray-700 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(proposal.guests || []).map((guest) => {
                    const guestData = guest as GuestData & {
                      is_sponsored?: boolean;
                      amount_owed?: number;
                      amount_owed_override?: number | null;
                      amount_paid?: number;
                      payment_status?: string;
                    };
                    return (
                      <tr key={guest.id} className="border-b border-gray-100">
                        <td className="py-2 px-2 text-gray-900 font-medium">
                          {guest.name}
                          {guest.is_primary && <span className="ml-1 text-xs text-indigo-600">(Primary)</span>}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={guestData.is_sponsored || false}
                            onChange={() => updateGuestSponsored(guest.id, !guestData.is_sponsored)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                          />
                        </td>
                        <td className="py-2 px-2 text-right text-gray-700">
                          {formatCurrency(guestData.amount_owed || 0)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={guestData.amount_owed_override ?? ''}
                            placeholder="Auto"
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseFloat(e.target.value);
                              updateGuestOverride(guest.id, val);
                            }}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                          />
                        </td>
                        <td className="py-2 px-2 text-right text-gray-700">
                          {formatCurrency(guestData.amount_paid || 0)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            guestData.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                            guestData.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            guestData.payment_status === 'refunded' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {(guestData.payment_status || 'unpaid').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <button
                            onClick={() => setPaymentGuest({ id: guest.id, name: guest.name })}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                          >
                            Record Pay
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td className="py-2 px-2 font-bold text-gray-900" colSpan={2}>Total</td>
                    <td className="py-2 px-2 text-right font-bold text-gray-900">
                      {formatCurrency(
                        (proposal.guests || []).reduce((sum, g) => sum + (parseFloat(String((g as unknown as Record<string, unknown>).amount_owed)) || 0), 0)
                      )}
                    </td>
                    <td></td>
                    <td className="py-2 px-2 text-right font-bold text-gray-900">
                      {formatCurrency(
                        (proposal.guests || []).reduce((sum, g) => sum + (parseFloat(String((g as unknown as Record<string, unknown>).amount_paid)) || 0), 0)
                      )}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Proposal total comparison */}
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Proposal Total:</span>
                <span className="font-bold text-gray-900">{formatCurrency(proposal.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Group Creation */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Payment Groups (Couples)</h3>
            <p className="text-xs text-gray-600 mb-3">Group guests to share a single payment link</p>
            <button
              onClick={() => setShowGroupModal(true)}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
            >
              + Create Payment Group
            </button>
          </div>

          {/* Payment Reminders */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Payment Reminders</h3>
                <p className="text-xs text-gray-600 mt-0.5">Automated escalating reminders for unpaid guests</p>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => pauseResumeReminders(proposal.reminders_paused || false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    proposal.reminders_paused
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {proposal.reminders_paused ? 'Resume All' : 'Pause All'}
                </button>
                <button
                  onClick={() => {
                    if (!proposal.payment_deadline) {
                      toast('Set a payment deadline first', 'error');
                      return;
                    }
                    generateReminderSchedule();
                  }}
                  disabled={saving}
                  className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  Generate Schedule
                </button>
              </div>
            </div>

            {proposal.reminders_paused && (
              <div className="mb-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 font-medium">
                All reminders for this proposal are currently paused.
              </div>
            )}

            {/* Reminder History Table */}
            <div className="mb-3">
              <button
                onClick={loadReminderHistory}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {reminderHistory.length > 0 ? 'Refresh Reminder History' : 'Load Reminder History'}
              </button>
            </div>

            {reminderHistory.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-1.5 px-2 text-gray-700 font-semibold">Guest</th>
                      <th className="text-left py-1.5 px-2 text-gray-700 font-semibold">Date</th>
                      <th className="text-center py-1.5 px-2 text-gray-700 font-semibold">Urgency</th>
                      <th className="text-center py-1.5 px-2 text-gray-700 font-semibold">Status</th>
                      <th className="text-left py-1.5 px-2 text-gray-700 font-semibold">Reason</th>
                      <th className="text-right py-1.5 px-2 text-gray-700 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reminderHistory.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100">
                        <td className="py-1.5 px-2 text-gray-900">{r.guest_name || 'All'}</td>
                        <td className="py-1.5 px-2 text-gray-700">{r.scheduled_date}</td>
                        <td className="py-1.5 px-2 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                            r.urgency === 'final' ? 'bg-red-100 text-red-800' :
                            r.urgency === 'urgent' ? 'bg-orange-100 text-orange-800' :
                            r.urgency === 'firm' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {r.urgency}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                            r.status === 'sent' ? 'bg-green-100 text-green-800' :
                            r.status === 'skipped' ? 'bg-gray-100 text-gray-600' :
                            r.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            r.paused ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {r.paused && r.status === 'pending' ? 'paused' : r.status}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-gray-600 max-w-[150px] truncate" title={r.skip_reason || ''}>
                          {r.skip_reason || '—'}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          {r.status === 'pending' && (
                            <button
                              onClick={() => cancelReminder(r.id)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add Custom Reminder */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-xs font-bold text-gray-900 mb-2">Add Custom Reminder</h4>
              <div className="flex gap-2 items-end flex-wrap">
                <div>
                  <label className="block text-xs text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={customReminderDate}
                    onChange={(e) => setCustomReminderDate(e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-700 mb-1">Urgency</label>
                  <select
                    value={customReminderUrgency}
                    onChange={(e) => setCustomReminderUrgency(e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                  >
                    <option value="friendly">Friendly</option>
                    <option value="firm">Firm</option>
                    <option value="urgent">Urgent</option>
                    <option value="final">Final</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-gray-700 mb-1">Custom Message (optional)</label>
                  <input
                    type="text"
                    value={customReminderMessage}
                    onChange={(e) => setCustomReminderMessage(e.target.value)}
                    placeholder="Personal note to include in the email..."
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                  />
                </div>
                <button
                  onClick={handleAddCustomReminder}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
