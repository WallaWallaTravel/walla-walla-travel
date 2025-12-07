'use client';

import React from 'react';

export interface StatusIndicatorProps {
  status: 'pending' | 'active' | 'completed' | 'error' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  size = 'md',
  className = '',
  label,
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const statusClasses = {
    pending: 'bg-gray-100 text-gray-800 border border-gray-300',
    active: 'bg-blue-100 text-blue-700 border border-blue-300 animate-pulse',
    completed: 'bg-green-100 text-green-700 border border-green-300',
    error: 'bg-red-100 text-red-700 border border-red-300',
    warning: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  };

  const statusLabels = {
    pending: 'Pending',
    active: 'Active',
    completed: 'Completed',
    error: 'Error',
    warning: 'Warning',
  };

  const statusIcons = {
    pending: '○',
    active: '●',
    completed: '✓',
    error: '✕',
    warning: '⚠',
  };

  return (
    <span
      data-testid={`status-${status}`}
      className={`
        inline-flex items-center gap-1
        rounded-full font-medium
        ${sizeClasses[size]}
        ${statusClasses[status]}
        ${className}
      `}
    >
      <span className="text-xs">{statusIcons[status]}</span>
      <span>{label || statusLabels[status]}</span>
    </span>
  );
};

export default StatusIndicator;