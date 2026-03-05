'use client';

import React from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

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
  return (
    <ConfirmModal
      isOpen={show}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Proposal"
      message={`Permanently delete ${proposalNumber}? This will remove all days, stops, guests, and pricing data. This action cannot be undone.`}
      confirmLabel={loading ? 'Deleting...' : 'Delete Permanently'}
      confirmVariant="danger"
      isLoading={loading}
    />
  );
});
