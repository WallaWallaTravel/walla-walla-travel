/**
 * Authentication Validation Schemas
 *
 * Zod schemas for validating authentication-related inputs.
 * Built on top of the centralized User type definitions.
 *
 * @example
 * import { loginSchema, signupSchema } from '@/lib/validation/schemas/auth';
 *
 * const result = loginSchema.safeParse(data);
 * if (!result.success) {
 *   console.error(result.error.issues);
 * }
 */

import { z } from 'zod';
import type { UserRole } from '@/lib/types';

/**
 * Email validation with comprehensive checks
 */
const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must not exceed 255 characters')
  .toLowerCase()
  .trim();

/**
 * Password validation with security requirements
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must not exceed 100 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

/**
 * User role validation
 */
const roleSchema = z.enum(['admin', 'supervisor', 'driver'] as const, {
  message: 'Role must be one of: admin, supervisor, driver',
});

/**
 * Login request validation
 *
 * Validates user login credentials.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Password is required')
    .max(100, 'Password must not exceed 100 characters'),
});

/**
 * Signup/Register request validation
 *
 * Validates new user registration data.
 */
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim()
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  role: roleSchema.optional().default('driver'),
});

/**
 * Password reset request validation
 */
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

/**
 * Password reset confirmation validation
 */
export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * Profile update validation
 */
export const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim()
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  email: emailSchema.optional(),
  phone: z
    .string()
    .regex(
      /^\+?1?\d{10,14}$/,
      'Phone number must be 10-14 digits, optionally starting with +1'
    )
    .optional()
    .nullable(),
  emergency_contact_name: z
    .string()
    .min(2, 'Emergency contact name must be at least 2 characters')
    .max(100, 'Emergency contact name must not exceed 100 characters')
    .optional()
    .nullable(),
  emergency_contact_phone: z
    .string()
    .regex(
      /^\+?1?\d{10,14}$/,
      'Emergency contact phone must be 10-14 digits, optionally starting with +1'
    )
    .optional()
    .nullable(),
});

/**
 * Password change validation
 */
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

/**
 * Admin user creation validation
 */
export const adminCreateUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim()
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  role: roleSchema,
  license_number: z
    .string()
    .min(5, 'License number must be at least 5 characters')
    .max(50, 'License number must not exceed 50 characters')
    .optional()
    .nullable(),
  license_expiry: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'License expiry must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  phone: z
    .string()
    .regex(
      /^\+?1?\d{10,14}$/,
      'Phone number must be 10-14 digits, optionally starting with +1'
    )
    .optional()
    .nullable(),
  is_active: z.boolean().optional().default(true),
});

/**
 * Admin user update validation
 */
export const adminUpdateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim()
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  role: roleSchema.optional(),
  license_number: z
    .string()
    .min(5, 'License number must be at least 5 characters')
    .max(50, 'License number must not exceed 50 characters')
    .optional()
    .nullable(),
  license_expiry: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'License expiry must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  phone: z
    .string()
    .regex(
      /^\+?1?\d{10,14}$/,
      'Phone number must be 10-14 digits, optionally starting with +1'
    )
    .optional()
    .nullable(),
  is_active: z.boolean().optional(),
  emergency_contact_name: z
    .string()
    .min(2, 'Emergency contact name must be at least 2 characters')
    .max(100, 'Emergency contact name must not exceed 100 characters')
    .optional()
    .nullable(),
  emergency_contact_phone: z
    .string()
    .regex(
      /^\+?1?\d{10,14}$/,
      'Emergency contact phone must be 10-14 digits, optionally starting with +1'
    )
    .optional()
    .nullable(),
});

/**
 * Export TypeScript types inferred from Zod schemas
 * These can be used alongside the base types from @/lib/types
 */
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
