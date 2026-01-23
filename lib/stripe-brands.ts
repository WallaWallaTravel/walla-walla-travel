/**
 * Brand-Specific Stripe Configuration
 *
 * Each brand can have its own Stripe account for proper financial separation.
 * Falls back to default keys if brand-specific keys aren't configured.
 */

import Stripe from 'stripe';
import { logger } from './logger';

export interface BrandStripeConfig {
  brandId: number;
  brandName: string;
  secretKey: string;
  publishableKey: string;
}

/**
 * Get Stripe configuration for a specific brand
 */
export function getBrandStripeConfig(brandId?: number): BrandStripeConfig {
  // Brand 3: NW Touring & Concierge
  if (brandId === 3) {
    const secretKey = process.env.STRIPE_NWTOURING_SECRET_KEY;
    const publishableKey = process.env.STRIPE_NWTOURING_PUBLISHABLE_KEY;

    if (secretKey && publishableKey) {
      return {
        brandId: 3,
        brandName: 'NW Touring & Concierge',
        secretKey,
        publishableKey,
      };
    }
    logger.warn('NW Touring Stripe keys not configured, falling back to default');
  }

  // Brand 1: Walla Walla Travel
  if (brandId === 1) {
    const secretKey = process.env.STRIPE_WWT_SECRET_KEY;
    const publishableKey = process.env.STRIPE_WWT_PUBLISHABLE_KEY;

    if (secretKey && publishableKey) {
      return {
        brandId: 1,
        brandName: 'Walla Walla Travel',
        secretKey,
        publishableKey,
      };
    }
    logger.warn('Walla Walla Travel Stripe keys not configured, falling back to default');
  }

  // Default/fallback
  return {
    brandId: brandId || 0,
    brandName: 'Default',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  };
}

/**
 * Get a Stripe client instance for a specific brand
 */
export function getBrandStripeClient(brandId?: number): Stripe | null {
  const config = getBrandStripeConfig(brandId);

  if (!config.secretKey) {
    logger.error('No Stripe secret key available', { brandId });
    return null;
  }

  try {
    return new Stripe(config.secretKey, {
      apiVersion: '2025-10-29.clover',
    });
  } catch (error) {
    logger.error('Failed to create Stripe client', { brandId, error: String(error) });
    return null;
  }
}

/**
 * Get the publishable key for client-side use
 */
export function getBrandStripePublishableKey(brandId?: number): string {
  const config = getBrandStripeConfig(brandId);
  return config.publishableKey;
}
