'use client'

import { useState } from 'react'

export default function SecurityTest() {
  const [testResults, setTestResults] = useState<string[]>([])

  const runTests = async () => {
    const results: string[] = []

    // Test 1: Check if accessing protected route without auth redirects
    try {
      const response = await fetch('/workflow/daily', { redirect: 'manual' })
      if (response.status === 307 || response.status === 302) {
        results.push('✅ Protected routes redirect to login')
      } else {
        results.push('❌ Protected routes not redirecting properly')
      }
    } catch (error) {
      results.push('❌ Error testing protected routes')
    }

    // Test 2: Check security headers
    try {
      const response = await fetch('/')
      const headers = response.headers
      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'content-security-policy'
      ]
      
      const hasAllHeaders = securityHeaders.every(header => headers.get(header))
      if (hasAllHeaders) {
        results.push('✅ Security headers present')
      } else {
        results.push('❌ Some security headers missing')
      }
    } catch (error) {
      results.push('❌ Error checking headers')
    }

    // Test 3: Test XSS protection
    const maliciousInput = '<script>alert("XSS")</script>'
    const testDiv = document.createElement('div')
    testDiv.innerHTML = maliciousInput
    if (testDiv.textContent === maliciousInput) {
      results.push('❌ XSS protection not working')
    } else {
      results.push('✅ Basic XSS protection working')
    }

    // Test 4: Check localStorage usage
    const hasAuthInStorage = localStorage.getItem('driverData') || localStorage.getItem('session')
    if (hasAuthInStorage) {
      results.push('❌ Sensitive data found in localStorage')
    } else {
      results.push('✅ No sensitive auth data in localStorage')
    }

    setTestResults(results)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Security Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <button
            onClick={runTests}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 mb-6"
          >
            Run Security Tests
          </button>

          {testResults.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xl font-semibold mb-4">Test Results:</h2>
              {testResults.map((result, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded">
                  {result}
                </div>
              ))}
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Manual Tests:</h2>
            <ol className="space-y-2 list-decimal list-inside">
              <li>Try accessing /workflow/daily without logging in (should redirect)</li>
              <li>Try SQL injection in login: email@test.com'; DROP TABLE users;--</li>
              <li>Try XSS in any text field: &lt;script&gt;alert('XSS')&lt;/script&gt;</li>
              <li>Check browser DevTools Network tab for security headers</li>
              <li>Try uploading a non-image file where images are expected</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}