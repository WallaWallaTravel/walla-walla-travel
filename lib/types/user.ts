/**
 * User Type Definitions
 *
 * Centralized user, driver, and admin types for the Walla Walla Travel system.
 * Matches database schema: users table
 */

/**
 * User role in the system
 */
export type UserRole = 'driver' | 'admin' | 'supervisor';

/**
 * Base user profile (from database)
 * Matches users table schema
 */
export interface User {
  /** Unique user identifier */
  id: number;
  /** User email address (unique) */
  email: string;
  /** User full name */
  name: string;
  /** User role (driver, admin, supervisor) */
  role: UserRole;
  /** Whether the user account is active */
  is_active: boolean;
  /** Last login timestamp */
  last_login?: string;
  /** Account creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

/**
 * User profile for UI display
 * Simplified view for frontend components
 */
export interface UserProfile {
  /** User identifier */
  id: number;
  /** User full name */
  name: string;
  /** User email address */
  email: string;
  /** User role */
  role: UserRole;
}

/**
 * Driver profile with additional fields
 * Extends User with driver-specific properties
 */
export interface Driver extends User {
  /** Role is always 'driver' for drivers */
  role: 'driver';
  /** Assigned vehicle ID (if any) */
  assigned_vehicle_id?: number;
}

/**
 * Admin/Supervisor profile
 * Admin and supervisor users have elevated permissions
 */
export interface Admin extends User {
  /** Role is either 'admin' or 'supervisor' */
  role: 'admin' | 'supervisor';
}

/**
 * Session data stored in cookies
 * Used for authentication and authorization
 */
export interface SessionData {
  /** User identifier (stored as string in JWT) */
  userId: string;
  /** User email address */
  email: string;
  /** User role */
  role: string;
  /** Whether user is currently logged in */
  isLoggedIn: boolean;
}

/**
 * Admin session with typed role
 * Used for admin/supervisor authentication
 */
export interface AdminSession {
  /** User identifier (string for JWT compatibility) */
  userId: string;
  /** User email address */
  email: string;
  /** User full name */
  name: string;
  /** User role (admin or supervisor) */
  role: 'admin' | 'supervisor' | 'driver';
}

/**
 * Login credentials
 * Used for authentication requests
 */
export interface LoginCredentials {
  /** User email address */
  email: string;
  /** User password (plain text, hashed on server) */
  password: string;
}

/**
 * User creation data
 * Used when creating new users
 */
export interface CreateUserData {
  /** User email address (unique) */
  email: string;
  /** User password (will be hashed) */
  password: string;
  /** User full name */
  name: string;
  /** User role (defaults to 'driver') */
  role?: UserRole;
}

/**
 * User update data
 * Used when updating user information
 */
export interface UpdateUserData {
  /** Updated email address */
  email?: string;
  /** Updated full name */
  name?: string;
  /** Updated role */
  role?: UserRole;
  /** Updated active status */
  is_active?: boolean;
}
