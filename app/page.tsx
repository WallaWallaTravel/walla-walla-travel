import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-center mb-8">Travel Suite</h1>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Link 
            href="/login"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Driver Login</h2>
            <p className="text-gray-600">Access the driver portal and daily workflow</p>
          </Link>

          <Link 
            href="/security-test"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Security Test</h2>
            <p className="text-gray-600">Run security validation tests</p>
          </Link>

          <Link 
            href="/dashboard"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Dashboard</h2>
            <p className="text-gray-600">View driver dashboard (requires login)</p>
          </Link>

          <Link 
            href="/workflow/daily"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Daily Workflow</h2>
            <p className="text-gray-600">Access daily workflow (requires login)</p>
          </Link>
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Security Features Implemented:</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>✓ Server-side authentication with middleware protection</li>
            <li>✓ SQL injection prevention with parameterized queries</li>
            <li>✓ XSS protection with input sanitization</li>
            <li>✓ Security headers (CSP, X-Frame-Options, etc.)</li>
            <li>✓ Environment variable security</li>
          </ul>
        </div>
      </div>
    </div>
  )
}