'use client';

import React, { useRef, useCallback } from 'react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { useEscapeKey } from '@/lib/hooks/useEscapeKey';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const SIZE_CLASSES: Record<NonNullable<BaseModalProps['size']>, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
};

/**
 * Shared modal wrapper that handles:
 * - Fixed backdrop overlay with blur
 * - Centered container with configurable max-width
 * - Escape key to close (disabled while loading)
 * - Focus trap via useFocusTrap
 * - Click-outside-to-close on backdrop
 * - Title bar with optional close X button
 * - Body slot (children)
 * - Footer slot (optional, for action buttons)
 */
export function BaseModal({
  isOpen,
  onClose,
  title,
  size = 'lg',
  isLoading = false,
  children,
  footer,
}: BaseModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      onClose();
    }
  }, [isLoading, onClose]);

  useEscapeKey(handleClose, !isOpen || isLoading);
  useFocusTrap(dialogRef, isOpen);

  if (!isOpen) return null;

  const titleId = `modal-title-${title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        className={`relative bg-white rounded-2xl shadow-xl max-w-[calc(100vw-2rem)] ${SIZE_CLASSES[size]} w-full mx-4 max-h-[90vh] flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-0">
          <h2
            id={titleId}
            className="text-xl font-bold text-gray-900"
          >
            {title}
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold leading-none disabled:opacity-50 -mt-1"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer (optional) */}
        {footer && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
