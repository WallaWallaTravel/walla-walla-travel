'use client';

import React, { useState, useEffect } from 'react';

interface SendProposalModalProps {
  show: boolean;
  onClose: () => void;
  onSend: (customMessage: string) => void;
  proposalNumber: string;
  customerEmail: string | null;
  total: string;
  sending: boolean;
}

export const SendProposalModal = React.memo(function SendProposalModal({
  show,
  onClose,
  onSend,
  proposalNumber,
  customerEmail,
  total,
  sending,
}: SendProposalModalProps) {
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    if (!show) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !sending) {
        onClose();
        setCustomMessage('');
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, sending, onClose]);

  if (!show) return null;

  const handleSend = () => {
    onSend(customMessage);
    setCustomMessage('');
  };

  const handleClose = () => {
    if (!sending) {
      onClose();
      setCustomMessage('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-proposal-title"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6">
        <h2 id="send-proposal-title" className="text-xl font-bold text-gray-900 mb-1">Send Proposal</h2>
        <p className="text-sm text-gray-600 mb-5">
          Send <span className="font-semibold">{proposalNumber}</span> to{' '}
          <span className="font-semibold">{customerEmail || 'no email set'}</span>
        </p>

        {!customerEmail && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700">No customer email address. Please add one before sending.</p>
          </div>
        )}

        {Number(total) <= 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-700">Pricing is $0. Please add service line items and recalculate pricing first.</p>
          </div>
        )}

        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-900 mb-1.5">
            Custom Message <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Add a personal note that will appear at the top of the email..."
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>

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
            disabled={sending || !customerEmail || Number(total) <= 0}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
});
