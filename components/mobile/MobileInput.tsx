'use client';

import React, { forwardRef } from 'react';

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        
        <input
          ref={ref}
          className={`
            w-full px-4 py-3 min-h-[48px]
            text-base leading-normal text-gray-900
            border rounded-lg
            transition-colors duration-200
            placeholder:text-gray-700
            ${error 
              ? 'border-red-500 focus:border-red-600 focus:ring-red-500' 
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }
            focus:outline-none focus:ring-2 focus:ring-opacity-90
            disabled:bg-gray-50 disabled:text-gray-700
            ${className}
          `}
          style={{ fontSize: '16px' }} // Prevents iOS zoom
          {...props}
        />
        
        {hint && !error && (
          <p className="mt-1 text-sm text-gray-800">{hint}</p>
        )}
        
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

MobileInput.displayName = 'MobileInput';

export default MobileInput;