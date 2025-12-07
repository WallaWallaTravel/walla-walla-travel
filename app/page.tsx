import Link from 'next/link';

/**
 * App Landing Page
 * 
 * This is the web application at app.wallawalla.travel
 * The marketing website lives at wallawalla.travel (Webflow)
 * 
 * This page provides quick access to app functions for users
 * who land directly on the app subdomain.
 */
export default function AppLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Simple Header */}
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#E07A5F] rounded flex items-center justify-center">
              <span className="text-white text-sm font-bold">W</span>
            </div>
            <span className="font-medium text-slate-900">Walla Walla Travel</span>
            <span className="text-slate-400 text-sm ml-2">App</span>
          </div>
          <a 
            href="https://wallawalla.travel" 
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Visit Website →
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">
              Welcome to the App
            </h1>
            <p className="text-slate-600">
              Select where you need to go
            </p>
          </div>

          <div className="space-y-3">
            {/* Book a Tour */}
            <Link
              href="/book"
              className="block bg-white rounded-lg border border-slate-200 p-4 hover:border-[#E07A5F] hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#E07A5F] rounded-lg flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 group-hover:text-[#E07A5F]">Book a Tour</div>
                  <div className="text-sm text-slate-500">Reserve your wine country experience</div>
                </div>
                <svg className="w-5 h-5 text-slate-300 group-hover:text-[#E07A5F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* View My Booking */}
            <Link
              href="/client-portal"
              className="block bg-white rounded-lg border border-slate-200 p-4 hover:border-emerald-500 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 group-hover:text-emerald-600">View My Booking</div>
                  <div className="text-sm text-slate-500">Check details or make changes</div>
                </div>
                <svg className="w-5 h-5 text-slate-300 group-hover:text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* Corporate Request */}
            <Link
              href="/corporate"
              className="block bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-400 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 group-hover:text-slate-700">Corporate Events</div>
                  <div className="text-sm text-slate-500">Request a custom group experience</div>
                </div>
                <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>

          {/* Staff Links */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-3 text-center">
              Staff Access
            </div>
            <div className="flex justify-center gap-6 text-sm">
              <Link href="/admin" className="text-slate-500 hover:text-slate-700">
                Admin Portal
              </Link>
              <Link href="/driver" className="text-slate-500 hover:text-slate-700">
                Driver Portal
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-slate-400">
        <p>Part of the Walla Walla Travel platform</p>
      </footer>
    </div>
  );
}
