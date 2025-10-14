// WALLA WALLA TRAVEL - MOBILE COMPONENTS
// Export all mobile-optimized components

export { TouchButton } from './TouchButton';
export { TouchButton as MobileButton } from './TouchButton'; // Alias for tests
export { BottomActionBar, BottomActionBarSpacer } from './BottomActionBar';
export { SignatureCanvas } from './SignatureCanvas';
export { MobileCard, MobileCardGrid } from './MobileCard';
export { StatusIndicator } from './StatusIndicator';
export { AlertBanner, AlertStack, FixedAlert } from './AlertBanner';
export { MobileCheckbox } from './MobileCheckbox';
export { MobileInput } from './MobileInput';
export { haptics } from './haptics';

/**
 * Mobile Component Library for Walla Walla Travel
 * 
 * All components are optimized for:
 * - Touch targets ≥ 48px (WCAG compliance)
 * - One-thumb usability
 * - Haptic feedback
 * - Safe area insets (notch, home indicator)
 * - Clear typography
 * - Simple, elegant design
 * 
 * Usage:
 * import { TouchButton, BottomActionBar, SignatureCanvas } from '@/components/mobile';
 */
