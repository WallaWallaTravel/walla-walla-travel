'use client';

import React from 'react';

interface TouchButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
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
  fullWidth = false,
  haptic = true,
  type = 'button',
  className = '',
}: TouchButtonProps) {
  
  const handleClick = () => {
    // Haptic feedback for mobile devices
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(10); // Light vibration
    }
    
    if (onClick && !disabled) {
      onClick();
    }
  };

  // Base styles (always applied)
  const baseStyles = 'font-semibold rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
  
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
  };
  
  // Width
  const widthStyle = fullWidth ? 'w-full' : '';
  
  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${widthStyle}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
