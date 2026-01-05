/**
 * SmartLocationInput Component
 * 
 * Fast location entry with live search and Enter key selection
 * 
 * Features:
 * - Click to select all text
 * - Live search as you type
 * - Enter key to select when 1 result
 * - Dropdown with suggestions
 * - Supports custom entries
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { searchLocations } from '@/lib/data/locations';

export interface SmartLocationInputProps {
  id?: string;
  value: string;
  onChange: (location: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  nextFieldId?: string;                   // Auto-focus after Enter
  className?: string;
  disabled?: boolean;
}

export function SmartLocationInput({
  id,
  value,
  onChange,
  label,
  placeholder = 'Type to search locations...',
  required = false,
  error,
  nextFieldId,
  className = '',
  disabled = false
}: SmartLocationInputProps) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update search term when value changes externally
  useEffect(() => {
    if (!isFocused) {
      setSearchTerm(value);
    }
  }, [value, isFocused]);

  // Filter locations based on search term
  const filteredLocations = searchLocations(searchTerm);

  // Handle input change
  const handleInputChange = (newValue: string) => {
    setSearchTerm(newValue);
    setShowDropdown(true);
    
    // If user clears the input, clear the value
    if (newValue.trim() === '') {
      onChange('');
    }
  };

  // Handle location selection
  const selectLocation = (locationName: string) => {
    setSearchTerm(locationName);
    onChange(locationName);
    setShowDropdown(false);
    
    // Auto-advance to next field if provided
    if (nextFieldId) {
      setTimeout(() => {
        const nextField = document.getElementById(nextFieldId);
        if (nextField) {
          nextField.focus();
        }
      }, 100);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter key to select when only 1 result
    if (e.key === 'Enter' && filteredLocations.length === 1) {
      e.preventDefault();
      selectLocation(filteredLocations[0].name);
    }
    
    // Enter key to confirm custom entry when multiple results
    if (e.key === 'Enter' && filteredLocations.length > 1) {
      e.preventDefault();
      onChange(searchTerm);
      setShowDropdown(false);
      
      if (nextFieldId) {
        setTimeout(() => {
          const nextField = document.getElementById(nextFieldId);
          if (nextField) {
            nextField.focus();
          }
        }, 100);
      }
    }

    // Escape to close dropdown
    if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
    setShowDropdown(true);
    // Select all text on focus for easy replacement
    inputRef.current?.select();
  };

  // Handle blur
  const handleBlur = () => {
    // Delay to allow click on dropdown
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
      
      // If user typed something but didn't select, accept it as custom
      if (searchTerm && searchTerm !== value) {
        onChange(searchTerm);
      }
    }, 200);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          id={id}
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 border-2 rounded-lg transition-all ${
            error
              ? 'border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-100'
              : 'border-gray-300 focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />

        {/* Dropdown */}
        {showDropdown && filteredLocations.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {filteredLocations.map((location, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectLocation(location.name)}
                className="w-full text-left px-3 py-2 hover:bg-[#FDF2F4] focus:bg-[#FDF2F4] focus:outline-none transition-colors flex items-center justify-between"
              >
                <span className="text-sm text-gray-900 font-medium">
                  {location.name}
                </span>
                <span className="text-xs text-gray-500 capitalize">
                  {location.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Helper Text / Error */}
      <div className="mt-1 min-h-[20px]">
        {error ? (
          <p className="text-xs text-red-600 font-medium">{error}</p>
        ) : filteredLocations.length === 1 && searchTerm && showDropdown ? (
          <p className="text-xs text-green-600 font-medium">
            ↵ Press Enter to select &quot;{filteredLocations[0].name}&quot;
          </p>
        ) : isFocused && searchTerm ? (
          <p className="text-xs text-gray-500">
            {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''} found
            {filteredLocations.length > 1 && ' - keep typing or press Enter to use custom'}
          </p>
        ) : (
          <p className="text-xs text-gray-500">
            Start typing to search, or enter custom location
          </p>
        )}
      </div>
    </div>
  );
}

