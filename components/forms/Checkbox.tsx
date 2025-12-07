/**
 * Checkbox Component
 * 
 * Reusable checkbox with label and consistent styling.
 */

import React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string | React.ReactNode;
  error?: string;
  touched?: boolean;
  helpText?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      error,
      touched,
      helpText,
      size = 'md',
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const showError = touched && error;

    // Size classes
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    const labelSizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    };

    return (
      <div className="w-full">
        <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
          <input
            ref={ref}
            type="checkbox"
            className={`
              rounded border-2 border-gray-300 text-blue-600
              focus:ring-2 focus:ring-blue-500 focus:ring-offset-0
              transition-colors
              ${sizeClasses[size]}
              ${showError ? 'border-red-500' : ''}
              ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
              ${className}
            `}
            disabled={disabled}
            {...props}
          />
          {label && (
            <span className={`font-semibold text-gray-900 select-none ${labelSizeClasses[size]}`}>
              {label}
            </span>
          )}
        </label>

        {showError && (
          <p className="mt-1 text-sm text-red-600 font-semibold">
            {error}
          </p>
        )}

        {helpText && !showError && (
          <p className="mt-1 text-sm text-gray-600">
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';




