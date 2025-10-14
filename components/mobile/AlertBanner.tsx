'use client';

import React from 'react';

interface AlertBannerProps {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  action?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  dismissible?: boolean;
  className?: string;
}

/**
 * AlertBanner - Visual notification banner
 * 
 * Features:
 * - Color-coded by type (info, warning, error, success)
 * - Optional action button
 * - Optional dismiss button
 * - Clear icons and typography
 * - Mobile-optimized spacing
 * 
 * Usage:
 * <AlertBanner 
 *   type="warning"
 *   message="Approaching 10-hour driving limit"
 *   action="View Details"
 *   onAction={() => navigate('/hos')}
 *   dismissible
 *   onDismiss={() => setShowAlert(false)}
 * />
 */
export function AlertBanner({
  type,
  message,
  action,
  onAction,
  onDismiss,
  dismissible = false,
  className = '',
}: AlertBannerProps) {
  
  const typeConfig = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      icon: 'ℹ️',
      actionBg: 'bg-blue-600 hover:bg-blue-700',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
      icon: '⚠️',
      actionBg: 'bg-yellow-600 hover:bg-yellow-700',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      icon: '🚨',
      actionBg: 'bg-red-600 hover:bg-red-700',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      icon: '✅',
      actionBg: 'bg-green-600 hover:bg-green-700',
    },
  };

  const config = typeConfig[type];

  return (
    <div
      className={`
        ${config.bg}
        ${config.border}
        border rounded-lg p-4
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-2xl mt-0.5">
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`${config.text} font-medium text-base leading-relaxed`}>
            {message}
          </p>

          {/* Action button */}
          {action && onAction && (
            <button
              onClick={onAction}
              className={`
                mt-3 px-4 py-2 rounded-md
                ${config.actionBg}
                text-white font-medium text-sm
                transition-colors duration-200
                active:scale-95
              `}
            >
              {action}
            </button>
          )}
        </div>

        {/* Dismiss button */}
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={`
              flex-shrink-0 p-1 rounded
              ${config.text}
              hover:bg-black/10
              transition-colors duration-200
            `}
            aria-label="Dismiss"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * AlertStack - Container for multiple alerts
 * 
 * Usage:
 * <AlertStack>
 *   <AlertBanner type="warning" message="..." />
 *   <AlertBanner type="error" message="..." />
 * </AlertStack>
 */
export function AlertStack({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Fixed Alert - Sticks to top of screen
 * 
 * Usage:
 * <FixedAlert type="warning" message="Connection lost" />
 */
export function FixedAlert(props: AlertBannerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <div className="max-w-2xl mx-auto">
        <AlertBanner {...props} />
      </div>
    </div>
  );
}
