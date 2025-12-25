/**
 * Environment Variable Validation
 * Validates all required environment variables at startup
 * Provides type-safe access to env vars
 */

import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  
  // API Keys (optional in development)
  RESEND_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  
  // App Configuration
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Optional API Keys
  DEEPGRAM_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  
  // Email Configuration
  FROM_EMAIL: z.string().email().default('noreply@wallawalla.travel'),
  
  // Security (optional in development, required in production)
  JWT_SECRET: z.string().min(32).optional(),
  CSRF_SECRET: z.string().min(32).optional(),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
  
  // Additional validation for production
  if (env.NODE_ENV === 'production') {
    if (!env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required in production');
    }
    if (!env.CSRF_SECRET) {
      throw new Error('CSRF_SECRET is required in production');
    }
  }
  
  console.log('✅ Environment variables validated successfully');
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    if (error.errors && Array.isArray(error.errors)) {
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
  } else {
    console.error('❌ Environment validation error:', error);
  }
  
  // Don't crash in development, but log the errors
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
  
  // Provide defaults for development
  env = {
    DATABASE_URL: process.env.DATABASE_URL || '',
    NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
    CSRF_SECRET: process.env.CSRF_SECRET || 'dev-csrf-secret-change-in-production',
    FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@wallawalla.travel',
  } as Env;
}

export { env };

// Helper to check if we're in production
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';


