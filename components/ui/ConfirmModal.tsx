'use client';

import React from 'react';
import { BaseModal } from './BaseModal';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<NonNullable<ConfirmModalProps['confirmVariant']>, string> = {
  danger: 'bg-red-600 hover:bg-red-700',
  primary: 'bg-indigo-600 hover:bg-indigo-700',
};

/**
 * Pre-built confirmation dialog based on the DeleteConfirmModal pattern.
 * Uses BaseModal for the wrapper and provides Cancel / Confirm buttons.
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      isLoading={isLoading}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 ${VARIANT_CLASSES[confirmVariant]} text-white rounded-lg font-bold text-sm disabled:opacity-50 transition-colors`}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-gray-600">{message}</p>
    </BaseModal>
  );
}
