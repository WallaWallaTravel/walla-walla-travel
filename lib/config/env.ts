/**
 * Environment Variable Validation
 * Validates all required environment variables at startup
 * Provides type-safe access to env vars
 * 
 * NOTE: Validation is lenient during build to support CI/CD where
 * secrets are only available at runtime
 */

import { z } from 'zod';

const envSchema = z.object({
  // Database - optional during build, required at runtime
  DATABASE_URL: z.string().optional(),
  
  // API Keys (optional)
  POSTMARK_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  
  // App Configuration
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Optional API Keys
  DEEPGRAM_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  
  // Email Configuration
  FROM_EMAIL: z.string().email().default('noreply@wallawalla.travel'),
  
  // Twilio SMS Configuration
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  
  // Security (validated at runtime, not build time)
  JWT_SECRET: z.string().optional(),
  CSRF_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

// Parse environment variables - lenient for build time
const parseResult = envSchema.safeParse(process.env);

let env: Env;

if (parseResult.success) {
  env = parseResult.data;
} else {
  // Log errors but don't crash during build
  console.warn('⚠️ Environment validation warnings:', parseResult.error.issues.map(i => i.message).join(', '));
  env = {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    JWT_SECRET: process.env.JWT_SECRET,
    CSRF_SECRET: process.env.CSRF_SECRET,
    FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@wallawalla.travel',
  } as Env;
}

export { env };

// Runtime validation function - call this in API routes/server components
export function validateRuntimeEnv(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }
  
  if (isProduction) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production');
    }
    if (!process.env.CSRF_SECRET || process.env.CSRF_SECRET.length < 32) {
      errors.push('CSRF_SECRET must be at least 32 characters in production');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.join(', ')}`);
  }
}

// Helper to check if we're in production
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
