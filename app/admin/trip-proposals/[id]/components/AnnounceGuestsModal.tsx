'use client';

import React, { useState } from 'react';
import { BaseModal } from '@/components/ui/BaseModal';

interface AnnounceGuestsModalProps {
  show: boolean;
  onClose: () => void;
  onSend: (subject: string, message: string) => void;
  proposalNumber: string;
  guestCount: number;
  sending: boolean;
}

export const AnnounceGuestsModal = React.memo(function AnnounceGuestsModal({
  show,
  onClose,
  onSend,
  proposalNumber,
  guestCount,
  sending,
}: AnnounceGuestsModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSend = () => {
    onSend(subject, message);
    setSubject('');
    setMessage('');
  };

  const handleClose = () => {
    if (!sending) {
      onClose();
      setSubject('');
      setMessage('');
    }
  };

  return (
    <BaseModal
      isOpen={show}
      onClose={handleClose}
      title="Send Update to Guests"
      size="lg"
      isLoading={sending}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={sending}
            className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || guestCount === 0 || !message.trim()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending...' : `Send to ${guestCount} Guest${guestCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      }
    >
      <p className="text-sm text-gray-600 mb-5">
        Send a group update to{' '}
        <span className="font-semibold">{guestCount} guest{guestCount !== 1 ? 's' : ''}</span>{' '}
        on <span className="font-semibold">{proposalNumber}</span>
      </p>

      {guestCount === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">No guests have email addresses. Add guest emails first.</p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-900 mb-1.5">
          Subject <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Custom subject line (auto-generated if left blank)"
          maxLength={200}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-1.5">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your update for the group..."
          rows={5}
          maxLength={5000}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">{message.length}/5000 characters</p>
      </div>
    </BaseModal>
  );
});
