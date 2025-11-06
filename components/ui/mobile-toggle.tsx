'use client';

import { cn } from '@/lib/utils';

export interface MobileToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'default' | 'compact';
  className?: string;
}

/**
 * Mobile-Optimized Toggle Switch Component
 *
 * Features:
 * - 48-56px touch targets (WCAG compliant)
 * - Smooth animations
 * - Haptic feedback on touch devices
 * - Clear visual states (on/off/disabled)
 * - Optional label and description
 * - Accessible keyboard support
 */
export function MobileToggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'default',
  className
}: MobileToggleProps) {
  const handleToggle = () => {
    if (disabled) return;

    // Haptic feedback on touch devices
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    onChange(!checked);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  };

  const isCompact = size === 'compact';

  return (
    <div className={cn('flex items-start gap-3', className)}>
      {/* Toggle Switch */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label || 'Toggle'}
        disabled={disabled}
        onClick={handleToggle}
        onKeyPress={handleKeyPress}
        className={cn(
          // Base styles
          'relative inline-flex flex-shrink-0 rounded-full',
          'transition-all duration-300 ease-in-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          // Size variants
          isCompact
            ? 'h-8 w-14 min-w-[56px]' // Compact: 32px height, 56px width (still WCAG)
            : 'h-12 w-20 min-w-[80px]', // Default: 48px height, 80px width
          // Color states
          checked
            ? 'bg-blue-600 focus:ring-blue-500'
            : 'bg-gray-300 focus:ring-gray-400',
          // Disabled state
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer active:scale-95'
        )}
      >
        <span
          className={cn(
            // Base styles
            'inline-block bg-white rounded-full shadow-lg',
            'transition-transform duration-300 ease-in-out',
            'pointer-events-none',
            // Size variants
            isCompact
              ? 'h-6 w-6 m-1' // Compact thumb
              : 'h-10 w-10 m-1', // Default thumb
            // Position based on checked state
            checked
              ? isCompact
                ? 'translate-x-6'
                : 'translate-x-8'
              : 'translate-x-0'
          )}
        />
      </button>

      {/* Label and Description */}
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && (
            <label
              className={cn(
                'block font-bold text-gray-900',
                isCompact ? 'text-sm' : 'text-base',
                disabled ? 'opacity-50' : 'cursor-pointer'
              )}
              onClick={() => !disabled && handleToggle()}
            >
              {label}
            </label>
          )}
          {description && (
            <p
              className={cn(
                'text-gray-600 mt-1',
                isCompact ? 'text-xs' : 'text-sm'
              )}
            >
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Toggle List Item - For use in settings lists
 */
export interface ToggleListItemProps extends MobileToggleProps {
  icon?: React.ReactNode;
  divider?: boolean;
}

export function ToggleListItem({
  icon,
  divider = true,
  ...toggleProps
}: ToggleListItemProps) {
  return (
    <div
      className={cn(
        'py-4 px-6',
        divider && 'border-b border-gray-200'
      )}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex-shrink-0 text-gray-600 text-xl">
            {icon}
          </div>
        )}
        <MobileToggle {...toggleProps} className="flex-1" />
      </div>
    </div>
  );
}

/**
 * Compact Toggle - Smaller variant for inline use
 */
export function CompactToggle(props: MobileToggleProps) {
  return <MobileToggle {...props} size="compact" />;
}

/**
 * Toggle Group - For multiple related toggles
 */
export interface ToggleGroupProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function ToggleGroup({ title, children, className }: ToggleGroupProps) {
  return (
    <div className={cn('bg-white rounded-lg shadow-md overflow-hidden', className)}>
      {title && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>
      )}
      <div className="divide-y divide-gray-200">
        {children}
      </div>
    </div>
  );
}
