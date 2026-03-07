/**
 * Shared Admin API Client
 *
 * For remaining GET calls and any mutations that can't use Server Actions
 * (webhooks, cron, public API endpoints).
 *
 * Automatically includes CSRF token and Content-Type headers.
 * Extracts error messages from response body.
 */

import { getCSRFToken } from '@/lib/utils/fetch-utils'

async function request<T>(
  method: string,
  url: string,
  data?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Include CSRF token for mutations (client-side only)
  if (method !== 'GET' && typeof document !== 'undefined') {
    const csrfToken = getCSRFToken()
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message =
      typeof body.error === 'string'
        ? body.error
        : body.error?.message || `Request failed: ${res.status}`
    throw new Error(message)
  }

  return res.json()
}

export const adminApi = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, data: unknown) => request<T>('POST', url, data),
  put: <T>(url: string, data: unknown) => request<T>('PUT', url, data),
  patch: <T>(url: string, data: unknown) => request<T>('PATCH', url, data),
  delete: <T>(url: string) => request<T>('DELETE', url),
}
