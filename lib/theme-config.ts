/**
 * Theme Configuration
 * Wine Country - Burgundy/Gold with subtle, minimal application
 */

export const theme = {
  colors: {
    // Primary - Deep Burgundy/Wine
    primary: {
      50: '#FDF2F4',
      100: '#FCE7EB',
      200: '#F9CFD8',
      300: '#F4A8B9',
      400: '#EC7494',
      500: '#E04370',
      600: '#CD2456',
      700: '#8B1538', // Main burgundy
      800: '#7A1230',
      900: '#67102A',
    },
    
    // Accent - Gold
    accent: {
      50: '#FDFBF7',
      100: '#FAF6ED',
      200: '#F5EDD9',
      300: '#EBD9B4',
      400: '#DFC284',
      500: '#D4AF37', // Main gold
      600: '#C19A2E',
      700: '#A17F26',
      800: '#826624',
      900: '#6B5420',
    },
    
    // Neutrals - Keep clean
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    }
  },
  
  // Semantic colors
  semantic: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  }
};

// Tailwind-compatible class names
export const themeClasses = {
  // Buttons
  button: {
    primary: 'bg-[#8B1538] hover:bg-[#7A1230] text-white',
    secondary: 'bg-[#D4AF37] hover:bg-[#C19A2E] text-white',
    outline: 'border-2 border-[#8B1538] text-[#8B1538] hover:bg-[#8B1538] hover:text-white',
    ghost: 'text-[#8B1538] hover:bg-[#FDF2F4]',
  },
  
  // Accents (use sparingly)
  accent: {
    badge: 'bg-[#D4AF37] text-white',
    border: 'border-[#D4AF37]',
    text: 'text-[#D4AF37]',
    bgSubtle: 'bg-[#FAF6ED]',
  },
  
  // Primary (main brand color)
  primary: {
    badge: 'bg-[#8B1538] text-white',
    border: 'border-[#8B1538]',
    text: 'text-[#8B1538]',
    bgSubtle: 'bg-[#FDF2F4]',
  },
  
  // Focus states
  focus: 'focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]',
};

export default theme;

