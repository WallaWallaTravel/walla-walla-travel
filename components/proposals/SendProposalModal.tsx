'use client';

import { useState } from 'react';

interface SendProposalModalProps {
  proposalNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function SendProposalModal({
  proposalNumber,
  clientName,
  clientEmail,
  clientPhone,
  onClose,
  onSuccess
}: SendProposalModalProps) {
  const [method, setMethod] = useState<'email' | 'sms' | 'both'>('email');
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);

    try {
      const response = await fetch(`/api/proposals/${proposalNumber}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          method,
          customMessage: customMessage.trim() || undefined
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send proposal');
      }

      alert(`Proposal sent successfully via ${method}!`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to send proposal:', error);
      alert(error instanceof Error ? error.message : 'Failed to send proposal');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8B1538] to-[#6B1028] text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">📧 Send Proposal</h2>
              <p className="text-sm opacity-90 mt-1">Proposal #{proposalNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Client Info */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-6">
            <h3 className="font-bold text-gray-900 mb-3">Sending to:</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">👤</span>
                <span className="font-bold text-gray-900">{clientName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">📧</span>
                <span className="text-gray-700">{clientEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">📱</span>
                <span className="text-gray-700">{clientPhone}</span>
              </div>
            </div>
          </div>

          {/* Send Method */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-3">Send via:</label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-[#8B1538] cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="method"
                  value="email"
                  checked={method === 'email'}
                  onChange={(e) => setMethod(e.target.value as 'email')}
                  className="w-5 h-5 text-[#8B1538]"
                />
                <div className="flex-1">
                  <div className="font-bold text-gray-900">📧 Email Only</div>
                  <div className="text-sm text-gray-600">Send proposal link via email</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-[#8B1538] cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="method"
                  value="sms"
                  checked={method === 'sms'}
                  onChange={(e) => setMethod(e.target.value as 'sms')}
                  className="w-5 h-5 text-[#8B1538]"
                />
                <div className="flex-1">
                  <div className="font-bold text-gray-900">📱 SMS/Text Only</div>
                  <div className="text-sm text-gray-600">Send proposal link via text message</div>
                  <div className="text-xs text-yellow-600 mt-1">⚠️ SMS integration coming soon</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-[#8B1538] cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="method"
                  value="both"
                  checked={method === 'both'}
                  onChange={(e) => setMethod(e.target.value as 'both')}
                  className="w-5 h-5 text-[#8B1538]"
                />
                <div className="flex-1">
                  <div className="font-bold text-gray-900">📧📱 Email & SMS</div>
                  <div className="text-sm text-gray-600">Send via both email and text message</div>
                  <div className="text-xs text-yellow-600 mt-1">⚠️ SMS integration coming soon</div>
                </div>
              </label>
            </div>
          </div>

          {/* Custom Message */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Custom Message (Optional)
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={4}
              placeholder="Add a personal message to include in the email..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
            />
            <p className="text-xs text-gray-500 mt-1">
              This message will appear at the top of the email, before the proposal details.
            </p>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-bold text-blue-900 mb-2">📋 What the client will receive:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Beautiful email with proposal summary</li>
              <li>• Clickable link to view full proposal</li>
              <li>• Total investment and valid until date</li>
              <li>• Easy &quot;Accept Proposal&quot; button</li>
              {customMessage && <li>• Your custom message</li>}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={sending}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 px-6 py-3 bg-[#8B1538] hover:bg-[#7A1230] disabled:bg-gray-400 text-white rounded-lg font-bold transition-colors shadow-lg"
            >
              {sending ? '⏳ Sending...' : '📧 Send Proposal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

