/**
 * SmartTimeInput Component
 * 
 * Fast time entry with intelligent AM/PM detection
 * 
 * Features:
 * - Type "115" → "01:15 PM"
 * - Type "930" → "09:30 AM"
 * - Service-type-aware defaults
 * - Press 'a' or 'p' to toggle AM/PM
 * - Live preview as you type
 * - Auto-focus next field on Enter
 */

'use client';

import { useRef } from 'react';
import { useSmartTimeInput } from '@/lib/hooks/useSmartTimeInput';
import type { ServiceType } from '@/lib/utils/timeParser';

export interface SmartTimeInputProps {
  value: string;                          // ISO time string (HH:MM:SS) or empty
  onChange: (isoTime: string) => void;
  serviceType?: ServiceType;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  nextFieldId?: string;                   // Auto-focus after Enter
  className?: string;
  disabled?: boolean;
}

export function SmartTimeInput({
  value,
  onChange,
  serviceType,
  label,
  placeholder = 'Type time (e.g., 115, 930)',
  required = false,
  error: externalError,
  nextFieldId,
  className = '',
  disabled = false
}: SmartTimeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    rawInput,
    parsedTime,
    error: internalError,
    isFocused,
    handleInput,
    togglePeriod,
    clear,
    setFocused,
    formattedTime
  } = useSmartTimeInput({
    initialValue: value,
    serviceType,
    onChange
  });

  const error = externalError || internalError;

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Toggle AM/PM with 'a' or 'p' keys
    if (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'p') {
      if (parsedTime) {
        e.preventDefault();
        togglePeriod();
      }
    }

    // Move to next field on Enter
    if (e.key === 'Enter' && parsedTime && nextFieldId) {
      e.preventDefault();
      const nextField = document.getElementById(nextFieldId);
      if (nextField) {
        nextField.focus();
      }
    }

    // Clear on Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      clear();
      inputRef.current?.blur();
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-bold text-gray-900 mb-2">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Main Input */}
        <input
          ref={inputRef}
          type="text"
          value={rawInput}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 border-2 rounded-lg transition-all ${
            error
              ? 'border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-100'
              : 'border-gray-300 focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />

        {/* Live Preview */}
        {parsedTime && rawInput && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-sm font-bold text-[#8B1538]">
              {formattedTime}
            </span>
            <button
              type="button"
              onClick={clear}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              title="Clear"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Helper Text / Error */}
      <div className="mt-1 min-h-[20px]">
        {error ? (
          <p className="text-xs text-red-600 font-medium">{error}</p>
        ) : isFocused && !parsedTime && rawInput ? (
          <p className="text-xs text-gray-500">
            Keep typing... (e.g., 115 for 1:15 PM)
          </p>
        ) : parsedTime && isFocused ? (
          <p className="text-xs text-green-600 font-medium">
            ✓ Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">a</kbd> for AM, 
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] ml-1">p</kbd> for PM
            {nextFieldId && ', or '}
            {nextFieldId && <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">Enter</kbd>}
            {nextFieldId && ' to continue'}
          </p>
        ) : (
          <p className="text-xs text-gray-500">
            Quick entry: 115 = 1:15 PM, 930 = 9:30 AM
          </p>
        )}
      </div>
    </div>
  );
}

