/**
 * Haptic Feedback Utilities
 * Provides cross-platform haptic feedback for mobile devices
 */

export const haptics = {
  /**
   * Light haptic feedback (10ms)
   * Use for: checkbox toggles, small interactions
   */
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium haptic feedback (20ms)
   * Use for: button presses, navigation
   */
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  },

  /**
   * Heavy haptic feedback (40ms)
   * Use for: important actions, confirmations
   */
  heavy: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(40);
    }
  },

  /**
   * Success pattern (two short vibrations)
   * Use for: successful form submission, task completion
   */
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([20, 50, 20]);
    }
  },

  /**
   * Warning pattern (three quick vibrations)
   * Use for: validation warnings, alerts
   */
  warning: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 30, 10, 30, 10]);
    }
  },

  /**
   * Error pattern (long vibration)
   * Use for: errors, failed actions
   */
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
  },

  /**
   * Custom vibration pattern
   * @param pattern Array of milliseconds [vibrate, pause, vibrate, ...]
   */
  custom: (pattern: number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }
};

export default haptics;