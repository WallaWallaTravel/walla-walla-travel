'use client';

import React from 'react';

interface TouchButtonProps {
  children: React.ReactNode;
  onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'small' | 'medium' | 'large' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

/**
 * TouchButton - Mobile-optimized button component
 * 
 * Features:
 * - Minimum 48px height (WCAG touch target)
 * - Large, easy-to-read text
 * - Haptic feedback on mobile devices
 * - Clear visual states (active, disabled)
 * - Multiple variants and sizes
 * 
 * Usage:
 * <TouchButton variant="primary" size="large" onClick={handleClick}>
 *   Clock In
 * </TouchButton>
 */
export function TouchButton({
  children,
  onClick,
  variant = 'primary',
  size = 'large',
  disabled = false,
  loading = false,
  fullWidth = false,
  haptic = true,
  type = 'button',
  className = '',
}: TouchButtonProps) {
  
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Haptic feedback for mobile devices
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(10); // Light vibration
    }
    
    if (onClick && !disabled && !loading) {
      onClick(event);
    }
  };
  
  // Effective disabled state includes loading
  const isDisabled = disabled || loading;

  // Base styles (always applied)
  const baseStyles = 'font-semibold rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-80 disabled:cursor-not-allowed';
  
  // Normalize size aliases
  const normalizedSize = size === 'sm' ? 'small' : size === 'md' ? 'medium' : size === 'lg' ? 'large' : size;

  // Size variants
  const sizeStyles = {
    small: 'px-4 py-2 text-sm min-h-[40px]',
    medium: 'px-6 py-3 text-base min-h-[48px]',
    large: 'px-8 py-4 text-lg min-h-[56px]',
  };
  
  // Color variants
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 border border-gray-300',
  };
  
  // Width
  const widthStyle = fullWidth ? 'w-full' : '';
  
  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        ${baseStyles}
        ${sizeStyles[normalizedSize]}
        ${variantStyles[variant]}
        ${widthStyle}
        ${className}
      `}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
