/**
 * Select Component
 * 
 * Reusable select dropdown with built-in validation and consistent styling.
 */

import React from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  helpText?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      touched,
      required,
      helpText,
      options,
      placeholder,
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
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-5 py-4 text-lg',
    };

    // Error classes
    const errorClasses = showError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
      : 'border-gray-300 focus:border-blue-500';

    return (
      <div className="w-full">
        {label && (
          <label className="block text-base font-bold text-gray-900 mb-2">
            {label}
            {required && <span className="text-red-600 ml-1">*</span>}
          </label>
        )}

        <select
          ref={ref}
          className={`
            w-full rounded-lg border-2 font-semibold transition-all appearance-none
            bg-white bg-no-repeat bg-right
            focus:ring-2 focus:ring-blue-200
            ${sizeClasses[size]}
            ${errorClasses}
            ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}
            ${className}
          `}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
            backgroundPosition: 'right 0.5rem center',
            backgroundSize: '1.5em 1.5em',
            paddingRight: '2.5rem',
          }}
          disabled={disabled}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

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

Select.displayName = 'Select';




