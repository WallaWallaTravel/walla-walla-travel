'use client';

import React from 'react';

interface MobileCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'bordered';
  onClick?: () => void;
  className?: string;
}

/**
 * MobileCard - Clean, readable card layout for mobile
 * 
 * Features:
 * - Clean design with ample padding
 * - Optional title, subtitle, icon
 * - Clickable with hover/active states
 * - Multiple variants (default, elevated, bordered)
 * - Responsive layout
 * 
 * Usage:
 * <MobileCard 
 *   title="Today's Inspection" 
 *   subtitle="Pre-trip required"
 *   variant="elevated"
 * >
 *   <StatusIndicator status="pending" />
 *   <TouchButton>Start Inspection</TouchButton>
 * </MobileCard>
 */
export function MobileCard({
  children,
  title,
  subtitle,
  icon,
  variant = 'default',
  onClick,
  className = '',
}: MobileCardProps) {
  
  // Base styles
  const baseStyles = 'bg-white rounded-lg transition-all duration-200';
  
  // Variant styles
  const variantStyles = {
    default: 'border border-gray-200',
    elevated: 'shadow-md hover:shadow-lg',
    bordered: 'border-2 border-gray-300',
  };
  
  // Interactive styles
  const interactiveStyles = onClick
    ? 'cursor-pointer active:scale-98 hover:bg-gray-50'
    : '';

  return (
    <div
      onClick={onClick}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${interactiveStyles}
        ${className}
      `}
    >
      {/* Header (if title/subtitle/icon provided) */}
      {(title || subtitle || icon) && (
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-start gap-3">
            {/* Icon */}
            {icon && (
              <div className="flex-shrink-0 mt-1">
                {icon}
              </div>
            )}
            
            {/* Title and subtitle */}
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-4">
        {children}
      </div>
    </div>
  );
}

/**
 * MobileCardGrid - Grid layout for multiple cards
 * 
 * Usage:
 * <MobileCardGrid>
 *   <MobileCard title="Card 1">...</MobileCard>
 *   <MobileCard title="Card 2">...</MobileCard>
 * </MobileCardGrid>
 */
export function MobileCardGrid({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Status Indicator - Use inside cards to show status
 * 
 * Usage:
 * <StatusIndicator status="complete" label="Completed" />
 */
export function StatusIndicator({
  status,
  label,
}: {
  status: 'pending' | 'in-progress' | 'complete' | 'error';
  label?: string;
}) {
  const statusConfig = {
    pending: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      dot: 'bg-yellow-500',
      text: label || 'Pending',
    },
    'in-progress': {
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      dot: 'bg-blue-500',
      text: label || 'In Progress',
    },
    complete: {
      color: 'bg-green-100 text-green-800 border-green-200',
      dot: 'bg-green-500',
      text: label || 'Complete',
    },
    error: {
      color: 'bg-red-100 text-red-800 border-red-200',
      dot: 'bg-red-500',
      text: label || 'Error',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.color}`}>
      <div className={`w-2 h-2 rounded-full ${config.dot}`} />
      <span className="text-sm font-medium">{config.text}</span>
    </div>
  );
}
