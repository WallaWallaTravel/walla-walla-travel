import Link from 'next/link';
import { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Plan Your Visit | Walla Walla Wine Country',
  description: 'Plan your perfect Walla Walla wine country trip. Get personalized help from our team or build your own itinerary with our trip planner.',
  keywords: [
    'Walla Walla wine tour planning',
    'wine country trip planner',
    'Walla Walla wine itinerary',
    'plan wine tasting trip',
    'Walla Walla travel planning',
  ],
  openGraph: {
    title: 'Plan Your Visit | Walla Walla Wine Country',
    description: 'Plan your perfect Walla Walla wine country trip. Get personalized help from our team or build your own itinerary.',
    type: 'website',
    url: 'https://wallawalla.travel/plan-your-visit',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Plan Your Visit | Walla Walla Wine Country',
    description: 'Plan your perfect Walla Walla wine country trip. Get personalized help from our team or build your own itinerary.',
  },
  alternates: {
    canonical: 'https://wallawalla.travel/plan-your-visit',
  },
};

export default function PlanYourVisitPage() {
  const breadcrumbs = [
    { name: 'Home', url: 'https://wallawalla.travel' },
    { name: 'Plan Your Visit', url: 'https://wallawalla.travel/plan-your-visit' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <BreadcrumbJsonLd items={breadcrumbs} />
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#8B1538] to-[#722F37] text-white py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Plan Your Visit
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
            Your Walla Walla wine country adventure awaits. Choose the planning style that works best for you.
          </p>
        </div>
      </div>

      {/* Two Pathways */}
      <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Guided Planning */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-transparent hover:border-[#8B1538]/20 transition-all">
            <div className="bg-[#8B1538]/5 p-6 md:p-8">
              <div className="w-16 h-16 bg-[#8B1538] rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Guided Planning
              </h2>
              <p className="text-gray-600">
                Let us handle the details
              </p>
            </div>

            <div className="p-6 md:p-8">
              <p className="text-gray-700 mb-6">
                Fill out a quick form and we&apos;ll call you to plan your perfect trip. Our local experts know the best wineries, the hidden gems, and exactly how to make your visit unforgettable.
              </p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>Personal service</strong> - talk to a real person who knows the area</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>Expert guidance</strong> - get insider recommendations</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>We call you</strong> - no waiting on hold or playing phone tag</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>Transportation available</strong> - luxury wine tour vehicles</span>
                </li>
              </ul>

              <Link
                href="/inquiry"
                className="block w-full text-center bg-[#8B1538] text-white px-6 py-4 rounded-xl font-semibold text-lg hover:bg-[#722F37] transition-colors"
              >
                Request a Call
              </Link>
            </div>
          </div>

          {/* Self-Planning */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-transparent hover:border-[#8B1538]/20 transition-all">
            <div className="bg-gray-100 p-6 md:p-8">
              <div className="w-16 h-16 bg-gray-700 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Self-Planning
              </h2>
              <p className="text-gray-600">
                Build your own adventure
              </p>
            </div>

            <div className="p-6 md:p-8">
              <p className="text-gray-700 mb-6">
                Use our interactive trip planner to discover wineries, save your favorites, and build your own custom itinerary. Perfect for those who love to explore and customize every detail.
              </p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>Full control</strong> - customize every aspect of your trip</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>AI suggestions</strong> - get smart recommendations based on your preferences</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>Share with your group</strong> - collaborate on planning with friends</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>Free to use</strong> - no commitment required</span>
                </li>
              </ul>

              <Link
                href="/my-trips"
                className="block w-full text-center bg-gray-700 text-white px-6 py-4 rounded-xl font-semibold text-lg hover:bg-gray-800 transition-colors"
              >
                Start Planning
              </Link>
            </div>
          </div>
        </div>

        {/* Not Sure Section */}
        <div className="mt-12 text-center">
          <div className="bg-white rounded-xl shadow p-6 md:p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Not sure which is right for you?
            </h3>
            <p className="text-gray-600 mb-4">
              Start with a call! Our team can help you figure out the best approach based on your group size, dates, and preferences. There&apos;s no obligation, and we&apos;re always happy to help.
            </p>
            <Link
              href="/inquiry"
              className="inline-flex items-center gap-2 text-[#8B1538] font-semibold hover:underline"
            >
              Request a call - it&apos;s free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Helpful Resources
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Link
              href="/wineries"
              className="flex items-center gap-4 p-4 bg-white rounded-xl shadow hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🍷</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Browse Wineries</div>
                <div className="text-sm text-gray-600">Explore 120+ wineries</div>
              </div>
            </Link>

            <Link
              href="/neighborhoods"
              className="flex items-center gap-4 p-4 bg-white rounded-xl shadow hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🗺️</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Wine Districts</div>
                <div className="text-sm text-gray-600">Discover the regions</div>
              </div>
            </Link>

            <Link
              href="/itineraries"
              className="flex items-center gap-4 p-4 bg-white rounded-xl shadow hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Sample Itineraries</div>
                <div className="text-sm text-gray-600">Get inspired</div>
              </div>
            </Link>

            <Link
              href="/guides"
              className="flex items-center gap-4 p-4 bg-white rounded-xl shadow hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">📖</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Travel Guides</div>
                <div className="text-sm text-gray-600">Tips and insights</div>
              </div>
            </Link>

            <Link
              href="/about/walla-walla-wine-facts"
              className="flex items-center gap-4 p-4 bg-white rounded-xl shadow hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🍇</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Wine Facts</div>
                <div className="text-sm text-gray-600">Learn about the region</div>
              </div>
            </Link>

            <Link
              href="/contact"
              className="flex items-center gap-4 p-4 bg-white rounded-xl shadow hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">💬</span>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Contact Us</div>
                <div className="text-sm text-gray-600">Questions? Get in touch</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
