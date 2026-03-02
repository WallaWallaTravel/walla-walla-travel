'use client';

import React, { useEffect } from 'react';

interface DeleteConfirmModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  proposalNumber: string;
  loading: boolean;
}

export const DeleteConfirmModal = React.memo(function DeleteConfirmModal({
  show,
  onClose,
  onConfirm,
  proposalNumber,
  loading,
}: DeleteConfirmModalProps) {
  useEffect(() => {
    if (!show) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, loading, onClose]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && onClose()} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
        <h2 id="delete-confirm-title" className="text-xl font-bold text-gray-900 mb-2">Delete Proposal</h2>
        <p className="text-sm text-gray-600 mb-5">
          Permanently delete <span className="font-semibold">{proposalNumber}</span>? This will remove all days, stops, guests, and pricing data. This action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm disabled:opacity-50 transition-colors"
          >
            {loading ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </div>
  );
});
