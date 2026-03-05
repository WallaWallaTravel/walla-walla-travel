'use client';

import { useSearchParams } from 'next/navigation';

const ACTION_MESSAGES: Record<string, { heading: string; body: string; icon: string; bg: string; iconColor: string }> = {
  confirm: {
    heading: 'Booking Confirmed',
    body: 'Thank you for confirming! The tour organizer has been notified and will follow up if needed.',
    icon: '✓',
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  modify: {
    heading: 'Changes Submitted',
    body: 'Thank you for your suggested changes. The tour organizer has been notified and will review your proposal.',
    icon: '↔',
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  decline: {
    heading: 'Response Received',
    body: 'Thank you for letting us know. The tour organizer has been notified and will make alternative arrangements.',
    icon: '✕',
    bg: 'bg-red-50',
    iconColor: 'text-red-600',
  },
  message: {
    heading: 'Message Sent',
    body: 'Thank you for your message. The tour organizer has been notified and will respond shortly.',
    icon: '✉',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
};

const DEFAULT_MESSAGE = {
  heading: 'Response Submitted',
  body: 'Thank you for your response. The tour organizer has been notified.',
  icon: '✓',
  bg: 'bg-gray-50',
  iconColor: 'text-gray-600',
};

export default function PartnerRespondSuccessPage() {
  const searchParams = useSearchParams();
  const action = searchParams.get('action') || '';
  const config = ACTION_MESSAGES[action] || DEFAULT_MESSAGE;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <div className={`w-14 h-14 rounded-full ${config.bg} flex items-center justify-center mx-auto mb-5`}>
            <span className={`${config.iconColor} text-2xl`}>{config.icon}</span>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-3">
            {config.heading}
          </h1>

          <p className="text-gray-600 leading-relaxed">
            {config.body}
          </p>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              You can safely close this page. If you need to make changes, use the original link from your email.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Powered by Walla Walla Travel
        </p>
      </div>
    </div>
  );
}
