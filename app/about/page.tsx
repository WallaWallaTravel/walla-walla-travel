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
import type { Metadata } from 'next';
import { FAQJsonLd } from '@/components/seo/FAQJsonLd';

export const metadata: Metadata = {
  title: 'About Us | Walla Walla Travel',
  description: 'Learn about Walla Walla Travel, your trusted local guide to Washington wine country. Licensed tour operator (USDOT 3603851) with deep local expertise.',
  keywords: [
    'Walla Walla Travel',
    'wine tour company',
    'Washington wine tours',
    'Walla Walla Valley',
    'licensed tour operator',
    'local wine experts',
  ],
  openGraph: {
    title: 'About Walla Walla Travel',
    description: 'Your trusted local guide to Washington wine country. Licensed, insured, and passionate about wine.',
    type: 'website',
    url: 'https://wallawalla.travel/about',
  },
  other: {
    'article:modified_time': '2025-12-30T00:00:00Z',
  },
};

// FAQ schema for AI extractability
const aboutFAQs = [
  {
    question: "Who operates Walla Walla Travel wine tours?",
    answer: "Walla Walla Travel is operated by Northwest Touring LLC, a licensed motor carrier with USDOT number 3603851 and MC number 1225087. We're authorized for interstate and intrastate passenger charter and tour operations in Washington State."
  },
  {
    question: "Is Walla Walla Travel a licensed tour company?",
    answer: "Yes, Walla Walla Travel operates under Northwest Touring LLC, which holds USDOT 3603851 and MC 1225087. We are fully licensed and insured for passenger charter and tour operations, with all required safety certifications."
  },
  {
    question: "How long has Walla Walla Travel been operating?",
    answer: "Walla Walla Travel has been providing wine country tours since 2023. Our team has lived in Walla Walla Valley for years and has deep relationships with local winemakers and hospitality partners."
  },
  {
    question: "What makes Walla Walla Travel different from other tour companies?",
    answer: "We combine local expertise with technology. Our team lives here, knows the winemakers personally, and can get you into experiences other tours can't. We also maintain the most comprehensive database of Walla Walla wineries with verified information and insider tips."
  },
  {
    question: "How can I contact Walla Walla Travel?",
    answer: "You can reach us by email at info@wallawalla.travel or by phone at 509-200-8000. We typically respond within 2 hours during business hours (9 AM - 5 PM Pacific, Monday-Friday)."
  }
];

export default function AboutPage() {
  return (
    <>
      <FAQJsonLd
        faqs={aboutFAQs}
        pageUrl="https://wallawalla.travel/about"
      />

      <div className="min-h-screen bg-gradient-to-b from-[#faf7f5] to-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#722F37] to-[#8B1538] text-white">
          <div className="max-w-5xl mx-auto px-4 py-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              About Walla Walla Travel
            </h1>
            <p className="text-xl text-white/90 max-w-2xl">
              Your trusted local guide to Washington&apos;s premier wine country.
              Licensed, insured, and passionate about wine.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-4 py-12">
          {/* Quick Summary - AI Extractable */}
          <section className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-12">
            <h2 className="text-xl font-bold text-blue-900 mb-4">Quick Summary</h2>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Local experts</strong> — We live in Walla Walla and know the winemakers personally</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Licensed transportation</strong> — USDOT 3603851, MC 1225087 (verify at FMCSA)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Verified winery data</strong> — 120+ wineries with confirmed hours, fees, and contact info</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Insider tips</strong> — Local knowledge from industry partners and years of experience</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Contact</strong> — info@wallawalla.travel | 509-200-8000 | Response within 2 hours</span>
              </li>
            </ul>
          </section>

          {/* Our Story */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
            <div className="prose prose-lg max-w-none text-gray-700">
              <p>
                Walla Walla Travel was born from a simple observation: visitors to
                our beautiful wine region often struggled to navigate the 120+
                wineries, find the hidden gems, and create meaningful experiences.
                We set out to change that.
              </p>
              <p>
                As locals who have spent years exploring every corner of the Walla
                Walla Valley AVA, we&apos;ve built relationships with winemakers, learned
                which back roads lead to the best views, and discovered the stories
                that make each winery unique. Now, we share that knowledge with you.
              </p>
              <p>
                What started as helping friends plan wine trips has grown into a
                comprehensive platform combining personalized tour services with
                technology-powered discovery. Whether you want a guided tour or prefer
                to explore on your own, we&apos;re here to help you experience Walla Walla
                wine country like a local.
              </p>
            </div>
          </section>

          {/* What Sets Us Apart */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">What Sets Us Apart</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-3">🏠</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Local Expertise</h3>
                <p className="text-gray-600">
                  We live here. We know the winemakers by name, the best times to visit
                  each tasting room, and the insider secrets that guidebooks miss.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-3">✅</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Verified Information</h3>
                <p className="text-gray-600">
                  Every winery in our directory has verified hours, tasting fees, and
                  contact information. No more showing up to find a closed tasting room.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-3">💡</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Insider Tips</h3>
                <p className="text-gray-600">
                  Beyond basic facts, we share the things locals know: which wine to ask
                  for, the best photo spots, and the hidden experiences worth seeking out.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-3">🛡️</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Fully Licensed</h3>
                <p className="text-gray-600">
                  We&apos;re not just enthusiasts—we&apos;re a licensed motor carrier with proper
                  insurance, safety certifications, and DOT compliance. Your safety matters.
                </p>
              </div>
            </div>
          </section>

          {/* Credentials & Trust */}
          <section className="mb-16 bg-gray-50 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Credentials & Compliance
            </h2>
            <p className="text-gray-700 mb-6">
              Walla Walla Travel operates under <strong>Northwest Touring LLC</strong>,
              a fully licensed and insured motor carrier authorized for passenger
              charter and tour operations.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-5 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Federal Motor Carrier Credentials
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
                  Safety & Insurance
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
              You can verify our credentials on the{' '}
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
                which spans both Washington and Oregon. Our tours cover:
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
                  <h3 className="font-semibold text-gray-900 mb-4">Response Time</h3>
                  <p className="text-gray-700 mb-3">
                    We typically respond within <strong>2 hours</strong> during business hours.
                  </p>
                  <p className="text-gray-600 text-sm">
                    <strong>Hours:</strong> Monday - Friday, 9 AM - 5 PM Pacific<br />
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
