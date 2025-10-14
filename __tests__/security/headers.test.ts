/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server'
import nextConfig from '@/next.config'

describe('Security Headers', () => {
  let headers: any

  beforeAll(async () => {
    if (nextConfig.headers) {
      const headerConfig = await nextConfig.headers()
      headers = headerConfig[0].headers
    }
  })

  it('should include X-Frame-Options header', () => {
    const xFrameOptions = headers.find((h: any) => h.key === 'X-Frame-Options')
    expect(xFrameOptions).toBeDefined()
    expect(xFrameOptions.value).toBe('DENY')
  })

  it('should include X-Content-Type-Options header', () => {
    const xContentType = headers.find((h: any) => h.key === 'X-Content-Type-Options')
    expect(xContentType).toBeDefined()
    expect(xContentType.value).toBe('nosniff')
  })

  it('should include X-XSS-Protection header', () => {
    const xssProtection = headers.find((h: any) => h.key === 'X-XSS-Protection')
    expect(xssProtection).toBeDefined()
    expect(xssProtection.value).toBe('1; mode=block')
  })

  it('should include Content-Security-Policy', () => {
    const csp = headers.find((h: any) => h.key === 'Content-Security-Policy')
    expect(csp).toBeDefined()
    expect(csp.value).toContain("default-src 'self'")
    expect(csp.value).toContain("frame-ancestors 'none'")
  })

  it('should include Referrer-Policy', () => {
    const referrer = headers.find((h: any) => h.key === 'Referrer-Policy')
    expect(referrer).toBeDefined()
    expect(referrer.value).toBe('strict-origin-when-cross-origin')
  })

  it('should include Permissions-Policy', () => {
    const permissions = headers.find((h: any) => h.key === 'Permissions-Policy')
    expect(permissions).toBeDefined()
    expect(permissions.value).toContain('camera=()')
    expect(permissions.value).toContain('microphone=()')
  })
})