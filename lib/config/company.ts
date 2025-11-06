/**
 * Company Contact Information
 * Central configuration for Walla Walla Travel contact details
 */

export const COMPANY_INFO = {
  name: 'Walla Walla Travel',
  tagline: 'Wine Country Tours & Transportation',
  
  // Contact Information
  phone: {
    display: '+1 (509) 200-8000',
    dialable: '+15092008000', // For tel: links
    formatted: '(509) 200-8000',
  },
  
  email: {
    general: 'info@wallawalla.travel',
    support: 'info@wallawalla.travel',
    bookings: 'info@wallawalla.travel',
  },
  
  // Physical Address
  address: {
    street: '', // Add if needed
    city: 'Walla Walla',
    state: 'WA',
    zip: '',
    full: 'Walla Walla, WA',
  },
  
  // Website
  website: {
    main: 'https://wallawalla.travel',
    booking: 'https://wallawalla.travel/book',
  },
  
  // Social Media (add as needed)
  social: {
    facebook: '',
    instagram: '',
    twitter: '',
  },
} as const;

/**
 * Helper function to create a clickable phone link
 */
export const getPhoneLink = () => `tel:${COMPANY_INFO.phone.dialable}`;

/**
 * Helper function to create a clickable email link
 */
export const getEmailLink = (subject?: string) => {
  const base = `mailto:${COMPANY_INFO.email.general}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
};

