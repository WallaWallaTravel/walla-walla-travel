/**
 * Security Configuration
 * 
 * Centralized security settings for the application.
 * Includes CORS, CSP, rate limiting, and other security measures.
 */

import { env } from './env';

/**
 * CORS Configuration
 */
export const corsConfig = {
  allowedOrigins: env.NODE_ENV === 'production'
    ? [
        'https://wallawalla.travel',
        'https://www.wallawalla.travel',
      ]
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
      ],
  
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
  ],
  
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  
  credentials: true,
  
  maxAge: 86400, // 24 hours
};

/**
 * Content Security Policy (CSP)
 */
export const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Required for Next.js
      "'unsafe-eval'",   // Required for Next.js dev
      'https://js.stripe.com',
      'https://maps.googleapis.com',
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for styled-jsx
      'https://fonts.googleapis.com',
    ],
    imgSrc: [
      "'self'",
      'data:',
      'https:',
      'blob:',
    ],
    fontSrc: [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
    ],
    connectSrc: [
      "'self'",
      'https://api.stripe.com',
      'https://maps.googleapis.com',
      'https://api.sentry.io',
      ...(env.NODE_ENV === 'development' ? ['ws:', 'wss:'] : []),
    ],
    frameSrc: [
      "'self'",
      'https://js.stripe.com',
      'https://hooks.stripe.com',
    ],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : undefined,
  },
};

/**
 * Rate Limiting Configuration
 */
export const rateLimitConfig = {
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many login attempts. Please try again later.',
  },
  
  // API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Too many requests. Please slow down.',
  },
  
  // File uploads
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    message: 'Upload limit reached. Please try again later.',
  },
  
  // Public endpoints
  public: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests.',
  },
};

/**
 * Session Configuration
 */
export const sessionConfig = {
  secret: env.JWT_SECRET || 'change-this-in-production',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  refreshThreshold: 60 * 60 * 1000, // Refresh if < 1 hour remaining
  secure: env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax' as const,
};

/**
 * Password Requirements
 */
export const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
};

/**
 * File Upload Security
 */
export const fileUploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  
  allowedMimeTypes: [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/webm',
  ],
  
  quarantineEnabled: false,
  virusScanEnabled: false, // Enable in production with ClamAV or similar
};

/**
 * API Key Configuration (Server-side only)
 * Uses process.env directly for optional API keys not in the env schema
 */
export const apiKeys = {
  google: {
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    aiApiKey: env.GOOGLE_AI_API_KEY,
    // Never expose API keys to client-side
    isServerOnly: true,
  },

  stripe: {
    publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, // Safe for client
    secretKey: env.STRIPE_SECRET_KEY, // Server-only
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET, // Server-only
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY, // Server-only
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID, // Server-only
    authToken: process.env.TWILIO_AUTH_TOKEN, // Server-only
    phoneNumber: process.env.TWILIO_PHONE_NUMBER, // Server-only
  },

  sentry: {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, // Safe for client
    authToken: process.env.SENTRY_AUTH_TOKEN, // Server-only
  },
};

/**
 * Input Sanitization Rules
 */
export const sanitizationRules = {
  allowedHtmlTags: [], // No HTML allowed by default
  maxInputLength: 10000, // 10k characters max
  stripScripts: true,
  stripStyles: true,
  stripComments: true,
};

/**
 * Security Headers
 */
export const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

/**
 * Trusted IPs (for admin access, if needed)
 */
export const trustedIPs = env.NODE_ENV === 'production'
  ? [
      // Add trusted IPs here for production
    ]
  : ['127.0.0.1', '::1']; // Localhost in development

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  return corsConfig.allowedOrigins.includes(origin);
}

/**
 * Check if IP is trusted
 */
export function isIPTrusted(ip: string): boolean {
  return trustedIPs.includes(ip);
}

/**
 * Get CSP header string
 */
export function getCSPHeader(): string {
  return Object.entries(cspConfig.directives)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => {
      const directive = key.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
      const values = Array.isArray(value) ? value.join(' ') : value;
      return `${directive} ${values}`;
    })
    .join('; ');
}




