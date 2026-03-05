'use client';

/**
 * RequestStatusBadge — shows per-stop reservation request status.
 * Maps reservation_status to a colored badge with label.
 */

interface RequestStatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Not Sent', bg: 'bg-gray-100', text: 'text-gray-700' },
  requested: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-800' },
  confirmed: { label: 'Confirmed', bg: 'bg-green-100', text: 'text-green-800' },
  waitlist: { label: 'Waitlist', bg: 'bg-blue-100', text: 'text-blue-800' },
  cancelled: { label: 'Declined', bg: 'bg-red-100', text: 'text-red-800' },
  na: { label: 'N/A', bg: 'bg-gray-50', text: 'text-gray-500' },
};

export default function RequestStatusBadge({ status, className = '' }: RequestStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      {config.label}
    </span>
  );
}
