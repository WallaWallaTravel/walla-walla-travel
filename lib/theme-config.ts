/**
 * Theme Configuration
 * Modern Navy & Copper - Sophisticated, trustworthy, premium travel brand
 */

export const theme = {
  colors: {
    // Primary - Deep Navy
    primary: {
      50: '#F0F4F8',
      100: '#D9E2EC',
      200: '#BCCCDC',
      300: '#9FB3C8',
      400: '#627D98',
      500: '#486581',
      600: '#334E68',
      700: '#1E3A5F', // Main navy
      800: '#1A3354',
      900: '#0F172A',
    },
    
    // Accent - Warm Copper
    accent: {
      50: '#FDF8F3',
      100: '#FAEDE0',
      200: '#F5D9C0',
      300: '#E8BA8F',
      400: '#D49560',
      500: '#B87333', // Main copper
      600: '#A5632B',
      700: '#8B5225',
      800: '#6F421E',
      900: '#5A3618',
    },
    
    // Neutrals - Cool slate tones
    gray: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
    }
  },
  
  // Semantic colors - refined to match palette
  semantic: {
    success: '#059669', // Emerald-600 (muted)
    warning: '#D97706', // Amber-600 (warm)
    error: '#DC2626',   // Red-600
    info: '#1E3A5F',    // Use primary navy
  }
};

// Tailwind-compatible class names
export const themeClasses = {
  // Buttons
  button: {
    primary: 'bg-[#1E3A5F] hover:bg-[#334E68] text-white transition-colors',
    secondary: 'bg-[#B87333] hover:bg-[#A5632B] text-white transition-colors',
    outline: 'border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white transition-colors',
    ghost: 'text-[#1E3A5F] hover:bg-[#F0F4F8] transition-colors',
  },
  
  // Accents (copper - use sparingly)
  accent: {
    badge: 'bg-[#B87333] text-white',
    border: 'border-[#B87333]',
    text: 'text-[#B87333]',
    bgSubtle: 'bg-[#FDF8F3]',
  },
  
  // Primary (navy)
  primary: {
    badge: 'bg-[#1E3A5F] text-white',
    border: 'border-[#1E3A5F]',
    text: 'text-[#1E3A5F]',
    bgSubtle: 'bg-[#F0F4F8]',
  },
  
  // Focus states
  focus: 'focus:border-[#1E3A5F] focus:ring-4 focus:ring-[#F0F4F8]',
};

// CSS Custom Properties for easy theming
export const cssVariables = {
  '--color-primary': '#1E3A5F',
  '--color-primary-light': '#334E68',
  '--color-primary-dark': '#0F172A',
  '--color-accent': '#B87333',
  '--color-accent-light': '#D49560',
  '--color-accent-dark': '#8B5225',
  '--color-background': '#F8FAFC',
  '--color-surface': '#FFFFFF',
  '--color-text': '#0F172A',
  '--color-text-muted': '#64748B',
  '--color-border': '#E2E8F0',
};

export default theme;
