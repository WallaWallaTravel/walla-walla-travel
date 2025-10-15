'use client';

import React from 'react';

interface BottomActionBarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * BottomActionBar - Fixed bottom action bar with safe area support
 * 
 * Features:
 * - Fixed to bottom of screen
 * - Respects mobile safe areas (notch, home indicator)
 * - Elevated above content with shadow
 * - White background with border
 * - Ideal for primary actions
 * 
 * Usage:
 * <BottomActionBar>
 *   <TouchButton variant="primary">Save</TouchButton>
 *   <TouchButton variant="secondary">Cancel</TouchButton>
 * </BottomActionBar>
 */
export function BottomActionBar({ children, className = '' }: BottomActionBarProps) {
  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0
        bg-white border-t border-gray-200
        px-4 py-4
        shadow-lg
        z-50
        safe-area-inset-bottom
        ${className}
      `}
      style={{
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex gap-3 max-w-2xl mx-auto">
        {children}
      </div>
    </div>
  );
}

/**
 * BottomActionBarSpacer - Use this to add spacing above the action bar
 * 
 * Place this at the end of your scrollable content to prevent it from
 * being hidden behind the fixed BottomActionBar.
 * 
 * Usage:
 * <div className="overflow-y-auto">
 *   Your content
 *   <BottomActionBarSpacer />
 * </div>
 * <BottomActionBar>
 *   <TouchButton>Save</TouchButton>
 * </BottomActionBar>
 */
export function BottomActionBarSpacer() {
  return (
    <div 
      className="h-24"
      style={{
        height: 'calc(6rem + env(safe-area-inset-bottom))',
      }}
    />
  );
}
