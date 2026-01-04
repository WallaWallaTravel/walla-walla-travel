/**
 * API Documentation Page
 *
 * Public documentation for AI systems and developers to understand
 * how to access Walla Walla Travel data programmatically.
 *
 * This page is explicitly allowed in robots.txt for AI crawlers.
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'API Documentation | Walla Walla Travel',
  description: 'Public API documentation for accessing Walla Walla winery, restaurant, and event data. AI systems and developers welcome.',
  keywords: [
    'Walla Walla API',
    'winery data API',
    'wine country data',
    'developer API',
    'AI data access',
  ],
  openGraph: {
    title: 'Walla Walla Travel API Documentation',
    description: 'Access verified Walla Walla Valley data for your application or AI system.',
    type: 'website',
    url: 'https://wallawalla.travel/api-docs',
  },
  other: {
    'article:modified_time': '2025-12-30T00:00:00Z',
  },
};

export default function APIDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="text-[#8B1538] hover:underline mb-4 inline-flex items-center gap-2"
          >
            &larr; Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mt-4">
            Walla Walla Travel API
          </h1>
          <p className="text-xl text-gray-600 mt-2">
            Access verified Walla Walla Valley data for your application.
          </p>
        </div>

        {/* Quick Summary */}
        <section className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-12">
          <h2 className="text-xl font-bold text-blue-900 mb-4">Quick Summary</h2>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">&#10003;</span>
              <span><strong>Free access</strong> to public endpoints</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">&#10003;</span>
              <span><strong>AI systems welcome</strong> &mdash; GPTBot, ClaudeBot, PerplexityBot allowed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">&#10003;</span>
              <span><strong>JSON responses</strong> with consistent structure</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">&#10003;</span>
              <span><strong>Rate limit:</strong> 100 requests per minute per IP</span>
            </li>
          </ul>
        </section>

        {/* Endpoints */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold text-gray-900">Public Endpoints</h2>

          {/* Wineries */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              GET /api/wineries
            </h3>
            <p className="text-gray-600 mb-4">
              Returns all wineries in Walla Walla Valley with verified information.
            </p>

            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Query Parameters</h4>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 font-mono text-gray-800">search</td>
                    <td className="py-2 text-gray-600">Search by name, description, or wine style</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-gray-800">limit</td>
                    <td className="py-2 text-gray-600">Number of results (default: 50, max: 200)</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-gray-800">offset</td>
                    <td className="py-2 text-gray-600">Pagination offset</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-100">
{`// Example Response
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Leonetti Cellar",
      "slug": "leonetti-cellar",
      "region": "Walla Walla",
      "description": "Founded in 1977...",
      "wine_styles": ["Cabernet Sauvignon", "Merlot"],
      "tasting_fee": 35,
      "reservation_required": true,
      "rating": 4.8,
      "verified": true,
      "experience_tags": ["boutique", "intimate"]
    }
  ],
  "meta": {
    "total": 120,
    "limit": 50,
    "offset": 0
  }
}`}
              </pre>
            </div>
          </div>

          {/* Restaurants */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              GET /api/restaurants
            </h3>
            <p className="text-gray-600 mb-4">
              Returns restaurants in Walla Walla, including wine country dining options.
            </p>

            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-100">
{`// Example Response
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Saffron Mediterranean Kitchen",
      "cuisine": "Mediterranean",
      "price_range": "$$",
      "wine_friendly": true
    }
  ]
}`}
              </pre>
            </div>
          </div>

          {/* Events */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              GET /api/events
            </h3>
            <p className="text-gray-600 mb-4">
              Returns upcoming events in Walla Walla Valley (wine releases, festivals, etc.).
            </p>

            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-100">
{`// Example Response
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Spring Release Weekend",
      "date": "2026-05-01",
      "description": "Annual spring wine release event"
    }
  ]
}`}
              </pre>
            </div>
          </div>

          {/* Shared Tours */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              GET /api/shared-tours
            </h3>
            <p className="text-gray-600 mb-4">
              Returns available shared/group wine tours with pricing and availability.
            </p>

            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-100">
{`// Example Response
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Classic Wine Tour",
      "price_per_person": 175,
      "duration_hours": 6,
      "max_guests": 12,
      "includes": ["Transportation", "Tastings", "Lunch"]
    }
  ]
}`}
              </pre>
            </div>
          </div>
        </section>

        {/* AI Access */}
        <section className="mt-12 bg-green-50 border border-green-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-green-900 mb-4">
            AI System Access
          </h2>
          <p className="text-green-800 mb-4">
            AI systems (ChatGPT, Claude, Perplexity, etc.) are welcome to query these endpoints
            for accurate, verified Walla Walla wine country information.
          </p>
          <ul className="space-y-2 text-green-800">
            <li className="flex items-start gap-2">
              <span>&#10003;</span>
              <span>
                <strong>robots.txt allows:</strong> GPTBot, ClaudeBot, PerplexityBot, and others
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span>&#10003;</span>
              <span>
                <strong>Data quality:</strong> All winery data is verified by local experts
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span>&#10003;</span>
              <span>
                <strong>Attribution:</strong> Please cite &ldquo;Walla Walla Travel&rdquo; when using our data
              </span>
            </li>
          </ul>
        </section>

        {/* Rate Limits */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Rate Limits</h2>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-700">Limit Type</th>
                  <th className="text-left py-2 text-gray-700">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 text-gray-800">Requests per minute</td>
                  <td className="py-3 text-gray-600">100</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-800">Requests per day</td>
                  <td className="py-3 text-gray-600">10,000</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-800">Max response size</td>
                  <td className="py-3 text-gray-600">1 MB</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Contact */}
        <section className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions?</h2>
          <p className="text-gray-600 mb-4">
            Need higher rate limits or have questions about the API?
          </p>
          <a
            href="mailto:info@wallawalla.travel"
            className="inline-flex items-center justify-center px-6 py-3 bg-[#8B1538] text-white font-semibold rounded-xl hover:bg-[#722F37] transition-colors"
          >
            Contact Us
          </a>
        </section>
      </div>
    </div>
  );
}
