'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  COUNTRY_CODES,
  stripToDigits,
  formatPhoneDisplay,
  type CountryCode,
} from '@/lib/utils/phone-utils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  defaultCountry?: string;
}

export default function PhoneInput({
  value,
  onChange,
  name,
  id,
  placeholder = '(509) 555-0123',
  className = '',
  required,
  disabled,
  defaultCountry = 'US',
}: PhoneInputProps) {
  const [country, setCountry] = useState<CountryCode>(
    () => COUNTRY_CODES.find((c) => c.code === defaultCountry) || COUNTRY_CODES[0]
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  // Format on blur
  const handleBlur = useCallback(() => {
    if (!value) return;
    const formatted = formatPhoneDisplay(value, country.code);
    if (formatted !== value) {
      onChange(formatted);
    }
  }, [value, country.code, onChange]);

  // On initial load, format any existing raw digits
  const hasFormattedRef = useRef(false);
  useEffect(() => {
    if (!hasFormattedRef.current && value) {
      hasFormattedRef.current = true;
      const digits = stripToDigits(value);
      // Only auto-format if it looks like raw digits (no parens/dashes already)
      if (digits.length >= 10 && !/[()-]/.test(value)) {
        const formatted = formatPhoneDisplay(value, country.code);
        if (formatted !== value) {
          onChange(formatted);
        }
      }
    }
  }, [value, country.code, onChange]);

  const selectCountry = (c: CountryCode) => {
    setCountry(c);
    setDropdownOpen(false);
    // Re-format existing value for new country
    if (value) {
      const formatted = formatPhoneDisplay(value, c.code);
      if (formatted !== value) {
        onChange(formatted);
      }
    }
  };

  // Parse out the base input classes from className to apply to the wrapper
  // We keep the original className on the input for focus ring styles, etc.
  const hasError = className.includes('border-red');

  return (
    <div className="relative flex">
      {/* Country selector button */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`
          flex items-center gap-1 px-3 border border-r-0 rounded-l-lg bg-gray-50
          text-sm text-gray-700 hover:bg-gray-100 transition-colors shrink-0
          ${hasError ? 'border-red-500' : 'border-gray-200'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label="Select country code"
        aria-expanded={dropdownOpen}
      >
        <span className="text-base leading-none">{country.flag}</span>
        <span className="font-medium">{country.dialCode}</span>
        <svg
          className={`w-3 h-3 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Phone input */}
      <input
        type="tel"
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`flex-1 min-w-0 rounded-l-none ${className}`}
        autoComplete="tel"
      />

      {/* Country dropdown */}
      {dropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-y-auto"
        >
          {COUNTRY_CODES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => selectCountry(c)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 text-sm text-left
                hover:bg-gray-50 transition-colors
                ${c.code === country.code ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}
              `}
            >
              <span className="text-base leading-none">{c.flag}</span>
              <span className="flex-1">{c.name}</span>
              <span className="text-gray-500">{c.dialCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
