/**
 * useDataFetch Hook
 * 
 * Custom hook for data fetching with loading states, caching, and automatic retries.
 * Provides a consistent interface for API calls with built-in error handling.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, ApiResponse } from '@/lib/utils/fetch-utils';
import { logger } from '@/lib/logger';

export interface UseDataFetchOptions {
  enabled?: boolean;
  cache?: boolean;
  cacheDuration?: number; // in milliseconds
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  retry?: number;
  retryDelay?: number;
}

export interface UseDataFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  mutate: (newData: T | ((prev: T | null) => T)) => void;
}

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();

export function useDataFetch<T = any>(
  url: string | null,
  options: UseDataFetchOptions = {}
): UseDataFetchReturn<T> {
  const {
    enabled = true,
    cache: useCache = true,
    cacheDuration = 5 * 60 * 1000, // 5 minutes default
    refetchOnMount = false,
    refetchOnWindowFocus = false,
    retry = 0,
    retryDelay = 1000,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const fetchCount = useRef(0);

  /**
   * Fetch data from API
   */
  const fetchData = useCallback(async (retryCount = 0): Promise<void> => {
    if (!url || !enabled) {
      setLoading(false);
      return;
    }

    // Check cache first
    if (useCache) {
      const cached = cache.get(url);
      if (cached && Date.now() - cached.timestamp < cacheDuration) {
        setData(cached.data);
        setLoading(false);
        setError(null);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result: ApiResponse<T> = await apiGet(url);

      if (!isMounted.current) return;

      if (result.success && result.data) {
        setData(result.data);
        setError(null);

        // Update cache
        if (useCache) {
          cache.set(url, {
            data: result.data,
            timestamp: Date.now(),
          });
        }
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      if (!isMounted.current) return;

      const errorMessage = err instanceof Error ? err.message : 'An error occurred';

      // Retry logic
      if (retryCount < retry) {
        setTimeout(() => {
          if (isMounted.current) {
            fetchData(retryCount + 1);
          }
        }, retryDelay * Math.pow(2, retryCount)); // Exponential backoff
        return;
      }

      setError(errorMessage);
      logger.error('Data fetch error', { error: errorMessage });
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [url, enabled, useCache, cacheDuration, retry, retryDelay]);

  /**
   * Refetch data (bypassing cache)
   */
  const refetch = useCallback(async () => {
    if (!url) return;

    // Clear cache for this URL
    cache.delete(url);
    
    await fetchData();
  }, [url, fetchData]);

  /**
   * Manually update data (optimistic updates)
   */
  const mutate = useCallback((newData: T | ((prev: T | null) => T)) => {
    if (typeof newData === 'function') {
      setData(prev => (newData as (prev: T | null) => T)(prev));
    } else {
      setData(newData);
    }

    // Update cache
    if (url && useCache) {
      cache.set(url, {
        data: newData,
        timestamp: Date.now(),
      });
    }
  }, [url, useCache]);

  /**
   * Fetch on mount or when dependencies change
   */
  useEffect(() => {
    if (enabled) {
      fetchCount.current += 1;
      
      // Only fetch on mount if refetchOnMount is true, or if it's the first fetch
      if (refetchOnMount || fetchCount.current === 1) {
        fetchData();
      }
    }
  }, [url, enabled, refetchOnMount, fetchData]);

  /**
   * Refetch on window focus
   */
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (enabled && url) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, url, fetchData]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    mutate,
  };
}

/**
 * Clear all cache
 */
export function clearCache() {
  cache.clear();
}

/**
 * Clear cache for specific URL
 */
export function clearCacheFor(url: string) {
  cache.delete(url);
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}




