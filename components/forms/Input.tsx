/**
 * Input Component
 * 
 * Reusable input field with built-in validation, error display, and consistent styling.
 * Replaces duplicate input patterns across forms.
 */

import React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  helpText?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      touched,
      required,
      helpText,
      icon,
      size = 'md',
      variant = 'default',
      className = '',
      disabled,
      onFocus,
      ...props
    },
    ref
  ) => {
    const showError = touched && error;

    // Size classes
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-5 py-4 text-lg',
    };

    // Variant classes
    const variantClasses = {
      default: 'border-2 border-gray-300 focus:border-blue-500',
      filled: 'border-0 bg-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-500',
      outlined: 'border border-gray-400 focus:border-blue-600',
    };

    // Error classes
    const errorClasses = showError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
      : '';

    // Select all text on focus
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
      if (onFocus) {
        onFocus(e);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-base font-bold text-gray-900 mb-2">
            {label}
            {required && <span className="text-red-600 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            className={`
              w-full rounded-lg font-semibold transition-all
              ${sizeClasses[size]}
              ${variantClasses[variant]}
              ${errorClasses}
              ${icon ? 'pl-10' : ''}
              ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}
              ${className}
            `}
            disabled={disabled}
            onFocus={handleFocus}
            {...props}
          />
        </div>

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

Input.displayName = 'Input';




