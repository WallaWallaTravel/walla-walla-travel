'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface MobileInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  ({ className, label, error, helperText, fullWidth, ...props }, ref) => {
    return (
      <div className={cn('space-y-2', fullWidth && 'w-full')}>
        {label && (
          <label className="block text-base font-bold text-gray-900">
            {label}
            {props.required && <span className="text-red-600 ml-1">*</span>}
          </label>
        )}

        <input
          ref={ref}
          className={cn(
            // Base styles
            'w-full px-4 py-4 text-base font-semibold rounded-lg',
            'border-2 transition-all duration-200',
            'focus:outline-none focus:ring-2',
            // Default state
            'border-gray-300 text-gray-900 bg-white',
            'focus:border-blue-500 focus:ring-blue-200',
            // Error state
            error && 'border-red-500 focus:border-red-500 focus:ring-red-200',
            // Disabled state
            'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60',
            // Mobile optimization
            'min-h-[56px]', // WCAG compliant touch target
            'appearance-none', // Remove default browser styling
            className
          )}
          {...props}
        />

        {error && (
          <p className="text-sm font-semibold text-red-600 flex items-center gap-1">
            <span>⚠️</span>
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="text-sm text-gray-600">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

MobileInput.displayName = 'MobileInput';
