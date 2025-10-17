'use client';

import React from 'react';
import { haptics } from './haptics';

interface MobileCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const MobileCheckbox: React.FC<MobileCheckboxProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
  className = '',
}) => {
  const handleToggle = () => {
    if (!disabled) {
      haptics.light();
      onChange(!checked);
    }
  };

  return (
    <label
      className={`
        flex items-center gap-3 p-3 min-h-[48px]
        cursor-pointer select-none
        ${disabled ? 'opacity-80 cursor-not-allowed' : ''}
        ${className}
      `}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => handleToggle()}
          disabled={disabled}
          className="sr-only"
          aria-label={label}
        />
        <div
          className={`
            w-6 h-6 rounded border-2 flex items-center justify-center
            transition-all duration-200
            ${checked 
              ? 'bg-green-600 border-green-600' 
              : 'bg-white border-gray-300'
            }
            ${!disabled && 'active:scale-95'}
          `}
        >
          {checked && (
            <svg
              className="w-4 h-4 text-white"
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
      </div>
      <span className="text-base text-gray-900 flex-1">
        {label}
      </span>
    </label>
  );
};

export default MobileCheckbox;