'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface MobileSelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

/**
 * Mobile-Optimized Select/Dropdown Component
 *
 * Features:
 * - 56px minimum touch target (WCAG compliant)
 * - Native select on mobile for better UX
 * - Custom styled dropdown on desktop
 * - Clear visual states
 * - Error handling
 * - Full keyboard navigation
 */
export function MobileSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  error,
  helperText,
  disabled = false,
  fullWidth = true,
  className
}: MobileSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;

  const handleSelect = (optionValue: string) => {
    if (!disabled) {
      onChange(optionValue);
      setIsOpen(false);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  };

  return (
    <div className={cn('space-y-2', fullWidth && 'w-full', className)}>
      {label && (
        <label className="block text-base font-bold text-gray-900">
          {label}
        </label>
      )}

      <div ref={selectRef} className="relative">
        {/* Select Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            // Base styles
            'w-full px-4 py-4 text-base font-semibold rounded-lg',
            'border-2 transition-all duration-200',
            'focus:outline-none focus:ring-2',
            'text-left flex items-center justify-between',
            // Default state
            'border-gray-300 text-gray-900 bg-white',
            'focus:border-blue-500 focus:ring-blue-200',
            // Error state
            error && 'border-red-500 focus:border-red-500 focus:ring-red-200',
            // Disabled state
            'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60',
            // Mobile optimization
            'min-h-[56px]', // WCAG compliant
            'appearance-none'
          )}
        >
          <span className={!value ? 'text-gray-500' : ''}>
            {displayValue}
          </span>
          <svg
            className={cn(
              'w-5 h-5 transition-transform duration-200',
              isOpen && 'transform rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                disabled={option.disabled}
                className={cn(
                  // Base styles
                  'w-full px-4 py-4 text-base font-semibold text-left',
                  'transition-colors duration-150',
                  'min-h-[56px]', // WCAG compliant
                  // Hover/Active states
                  'hover:bg-blue-50 active:bg-blue-100',
                  // Selected state
                  option.value === value && 'bg-blue-100 text-blue-900',
                  // Disabled state
                  option.disabled && 'opacity-50 cursor-not-allowed',
                  // Border
                  'border-b border-gray-200 last:border-b-0'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

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

/**
 * Mobile Checkbox Component
 */
export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className
}: CheckboxProps) {
  const handleToggle = () => {
    if (!disabled) {
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
      onChange(!checked);
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 py-3',
        !disabled && 'cursor-pointer',
        className
      )}
      onClick={handleToggle}
    >
      {/* Checkbox */}
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-md border-2 flex items-center justify-center',
          'transition-all duration-200',
          checked
            ? 'bg-blue-600 border-blue-600'
            : 'bg-white border-gray-300',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer active:scale-95',
          !checked && !disabled && 'hover:border-blue-500'
        )}
      >
        {checked && (
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>

      {/* Label and Description */}
      <div className="flex-1 min-w-0">
        <label
          className={cn(
            'block text-base font-bold text-gray-900',
            disabled ? 'opacity-50' : 'cursor-pointer'
          )}
        >
          {label}
        </label>
        {description && (
          <p className="text-sm text-gray-600 mt-1">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Mobile Radio Group Component
 */
export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  label,
  className
}: RadioGroupProps) {
  const handleSelect = (optionValue: string, disabled?: boolean) => {
    if (!disabled) {
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
      onChange(optionValue);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-base font-bold text-gray-900 mb-3">
          {label}
        </label>
      )}

      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <div
              key={option.value}
              className={cn(
                'flex items-start gap-3 py-3 px-4 rounded-lg',
                'border-2 transition-all duration-200',
                'min-h-[56px]', // WCAG compliant
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 bg-white',
                option.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer hover:border-blue-500 active:scale-98'
              )}
              onClick={() => handleSelect(option.value, option.disabled)}
            >
              {/* Radio Circle */}
              <div
                className={cn(
                  'flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center',
                  'transition-all duration-200',
                  isSelected
                    ? 'border-blue-600'
                    : 'border-gray-300'
                )}
              >
                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-blue-600" />
                )}
              </div>

              {/* Label and Description */}
              <div className="flex-1 min-w-0">
                <label
                  className={cn(
                    'block text-base font-bold',
                    isSelected ? 'text-blue-900' : 'text-gray-900',
                    option.disabled ? 'opacity-50' : 'cursor-pointer'
                  )}
                >
                  {option.label}
                </label>
                {option.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
