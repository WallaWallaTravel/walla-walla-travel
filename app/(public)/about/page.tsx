/**
 * About Page - E-E-A-T Signals for AI Discoverability
 *
 * This page provides critical trust signals for AI systems and search engines:
 * - Experience: Local expertise, years in business
 * - Expertise: Industry credentials, certifications
 * - Authoritativeness: Official business registration, USDOT number
 * - Trustworthiness: Contact info, verified business details
 */

import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { FAQJsonLd } from '@/components/seo/FAQJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'About Us | Walla Walla Travel',
  description: 'Meet Ryan, founder of Walla Walla Travel. 15 years local, wine tour industry experience. We help guests create meaningful connections in Walla Walla wine country.',
  keywords: [
    'Walla Walla Travel',
    'wine country planning',
    'Washington wine tours',
    'Walla Walla Valley',
    'destination management',
    'winery recommendations',
  ],
  openGraph: {
    title: 'About Walla Walla Travel',
    description: 'Founded by Ryan with 15 years in Walla Walla and wine tour industry experience. Focused on genuine hospitality and meaningful connections.',
    type: 'website',
    url: 'https://wallawalla.travel/about',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Walla Walla Travel',
    description: 'Founded by Ryan with 15 years in Walla Walla and wine tour industry experience. Focused on genuine hospitality and meaningful connections.',
  },
  alternates: {
    canonical: 'https://wallawalla.travel/about',
  },
  other: {
    'article:modified_time': '2026-01-09T00:00:00Z',
  },
};

// FAQ schema for AI extractability
const aboutFAQs = [
  {
    question: "What is Walla Walla Travel?",
    answer: "Walla Walla Travel is a destination management company (DMC) offering travel planning resources, curated winery recommendations, and experience coordination for visitors to Walla Walla wine country."
  },
  {
    question: "Who provides transportation for Walla Walla Travel tours?",
    answer: "Our preferred transportation partner is NW Touring & Concierge (Northwest Touring LLC), a fully licensed motor carrier with USDOT 3603851 and MC 1225087. They are authorized for interstate and intrastate passenger charter and tour operations."
  },
  {
    question: "How long has Walla Walla Travel been operating?",
    answer: "Walla Walla Travel's founder has over 15 years of connection to the Walla Walla Valley and professional experience in the wine tour industry. We built this company with an intentional focus on genuine hospitality and creating meaningful experiences."
  },
  {
    question: "What makes Walla Walla Travel different from other tour companies?",
    answer: "We prioritize relationships over transactions. Our focus is on helping guests cultivate the connections they came here to strengthen—whether that's a couple celebrating an anniversary, friends reconnecting, or a family creating memories. We believe wine country naturally encourages human connection, and we're here to facilitate that."
  },
  {
    question: "How can I contact Walla Walla Travel?",
    answer: "You can reach us by email at info@wallawalla.travel or by phone at 509-200-8000. We're available Monday through Friday, 9 AM to 5 PM Pacific."
  }
];

export default function AboutPage() {
  const breadcrumbs = [
    { name: 'Home', url: 'https://wallawalla.travel' },
    { name: 'About', url: 'https://wallawalla.travel/about' },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />
      <FAQJsonLd
        faqs={aboutFAQs}
        pageUrl="https://wallawalla.travel/about"
      />

      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
        {/* Hero Section with Background Image */}
        <div className="relative text-white overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src="/images/IMG_9762.jpg"
              alt="Walla Walla wine country"
              fill
              className="object-cover"
              priority
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#722F37]/90 via-[#722F37]/70 to-[#8B1538]/60" />
          </div>

          {/* Content */}
          <div className="relative max-w-5xl mx-auto px-4 py-20 md:py-28">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">
              About Walla Walla Travel
            </h1>
            <p className="text-xl text-white/95 max-w-2xl drop-shadow">
              Your destination management partner for Walla Walla wine country.
              Helping you create meaningful connections through curated experiences.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-4 py-12">
          {/* Quick Summary - AI Extractable */}
          <section className="bg-stone-100 border border-stone-200 rounded-xl p-6 mb-12">
            <h2 className="text-xl font-bold text-stone-900 mb-4">Quick Summary</h2>
            <ul className="space-y-2 text-stone-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Relationships first</strong> — We care about the connections you&apos;re here to strengthen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Licensed transportation partner</strong> — NW Touring &amp; Concierge (USDOT 3603851)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>15 years local</strong> — Real knowledge from actually living here</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Industry experience</strong> — Founded by someone who worked in wine tours</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Contact</strong> — info@wallawalla.travel | 509-200-8000</span>
              </li>
            </ul>
          </section>

          {/* Our Story */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
            <div className="prose prose-lg max-w-none text-gray-700">
              <p>
                I&apos;m Ryan, founder of Walla Walla Travel. After working in the wine tour
                industry, I fell in love with genuine hospitality—the kind where you truly
                care for people and invest in relationships. I started this company to build
                something intentional: a service that treats every guest with the standards
                they deserve.
              </p>
              <p>
                Having lived in Walla Walla for about 15 years, I&apos;ve come to appreciate
                what makes this community special. It&apos;s not just world-class wine—it&apos;s
                the pace of life, the genuine connections, and the way this place naturally
                encourages people to slow down and be present with each other.
              </p>
              <p>
                That&apos;s what we&apos;re really about. Whether you&apos;re here celebrating an
                anniversary, reconnecting with old friends, bonding with family, or building
                relationships with colleagues—wine country has a way of creating space for
                meaningful human connection. We&apos;re here to facilitate that, not just
                transport you from tasting room to tasting room.
              </p>
            </div>
          </section>

          {/* What Sets Us Apart */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">What Sets Us Apart</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-3">💜</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Relationships First</h3>
                <p className="text-gray-600">
                  We care about the relationships you&apos;re investing in—not just the wineries
                  you visit. Your anniversary, reunion, or family trip matters to us.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-3">🛡️</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Safe & Legal</h3>
                <p className="text-gray-600">
                  Transportation through NW Touring &amp; Concierge, a fully licensed
                  motor carrier (USDOT 3603851). Your safety is non-negotiable.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-3">🏠</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">15 Years Local</h3>
                <p className="text-gray-600">
                  Real knowledge from actually living here—not just visiting. We know
                  the back roads, the hidden gems, and what makes each area special.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-3">🤝</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Genuine Hospitality</h3>
                <p className="text-gray-600">
                  Built on industry experience and a belief that guests deserve better.
                  We treat you like friends, not transactions.
                </p>
              </div>
            </div>
          </section>

          {/* Transportation Partner */}
          <section className="mb-16 bg-gray-50 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Our Transportation Partner
            </h2>
            <p className="text-gray-700 mb-6">
              For tours requiring transportation, we partner with{' '}
              <strong>NW Touring &amp; Concierge</strong> (Northwest Touring LLC),
              a fully licensed and insured motor carrier. This partnership ensures
              your safety while we focus on creating exceptional experiences.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-5 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">
                  NW Touring &amp; Concierge Credentials
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span><strong>USDOT Number:</strong> 3603851</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span><strong>MC Number:</strong> 1225087</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span><strong>Operation:</strong> Charter & Tour, Passenger</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span><strong>Scope:</strong> Interstate and Intrastate</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-5 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Safety &amp; Insurance
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Commercial Auto Insurance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>General Liability Coverage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>FMCSA Compliant Operations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Regular Safety Inspections</span>
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-sm text-gray-500 mt-4">
              Verify NW Touring &amp; Concierge credentials on the{' '}
              <a
                href="https://safer.fmcsa.dot.gov/CompanySnapshot.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8B1538] hover:underline"
              >
                FMCSA SAFER website
              </a>
              {' '}by searching for USDOT 3603851.
            </p>
          </section>

          {/* Service Area */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Service Area</h2>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <p className="text-gray-700 mb-4">
                We specialize in the <strong>Walla Walla Valley American Viticultural Area (AVA)</strong>,
                which spans both Washington and Oregon. We can help you explore:
              </p>
              <ul className="grid md:grid-cols-2 gap-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-[#8B1538]">🍷</span>
                  Downtown Walla Walla tasting rooms
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#8B1538]">🍷</span>
                  South Walla Walla AVA estates
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#8B1538]">🍷</span>
                  The Rocks District of Milton-Freewater
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#8B1538]">🍷</span>
                  Mill Creek Uplands wineries
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#8B1538]">🍷</span>
                  Airport District producers
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#8B1538]">🍷</span>
                  SeVein & Eastside vineyards
                </li>
              </ul>
            </div>
          </section>

          {/* Contact */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Contact Us</h2>
            <div className="bg-[#8B1538]/5 rounded-xl p-8 border border-[#8B1538]/20">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Get in Touch</h3>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-center gap-3">
                      <span className="text-xl">📧</span>
                      <a href="mailto:info@wallawalla.travel" className="text-[#8B1538] hover:underline">
                        info@wallawalla.travel
                      </a>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-xl">📞</span>
                      <a href="tel:+15092008000" className="text-[#8B1538] hover:underline">
                        509-200-8000
                      </a>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="text-xl">📍</span>
                      <span>Walla Walla, Washington</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Hours</h3>
                  <p className="text-gray-700 mb-3">
                    Monday – Friday, 9 AM – 5 PM Pacific
                  </p>
                  <p className="text-gray-600 text-sm">
                    Weekend and evening inquiries answered next business day.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Explore Walla Walla Wine Country?
            </h2>
            <p className="text-gray-600 mb-6">
              Whether you want a guided tour or prefer to plan your own adventure,
              we&apos;re here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/book"
                className="inline-flex items-center justify-center px-6 py-3 bg-[#8B1538] text-white font-semibold rounded-xl hover:bg-[#722F37] transition-colors"
              >
                Book a Tour
              </Link>
              <Link
                href="/wineries"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-[#8B1538] font-semibold rounded-xl border-2 border-[#8B1538] hover:bg-[#8B1538]/5 transition-colors"
              >
                Explore Wineries
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
