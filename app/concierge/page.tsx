'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

// ============================================================================
// Types
// ============================================================================

interface ServiceCard {
  title: string;
  description: string;
  icon: string;
  features: string[];
  cta: string;
  href: string;
  primary?: boolean;
}

// ============================================================================
// Data
// ============================================================================

const SERVICES: ServiceCard[] = [
  {
    title: "Explore On Your Own",
    description: "Curated recommendations with insider tips—plan at your own pace.",
    icon: "🗺️",
    features: [
      "Handpicked lodging options",
      "Restaurant recommendations",
      "Winery suggestions by style",
      "Local activities & experiences",
    ],
    cta: "Browse Recommendations",
    href: "/explore",
  },
  {
    title: "Full Trip Planning",
    description: "Let us handle everything—you just show up and enjoy.",
    icon: "✨",
    features: [
      "Custom itinerary creation",
      "All reservations & appointments",
      "Local transportation arranged",
      "Concierge support during trip",
    ],
    cta: "Schedule a Call",
    href: "/contact?service=full-planning",
    primary: true,
  },
];

// ============================================================================
// Components
// ============================================================================

function ServiceCardComponent({ service }: { service: ServiceCard }) {
  return (
    <div
      className={`rounded-2xl p-6 ${
        service.primary
          ? 'bg-purple-600 text-white'
          : 'bg-white border-2 border-purple-100'
      }`}
    >
      <div className="text-4xl mb-4">{service.icon}</div>
      <h3 className={`text-xl font-bold mb-2 ${service.primary ? 'text-white' : 'text-gray-900'}`}>
        {service.title}
      </h3>
      <p className={`mb-4 ${service.primary ? 'text-purple-100' : 'text-gray-600'}`}>
        {service.description}
      </p>
      <ul className="space-y-2 mb-6">
        {service.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={service.primary ? 'text-purple-200' : 'text-purple-600'}>✓</span>
            <span className={service.primary ? 'text-purple-50' : 'text-gray-700'}>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href={service.href}
        className={`block w-full py-3 px-4 text-center font-semibold rounded-xl transition-colors ${
          service.primary
            ? 'bg-white text-purple-700 hover:bg-purple-50'
            : 'bg-purple-600 text-white hover:bg-purple-700'
        }`}
      >
        {service.cta}
      </Link>
    </div>
  );
}

function TripSummary() {
  const searchParams = useSearchParams();
  const guests = searchParams.get('guests');
  const dates = searchParams.get('dates');
  const occasion = searchParams.get('occasion');

  const hasDetails = guests || dates || occasion;

  if (!hasDetails) return null;

  return (
    <div className="bg-purple-50 rounded-xl p-4 mb-8">
      <h3 className="text-sm font-semibold text-purple-900 mb-2">Your Trip Details</h3>
      <div className="flex flex-wrap gap-2">
        {guests && (
          <span className="px-3 py-1 bg-white rounded-full text-sm text-purple-700">
            👥 {guests} guests
          </span>
        )}
        {dates && (
          <span className="px-3 py-1 bg-white rounded-full text-sm text-purple-700">
            📅 {dates}
          </span>
        )}
        {occasion && (
          <span className="px-3 py-1 bg-white rounded-full text-sm text-purple-700">
            🎉 {occasion}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function ConciergeContent() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/chat" className="text-purple-600 hover:text-purple-700 text-sm mb-4 inline-block">
            ← Back to chat
          </Link>
          <h1 className="text-3xl font-bold text-purple-900 mb-3">
            Plan Your Perfect Walla Walla Trip
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            Whether you want to explore independently or have us handle every detail,
            we&apos;ve got you covered.
          </p>
        </div>

        {/* Trip Summary from chat */}
        <TripSummary />

        {/* Service Options */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {SERVICES.map((service) => (
            <ServiceCardComponent key={service.title} service={service} />
          ))}
        </div>

        {/* Trust Signals */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">Trusted by visitors since 2019</p>
          <div className="flex justify-center gap-8 text-gray-400">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">500+</div>
              <div className="text-xs">Happy Guests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">50+</div>
              <div className="text-xs">Partner Wineries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">5★</div>
              <div className="text-xs">Average Rating</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConciergePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-purple-50 to-white" />}>
      <ConciergeContent />
    </Suspense>
  );
}
