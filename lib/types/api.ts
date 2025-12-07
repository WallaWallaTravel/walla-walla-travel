/**
 * API Type Definitions
 *
 * Common API response patterns and utility types for the Walla Walla Travel system.
 * Used across all API routes for consistent response structures.
 */

/**
 * Standard API response wrapper
 * Generic type for all API responses
 */
export interface ApiResponse<T = unknown> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data (if successful) */
  data?: T;
  /** Error message (if failed) */
  error?: string;
  /** Additional message or context */
  message?: string;
  /** HTTP status code */
  statusCode?: number;
}

/**
 * Paginated API response
 * For endpoints that return lists of items with pagination
 */
export interface PaginatedResponse<T> {
  /** Array of items for current page */
  items: T[];
  /** Total number of items across all pages */
  total: number;
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Whether there are more pages available */
  hasMore: boolean;
  /** Total number of pages */
  totalPages: number;
}

/**
 * API error details
 * Structured error information for error handling
 */
export interface ApiError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** HTTP status code */
  statusCode: number;
  /** Additional error details or context */
  details?: unknown;
  /** Stack trace (only in development) */
  stack?: string;
}

/**
 * Status message for UI notifications
 * Used for toast messages and alerts
 */
export interface StatusMessage {
  /** Message type/severity */
  type: 'success' | 'error' | 'warning' | 'info';
  /** Message text to display */
  message: string;
  /** How long to show message (milliseconds) */
  duration?: number;
  /** Whether message can be dismissed */
  dismissible?: boolean;
  /** Optional suggestions or next steps */
  suggestions?: string[];
}

/**
 * Validation error
 * Field-specific validation error
 */
export interface ValidationError {
  /** Field name that failed validation */
  field: string;
  /** Validation error message */
  message: string;
  /** Error code for programmatic handling */
  code: string;
  /** Invalid value that was provided */
  value?: unknown;
}

/**
 * Request metadata
 * Tracking information for API requests
 */
export interface RequestMetadata {
  /** Request timestamp (ISO 8601) */
  timestamp: string;
  /** User ID making the request */
  userId?: number;
  /** Client IP address */
  ip?: string;
  /** User agent string */
  userAgent?: string;
  /** Request ID for tracing */
  requestId?: string;
}

/**
 * Bulk operation result
 * Result of operations affecting multiple items
 */
export interface BulkOperationResult<T = unknown> {
  /** Number of items successfully processed */
  successCount: number;
  /** Number of items that failed */
  failureCount: number;
  /** Total number of items attempted */
  totalCount: number;
  /** Successfully processed items */
  successful: T[];
  /** Failed items with error details */
  failed: Array<{
    item: T;
    error: string;
  }>;
}

/**
 * Upload result
 * Result of file upload operations
 */
export interface UploadResult {
  /** Uploaded file URL */
  url: string;
  /** File name */
  filename: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** Upload timestamp */
  uploadedAt: string;
}

/**
 * Search query parameters
 * Common search and filter parameters
 */
export interface SearchQuery {
  /** Search query string */
  query?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  pageSize?: number;
  /** Sort field */
  sortBy?: string;
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  /** Filter criteria */
  filters?: Record<string, unknown>;
}

/**
 * Date range filter
 * For filtering by date ranges
 */
export interface DateRangeFilter {
  /** Start date (ISO 8601 or YYYY-MM-DD) */
  startDate: string;
  /** End date (ISO 8601 or YYYY-MM-DD) */
  endDate: string;
}

/**
 * API request options
 * Configuration for API client requests
 */
export interface ApiRequestOptions {
  /** Request method */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: unknown;
  /** Query parameters */
  params?: Record<string, string | number | boolean>;
  /** Request timeout (milliseconds) */
  timeout?: number;
  /** Whether to include credentials */
  credentials?: 'include' | 'same-origin' | 'omit';
}
