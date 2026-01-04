/**
 * Fetch Utilities
 *
 * Standardized fetch patterns to eliminate duplication across components.
 * Provides consistent error handling and response parsing.
 */

import { logger } from '@/lib/logger';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Base fetch wrapper with timeout and error handling
 */
async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

/**
 * GET request with automatic JSON parsing
 */
export async function apiGet<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
    return {
      success: true,
      data: data.data || data,
    };
  } catch (error) {
    logger.error('GET request failed', { url, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * POST request with automatic JSON parsing
 */
export async function apiPost<T = any>(
  url: string,
  body: any,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(body),
      ...options,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
    return {
      success: true,
      data: data.data || data,
      message: data.message,
    };
  } catch (error) {
    logger.error('POST request failed', { url, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * PUT request with automatic JSON parsing
 */
export async function apiPut<T = any>(
  url: string,
  body: any,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetchWithTimeout(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(body),
      ...options,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
    return {
      success: true,
      data: data.data || data,
      message: data.message,
    };
  } catch (error) {
    logger.error('PUT request failed', { url, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * DELETE request with automatic JSON parsing
 */
export async function apiDelete<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetchWithTimeout(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
    return {
      success: true,
      data: data.data || data,
      message: data.message,
    };
  } catch (error) {
    logger.error('DELETE request failed', { url, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upload file with progress tracking
 */
export async function apiUploadFile<T = any>(
  url: string,
  file: File,
  onProgress?: (progress: number) => void,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });
      
      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              success: true,
              data: data.data || data,
              message: data.message,
            });
          } else {
            resolve({
              success: false,
              error: data.error || `HTTP ${xhr.status}`,
            });
          }
        } catch (error) {
          reject(error);
        }
      });
      
      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: 'Network error',
        });
      });
      
      xhr.open('POST', url);
      Object.entries(options.headers || {}).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value as string);
      });
      
      xhr.send(formData);
    });
  } catch (error) {
    logger.error('File upload failed', { url, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch requests with Promise.all
 */
export async function apiBatch<T = any>(
  requests: Promise<ApiResponse<any>>[]
): Promise<ApiResponse<T[]>> {
  try {
    const results = await Promise.all(requests);

    const allSuccessful = results.every(r => r.success);
    const data = results.map(r => r.data);
    const errors = results.filter(r => !r.success).map(r => r.error);

    return {
      success: allSuccessful,
      data: data as T[],
      error: errors.length > 0 ? errors.join(', ') : undefined,
    };
  } catch (error) {
    logger.error('Batch request failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Retry a request with exponential backoff
 */
export async function apiRetry<T = any>(
  requestFn: () => Promise<ApiResponse<T>>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<ApiResponse<T>> {
  let lastError: string = '';
  
  for (let i = 0; i < maxRetries; i++) {
    const result = await requestFn();
    
    if (result.success) {
      return result;
    }
    
    lastError = result.error || 'Unknown error';
    
    if (i < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return {
    success: false,
    error: `Failed after ${maxRetries} retries: ${lastError}`,
  };
}




