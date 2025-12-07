/**
 * Textarea Component
 * 
 * Reusable textarea with built-in validation and consistent styling.
 */

import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  helpText?: string;
  maxLength?: number;
  showCount?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      touched,
      required,
      helpText,
      maxLength,
      showCount,
      className = '',
      disabled,
      value,
      onFocus,
      ...props
    },
    ref
  ) => {
    const showError = touched && error;
    const currentLength = value ? String(value).length : 0;

    // Select all text on focus
    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
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

        <textarea
          ref={ref}
          className={`
            w-full px-4 py-3 rounded-lg border-2 font-semibold transition-all
            focus:ring-2 focus:ring-blue-200
            ${showError ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500'}
            ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}
            ${className}
          `}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          onFocus={handleFocus}
          {...props}
        />

        <div className="flex items-center justify-between mt-1">
          <div className="flex-1">
            {showError && (
              <p className="text-sm text-red-600 font-semibold">
                {error}
              </p>
            )}

            {helpText && !showError && (
              <p className="text-sm text-gray-600">
                {helpText}
              </p>
            )}
          </div>

          {(showCount && maxLength) && (
            <p className={`text-sm ml-4 ${currentLength > maxLength * 0.9 ? 'text-orange-600 font-bold' : 'text-gray-500'}`}>
              {currentLength} / {maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';




