'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

interface StopInfo {
  venue_name: string;
  stop_type: string;
  date: string | null;
  time: string | null;
  party_size: number;
}

interface PreviousResponse {
  action: string;
  message: string | null;
  created_at: string;
}

interface RequestData {
  request_type: string;
  request_subject: string | null;
  request_body: string;
  created_at: string;
  status: string;
  stop: StopInfo;
  previous_responses: PreviousResponse[];
}

type ResponseAction = 'confirm' | 'modify' | 'decline' | 'message';

// ============================================================================
// Constants
// ============================================================================

const ACTION_CONFIG: Record<ResponseAction, {
  label: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  confirm: {
    label: 'Confirm',
    description: 'We can accommodate this booking as requested',
    icon: '✓',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  modify: {
    label: 'Suggest Changes',
    description: 'We can accommodate with modifications',
    icon: '↔',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  decline: {
    label: 'Cannot Accommodate',
    description: 'We are unable to accommodate this booking',
    icon: '✕',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  message: {
    label: 'Send a Message',
    description: 'Ask a question or share additional information',
    icon: '✉',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
};

// ============================================================================
// Component
// ============================================================================

export default function PartnerRespondPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = params.token as string;

  // State
  const [data, setData] = useState<RequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<ResponseAction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form fields
  const [responderName, setResponderName] = useState('');
  const [responderEmail, setResponderEmail] = useState('');
  const [message, setMessage] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [alternateDate, setAlternateDate] = useState('');
  const [alternateTime, setAlternateTime] = useState('');

  // Pre-select action from query param
  useEffect(() => {
    const action = searchParams.get('action');
    if (action && action in ACTION_CONFIG) {
      setSelectedAction(action as ResponseAction);
    }
  }, [searchParams]);

  // Fetch request data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/partner-respond/${token}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          setError(json.error?.message || 'This request could not be found.');
          return;
        }

        setData(json.data);
      } catch {
        setError('Unable to load request. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchData();
  }, [token]);

  // Submit response
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAction || !responderName.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const body: Record<string, unknown> = {
        action: selectedAction,
        responder_name: responderName.trim(),
      };

      if (responderEmail.trim()) body.responder_email = responderEmail.trim();
      if (message.trim()) body.message = message.trim();
      if (confirmationCode.trim()) body.confirmation_code = confirmationCode.trim();
      if (alternateDate) body.alternate_date = alternateDate;
      if (alternateTime) body.alternate_time = alternateTime;

      const res = await fetch(`/api/partner-respond/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (res.status === 429) {
          setSubmitError('Too many responses. Please try again later.');
        } else {
          setSubmitError(json.error?.message || 'Failed to submit response.');
        }
        return;
      }

      // Redirect to success page with action in query
      router.push(`/partner-respond/${token}/success?action=${selectedAction}`);
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Format date for display
  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Flexible';
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  function formatTime(timeStr: string | null): string {
    if (!timeStr) return 'Flexible';
    try {
      const [hours, minutes] = timeStr.split(':');
      const h = parseInt(hours, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  }

  function formatStopType(type: string): string {
    const labels: Record<string, string> = {
      winery: 'Winery Visit',
      restaurant: 'Dining',
      hotel: 'Accommodation',
      activity: 'Activity',
      transportation: 'Transportation',
    };
    return labels[type] || type;
  }

  // ============================================================================
  // Render — Loading
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-20 bg-gray-200 rounded" />
              <div className="h-12 bg-gray-200 rounded" />
              <div className="h-12 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render — Error / Expired / Revoked
  // ============================================================================

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-xl">!</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Request Unavailable
            </h1>
            <p className="text-gray-600">
              {error || 'This booking request could not be found. It may have expired or been revoked.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (data.status === 'expired') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-amber-600 text-xl">⏱</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Request Expired
            </h1>
            <p className="text-gray-600">
              This booking request has expired. Please contact the tour organizer for an updated request.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (data.status === 'revoked') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-500 text-xl">✕</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Request Cancelled
            </h1>
            <p className="text-gray-600">
              This booking request has been cancelled by the organizer.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const showForm = selectedAction !== null;
  const needsMessage = selectedAction === 'modify' || selectedAction === 'decline' || selectedAction === 'message';

  // ============================================================================
  // Render — Main Form
  // ============================================================================

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="w-full max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Booking Request</h1>
          <p className="text-gray-600 mt-1">from Walla Walla Travel</p>
        </div>

        {/* Request Details Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 space-y-4">

            {/* Venue & Type */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{data.stop.venue_name}</h2>
              <p className="text-sm text-gray-600">{formatStopType(data.stop.stop_type)}</p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</p>
                <p className="text-sm text-gray-900 mt-0.5">{formatDate(data.stop.date)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Time</p>
                <p className="text-sm text-gray-900 mt-0.5">{formatTime(data.stop.time)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Party Size</p>
                <p className="text-sm text-gray-900 mt-0.5">{data.stop.party_size} guests</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</p>
                <p className="text-sm text-gray-900 mt-0.5 capitalize">{data.request_type}</p>
              </div>
            </div>

            {/* Subject */}
            {data.request_subject && (
              <div className="pt-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</p>
                <p className="text-sm text-gray-900 mt-0.5">{data.request_subject}</p>
              </div>
            )}

            {/* Message */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Message</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{data.request_body}</p>
            </div>
          </div>
        </div>

        {/* Previous Responses */}
        {data.previous_responses.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Previous Responses</h3>
            <div className="space-y-3">
              {data.previous_responses.map((r, i) => (
                <div key={i} className="text-sm border-l-2 border-gray-200 pl-3">
                  <p className="font-medium text-gray-700 capitalize">{r.action}</p>
                  {r.message && <p className="text-gray-600 mt-0.5">{r.message}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(r.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Response Action Selection */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Your Response</h3>

          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(ACTION_CONFIG) as [ResponseAction, typeof ACTION_CONFIG[ResponseAction]][]).map(
              ([action, config]) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => {
                    setSelectedAction(action);
                    setSubmitError(null);
                  }}
                  className={`
                    p-3 rounded-lg border-2 text-left transition-all
                    ${selectedAction === action
                      ? `${config.borderColor} ${config.bgColor}`
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                  `}
                >
                  <span className={`text-lg ${selectedAction === action ? config.color : 'text-gray-400'}`}>
                    {config.icon}
                  </span>
                  <p className={`text-sm font-medium mt-1 ${selectedAction === action ? config.color : 'text-gray-900'}`}>
                    {config.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{config.description}</p>
                </button>
              )
            )}
          </div>
        </div>

        {/* Response Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Response Details</h3>

            {/* Responder Name */}
            <div>
              <label htmlFor="responderName" className="block text-sm font-medium text-gray-900 mb-1">
                Your Name <span className="text-red-600">*</span>
              </label>
              <input
                id="responderName"
                type="text"
                required
                maxLength={255}
                value={responderName}
                onChange={(e) => setResponderName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Responder Email */}
            <div>
              <label htmlFor="responderEmail" className="block text-sm font-medium text-gray-900 mb-1">
                Your Email
              </label>
              <input
                id="responderEmail"
                type="email"
                maxLength={255}
                value={responderEmail}
                onChange={(e) => setResponderEmail(e.target.value)}
                placeholder="jane@venue.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Confirmation Code (confirm action only) */}
            {selectedAction === 'confirm' && (
              <div>
                <label htmlFor="confirmationCode" className="block text-sm font-medium text-gray-900 mb-1">
                  Confirmation Code
                </label>
                <input
                  id="confirmationCode"
                  type="text"
                  maxLength={100}
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  placeholder="Optional — e.g., RES-12345"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Alternate Date/Time (modify action only) */}
            {selectedAction === 'modify' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="alternateDate" className="block text-sm font-medium text-gray-900 mb-1">
                    Alternate Date
                  </label>
                  <input
                    id="alternateDate"
                    type="date"
                    value={alternateDate}
                    onChange={(e) => setAlternateDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="alternateTime" className="block text-sm font-medium text-gray-900 mb-1">
                    Alternate Time
                  </label>
                  <input
                    id="alternateTime"
                    type="time"
                    value={alternateTime}
                    onChange={(e) => setAlternateTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Message (required for modify/decline/message, optional for confirm) */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-1">
                {needsMessage ? (
                  <>Message {selectedAction !== 'decline' && <span className="text-red-600">*</span>}</>
                ) : (
                  'Additional Notes'
                )}
              </label>
              <textarea
                id="message"
                rows={4}
                maxLength={5000}
                required={selectedAction === 'modify' || selectedAction === 'message'}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  selectedAction === 'confirm'
                    ? 'Any additional notes about the reservation...'
                    : selectedAction === 'modify'
                      ? 'Please describe the changes you can offer...'
                      : selectedAction === 'decline'
                        ? 'Optional reason for declining...'
                        : 'Your message...'
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Submit Error */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !responderName.trim()}
              className={`
                w-full rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-colors
                ${selectedAction === 'confirm'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : selectedAction === 'modify'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : selectedAction === 'decline'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {submitting ? 'Submitting...' : `Submit Response`}
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 pb-4">
          Powered by Walla Walla Travel
        </p>
      </div>
    </div>
  );
}
