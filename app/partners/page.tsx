import Link from 'next/link';

/**
 * Business Partners Portal
 * 
 * Entry point for wineries, restaurants, and other local businesses
 * to join the Walla Walla Travel network.
 * 
 * This would be shared via outreach emails to potential partners.
 */
export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-800 text-white py-6">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Walla Walla Travel</h1>
            <p className="text-slate-400 text-sm mt-1">Partner Network</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold text-slate-900 mb-4">
            Partner With Us
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Join our curated network of wineries, restaurants, and hospitality 
            businesses. We bring premium customers directly to your door.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Premium Clientele</h3>
            <p className="text-slate-600 text-sm">
              We work with discerning customers who value quality wine experiences
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Easy Scheduling</h3>
            <p className="text-slate-600 text-sm">
              We coordinate all visits and handle logistics seamlessly
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Zero Cost</h3>
            <p className="text-slate-600 text-sm">
              No fees or commissions - we bring customers, you handle the experience
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">
            Ready to Join?
          </h3>
          <p className="text-slate-600 mb-6">
            Fill out our quick registration form and we&apos;ll be in touch within 24 hours.
          </p>
          <Link
            href="/contribute"
            className="inline-flex items-center justify-center bg-slate-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-700 transition-colors"
          >
            Register Your Business
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* Existing Partners Login */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            Already a partner?{' '}
            <Link href="/partners/login" className="text-slate-800 font-medium hover:underline">
              Sign in to your dashboard
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-slate-500">
          <p>Questions? Contact us at partners@wallawalla.travel</p>
        </div>
      </footer>
    </div>
  );
}







