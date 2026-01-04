import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

// Standard API response format
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Session type from our cookie-based auth
interface Session {
  email: string;
  userId: string;
  name: string;
}

// Create a success response
export function successResponse<T>(
  data: T, 
  message?: string,
  cacheSeconds?: number
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
  
  const headers: HeadersInit = {};
  
  // Add caching headers if specified
  if (cacheSeconds && cacheSeconds > 0) {
    headers['Cache-Control'] = `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 5}`;
  }
  
  return NextResponse.json(response, { status: 200, headers });
}

// Create an error response
export function errorResponse(error: string, status: number = 400): NextResponse {
  const response: ApiResponse<undefined> = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(response, { status });
}

// Auth middleware - uses cookie-based session
export async function requireAuth(): Promise<Session | NextResponse> {
  try {
    const session = await getServerSession();
    if (!session) {
      return errorResponse('Unauthorized - Please login', 401);
    }
    return session;
  } catch (_error) {
    return errorResponse('Authentication failed', 401);
  }
}

// Optional auth - returns session or null, doesn't throw
export async function getOptionalAuth(): Promise<Session | null> {
  try {
    const session = await getServerSession();
    return session;
  } catch {
    return null;
  }
}

// Request body validation helper
export async function parseRequestBody<T>(request: NextRequest): Promise<T | null> {
  try {
    const body = await request.json();
    return body as T;
  } catch (_error) {
    return null;
  }
}

// Validate required fields
export function validateRequiredFields(data: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

// Validate field types
export function validateFieldTypes(data: Record<string, unknown>, types: { [key: string]: string }): string | null {
  for (const [field, expectedType] of Object.entries(types)) {
    if (data[field] !== undefined && typeof data[field] !== expectedType) {
      return `Invalid type for field ${field}: expected ${expectedType}, got ${typeof data[field]}`;
    }
  }
  return null;
}

// Database error type
interface DatabaseError {
  code?: string;
  message?: string;
}

// Format database errors for API response
export function formatDatabaseError(error: unknown): string {
  const dbError = error as DatabaseError;
  if (dbError.code === '23505') {
    // Unique violation
    return 'Record already exists';
  }
  if (dbError.code === '23503') {
    // Foreign key violation
    return 'Related record not found';
  }
  if (dbError.code === '22P02') {
    // Invalid text representation
    return 'Invalid data format';
  }
  if (dbError.code === '23502') {
    // Not null violation
    return 'Required field is missing';
  }
  if (dbError.code === '22001') {
    // String data right truncation
    return 'Input value is too long';
  }
  return 'Database operation failed';
}

// CORS headers for API routes
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

// Handle OPTIONS requests for CORS
export function handleOptions(): NextResponse {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// Log API requests (for debugging)
export function logApiRequest(method: string, path: string, userId?: string, body?: unknown): void {
  logger.debug('API Request', {
    method,
    path,
    userId,
    body: body ? body : undefined
  });
}

// Rate limiting helper (simple in-memory store)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, maxRequests: number = 60, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userLimit = requestCounts.get(identifier);

  if (!userLimit || now > userLimit.resetTime) {
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Clear rate limit for a specific identifier
export function clearRateLimit(identifier: string): void {
  requestCounts.delete(identifier);
}

// Pagination helper
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function getPaginationParams(request: NextRequest): PaginationParams {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  
  // Ensure valid values
  const validPage = Math.max(1, page);
  const validLimit = Math.min(100, Math.max(1, limit));
  
  return {
    page: validPage,
    limit: validLimit,
    offset: (validPage - 1) * validLimit,
  };
}

// Build pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function buildPaginationMeta(params: PaginationParams, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / params.limit);
  
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
    hasNext: params.page < totalPages,
    hasPrev: params.page > 1,
  };
}

// Date validation helper
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// Date range validation
export function isValidDateRange(startDate: string, endDate: string): boolean {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return false;
  }
  return new Date(startDate) <= new Date(endDate);
}

// Format date for database queries
export function formatDateForDB(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

// Sanitize user input
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number format (US)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?1?\d{10,14}$/;
  const cleaned = phone.replace(/[\s()-]/g, '');
  return phoneRegex.test(cleaned);
}

// Generate a random ID (for temporary use)
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Sleep helper for testing
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Format error for consistent API responses
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

// Helper to build API URL for internal calls
export function buildApiUrl(path: string, params?: Record<string, string>): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const url = new URL(path, baseUrl);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  return url.toString();
}

// Validate object against schema (simple version)
export interface FieldSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: unknown[];
}

export function validateSchema(data: Record<string, unknown>, schema: Record<string, FieldSchema>): string | null {
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      return `${field} is required`;
    }
    
    // Skip validation if not required and not present
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }
    
    // Check type
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rules.type) {
      return `${field} must be of type ${rules.type}`;
    }
    
    // Check string length
    if (rules.type === 'string' && typeof value === 'string') {
      if (rules.min !== undefined && value.length < rules.min) {
        return `${field} must be at least ${rules.min} characters`;
      }
      if (rules.max !== undefined && value.length > rules.max) {
        return `${field} must not exceed ${rules.max} characters`;
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        return `${field} has invalid format`;
      }
    }
    
    // Check number range
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        return `${field} must be at least ${rules.min}`;
      }
      if (rules.max !== undefined && value > rules.max) {
        return `${field} must not exceed ${rules.max}`;
      }
    }
    
    // Check enum values
    if (rules.enum && !rules.enum.includes(value)) {
      return `${field} must be one of: ${rules.enum.join(', ')}`;
    }
  }
  
  return null;
}