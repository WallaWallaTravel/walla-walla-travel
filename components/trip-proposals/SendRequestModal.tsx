'use client';

import { useState } from 'react';
import { BaseModal } from '@/components/ui/BaseModal';
import type { RequestType } from '@/lib/types/partner-request';

interface SendRequestModalProps {
  proposalId: number;
  stopId: number;
  venueName: string;
  vendorEmail?: string;
  vendorName?: string;
  date?: string;
  time?: string;
  partySize: number;
  onClose: () => void;
  onSent: () => void;
}

const REQUEST_TYPE_OPTIONS: { value: RequestType; label: string }[] = [
  { value: 'reservation', label: 'Reservation' },
  { value: 'availability', label: 'Availability Check' },
  { value: 'quote', label: 'Quote Request' },
  { value: 'custom', label: 'Custom' },
];

export default function SendRequestModal({
  proposalId,
  stopId,
  venueName,
  vendorEmail,
  vendorName,
  date,
  time,
  partySize,
  onClose,
  onSent,
}: SendRequestModalProps) {
  const [partnerEmail, setPartnerEmail] = useState(vendorEmail || '');
  const [partnerName, setPartnerName] = useState(vendorName || '');
  const [requestType, setRequestType] = useState<RequestType>('reservation');
  const [requestSubject, setRequestSubject] = useState('');
  const [requestBody, setRequestBody] = useState(buildDefaultBody());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildDefaultBody(): string {
    const parts: string[] = [];
    parts.push(`Hi${vendorName ? ` ${vendorName}` : ''},`);
    parts.push('');
    parts.push(`We would like to arrange a visit for ${partySize} guest${partySize !== 1 ? 's' : ''}.`);
    if (date) {
      const formatted = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      parts.push(`Preferred date: ${formatted}${time ? ` at ${formatTime(time)}` : ''}.`);
    }
    parts.push('');
    parts.push('Please let us know if this works for you, or suggest an alternative.');
    parts.push('');
    parts.push('Thank you!');
    return parts.join('\n');
  }

  function formatTime(t: string): string {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  async function handleSend() {
    if (!partnerEmail.trim()) {
      setError('Partner email is required');
      return;
    }
    if (!requestBody.trim()) {
      setError('Message body is required');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const csrfRes = await fetch('/api/auth/csrf');
      const csrfData = await csrfRes.json();

      const res = await fetch(
        `/api/admin/trip-proposals/${proposalId}/stops/${stopId}/send-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfData.token,
          },
          body: JSON.stringify({
            partner_email: partnerEmail.trim(),
            partner_name: partnerName.trim() || undefined,
            request_type: requestType,
            request_subject: requestSubject.trim() || undefined,
            request_body: requestBody.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to send request');
        return;
      }

      onSent();
    } catch {
      setError('Network error — please try again');
    } finally {
      setSending(false);
    }
  }

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title="Send Partner Request"
      size="lg"
      isLoading={sending}
      footer={
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !partnerEmail.trim() || !requestBody.trim()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      }
    >
      <p className="text-sm text-gray-600 mb-4">{venueName}</p>

      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Partner Email */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Partner Email <span className="text-red-600">*</span>
          </label>
          <input
            type="email"
            value={partnerEmail}
            onChange={(e) => setPartnerEmail(e.target.value)}
            placeholder="contact@venue.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Partner Name */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Contact Name
          </label>
          <input
            type="text"
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            placeholder="Contact person at venue"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Request Type */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Request Type
          </label>
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value as RequestType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {REQUEST_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Subject (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Subject <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={requestSubject}
            onChange={(e) => setRequestSubject(e.target.value)}
            placeholder="Auto-generated if left blank"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Message Body */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Message <span className="text-red-600">*</span>
          </label>
          <textarea
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          />
          <p className="text-xs text-gray-500 mt-1">
            This message will be included in the email along with the trip details (date, time, party size).
          </p>
        </div>
      </div>
    </BaseModal>
  );
}
