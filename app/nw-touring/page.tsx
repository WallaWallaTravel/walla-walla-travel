"use client";

/**
 * NW Touring & Concierge - Landing Page
 * Professional, corporate, excellence-focused
 */

import Link from 'next/link';

export default function NWTouringLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] text-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              NW TOURING & CONCIERGE
            </h1>
            <div className="w-24 h-1 bg-blue-300 mb-6"></div>
            <p className="text-2xl md:text-3xl text-blue-200 font-light mb-6">
              Excellence in Corporate Transportation
            </p>
            <p className="text-lg text-blue-100 max-w-2xl">
              Professional wine country experiences, corporate events, and executive transportation 
              services in Washington's premier viticultural regions.
            </p>
          </div>
        </div>
        {/* Decorative grid pattern */}
        <div className="absolute top-0 right-0 w-full h-full opacity-5" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Trust Indicators */}
      <div className="bg-white border-b border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm text-slate-600">
            <div>
              <div className="font-bold text-[#1e40af] text-2xl mb-1">15+</div>
              <div>Years Experience</div>
            </div>
            <div>
              <div className="font-bold text-[#1e40af] text-2xl mb-1">DOT</div>
              <div>Compliant</div>
            </div>
            <div>
              <div className="font-bold text-[#1e40af] text-2xl mb-1">24/7</div>
              <div>Service Available</div>
            </div>
            <div>
              <div className="font-bold text-[#1e40af] text-2xl mb-1">100%</div>
              <div>Licensed & Insured</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        
        {/* Services Overview */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Professional Transportation Services
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Providing reliable, professional transportation for corporate events, wine country tours, 
              and executive travel throughout the Pacific Northwest.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Wine Country Tours */}
            <div className="bg-white border border-slate-200 p-8 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🍷</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Wine Country Tours
              </h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Expertly guided experiences through Walla Walla's premier wineries. Perfect for 
                corporate entertainment, client relations, and team building.
              </p>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-start">
                  <span className="text-[#1e40af] mr-2">✓</span>
                  <span>Customized itineraries</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#1e40af] mr-2">✓</span>
                  <span>Professional chauffeurs</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#1e40af] mr-2">✓</span>
                  <span>Luxury vehicles</span>
                </li>
              </ul>
            </div>

            {/* Corporate Events */}
            <div className="bg-white border border-slate-200 p-8 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🏢</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Corporate Events
              </h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Seamless transportation coordination for conferences, retreats, and corporate 
                gatherings. We handle logistics so you can focus on your event.
              </p>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-start">
                  <span className="text-[#1e40af] mr-2">✓</span>
                  <span>Multi-vehicle coordination</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#1e40af] mr-2">✓</span>
                  <span>Real-time tracking</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#1e40af] mr-2">✓</span>
                  <span>Dedicated account manager</span>
                </li>
              </ul>
            </div>

            {/* Airport Transfers */}
            <div className="bg-white border border-slate-200 p-8 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">✈️</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Executive Transfers
              </h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Professional airport and city transfers for executives and VIP clients. Reliable, 
                discreet service with flight monitoring and flexible scheduling.
              </p>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-start">
                  <span className="text-[#1e40af] mr-2">✓</span>
                  <span>SeaTac, Pasco, Walla Walla</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#1e40af] mr-2">✓</span>
                  <span>Flight tracking</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#1e40af] mr-2">✓</span>
                  <span>Meet & greet service</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Wine Tour Packages */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Wine Tour Packages
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              All-inclusive experiences with transportation, tasting fees, and insider access.
              Choose the pace that suits your group.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Classic Tasting */}
            <div className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden hover:border-[#1e40af] transition-colors">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900">Classic Tasting</h3>
                <p className="text-sm text-slate-500 mt-1">Perfect introduction to wine country</p>
              </div>
              <div className="p-6">
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-[#1e40af]">$500</span>
                  <span className="text-slate-500">/ group</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-sm text-slate-700">
                    <span className="text-[#1e40af] mr-2">◆</span>
                    <strong>4 hours</strong>&nbsp;of guided touring
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <span className="text-[#1e40af] mr-2">◆</span>
                    <strong>3-4 wineries</strong>&nbsp;hand-selected
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <span className="text-[#1e40af] mr-2">◆</span>
                    Up to 6 guests in premium SUV
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <span className="text-[#1e40af] mr-2">◆</span>
                    Tasting fees included
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <span className="text-[#1e40af] mr-2">◆</span>
                    Hotel pickup & drop-off
                  </li>
                </ul>
                <p className="text-xs text-slate-500 mb-4">
                  Ideal for: Couples, small groups, first-time visitors
                </p>
                <Link
                  href="/book?package=classic"
                  className="block w-full text-center bg-[#1e40af] text-white py-3 font-semibold hover:bg-[#1e3a8a] transition-colors"
                >
                  Book Classic Tour
                </Link>
              </div>
            </div>

            {/* Deep Dive - Most Popular */}
            <div className="bg-white border-2 border-[#1e40af] rounded-lg overflow-hidden relative shadow-lg">
              <div className="absolute top-0 right-0 bg-[#1e40af] text-white text-xs font-bold px-3 py-1">
                MOST POPULAR
              </div>
              <div className="bg-[#1e40af] px-6 py-4">
                <h3 className="text-xl font-bold text-white">Deep Dive</h3>
                <p className="text-sm text-blue-200 mt-1">The quintessential Walla Walla experience</p>
              </div>
              <div className="p-6">
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-[#1e40af]">$750</span>
                  <span className="text-slate-500">/ group</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-sm text-slate-700">
                    <span className="text-[#1e40af] mr-2">◆</span>
                    <strong>6 hours</strong>&nbsp;of curated touring
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <span className="text-[#1e40af] mr-2">◆</span>
                    <strong>4-5 wineries</strong>&nbsp;with varietals focus
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <span className="text-[#1e40af] mr-2">◆</span>
                    Up to 10 guests in Sprinter van
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <span className="text-[#1e40af] mr-2">◆</span>
                    Lunch at wine-country restaurant
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <span className="text-[#1e40af] mr-2">◆</span>
                    All tasting fees included
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <span className="text-[#1e40af] mr-2">◆</span>
                    Bottled water & snacks
                  </li>
                </ul>
                <p className="text-xs text-slate-500 mb-4">
                  Ideal for: Wine enthusiasts, groups of friends, celebrations
                </p>
                <Link
                  href="/book?package=deep-dive"
                  className="block w-full text-center bg-[#1e40af] text-white py-3 font-semibold hover:bg-[#1e3a8a] transition-colors"
                >
                  Book Deep Dive
                </Link>
              </div>
            </div>

            {/* Full Valley Experience */}
            <div className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden hover:border-[#1e40af] transition-colors">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900">Full Valley Experience</h3>
                <p className="text-sm text-slate-500 mt-1">The ultimate wine country immersion</p>
              </div>
              <div className="p-6">
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-[#1e40af]">$1,200</span>
                  <span className="text-slate-500">/ group</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center text-sm text-slate-700">
                    <span className="text-[#1e40af] mr-2">◆</span>
                    <strong>8 hours</strong>&nbsp;full-day adventure
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <span className="text-[#1e40af] mr-2">◆</span>
                    <strong>6-7 wineries</strong>&nbsp;across sub-regions
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <span className="text-[#1e40af] mr-2">◆</span>
                    Up to 14 guests in luxury Sprinter
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <span className="text-[#1e40af] mr-2">◆</span>
                    Gourmet lunch + afternoon snacks
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <span className="text-[#1e40af] mr-2">◆</span>
                    VIP access & behind-the-scenes
                  </li>
                  <li className="flex items-center text-sm text-slate-700">
                    <span className="text-[#1e40af] mr-2">◆</span>
                    Professional photos of your group
                  </li>
                </ul>
                <p className="text-xs text-slate-500 mb-4">
                  Ideal for: Corporate groups, special occasions, serious collectors
                </p>
                <Link
                  href="/book?package=full-valley"
                  className="block w-full text-center bg-[#1e40af] text-white py-3 font-semibold hover:bg-[#1e3a8a] transition-colors"
                >
                  Book Full Valley
                </Link>
              </div>
            </div>
          </div>

          {/* Custom Tours Note */}
          <div className="mt-8 text-center">
            <p className="text-slate-600">
              <strong>Need something different?</strong> We create custom itineraries for any group size or special request.
            </p>
            <Link
              href="/book?type=custom"
              className="inline-block mt-3 text-[#1e40af] font-semibold hover:underline"
            >
              Request Custom Tour →
            </Link>
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="bg-slate-100 border-l-4 border-[#1e40af] p-8 md:p-12 mb-20">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            Why Corporate Clients Choose NW Touring & Concierge
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-slate-900 mb-3 flex items-center">
                <span className="text-[#1e40af] mr-3 text-xl">●</span>
                Professional Excellence
              </h3>
              <p className="text-slate-700 ml-8">
                Our chauffeurs are professionally trained, background-checked, and maintain the highest 
                standards of service. We understand the importance of representing your organization well.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-3 flex items-center">
                <span className="text-[#1e40af] mr-3 text-xl">●</span>
                Reliability Guaranteed
              </h3>
              <p className="text-slate-700 ml-8">
                Punctuality and reliability are non-negotiable. Our fleet is meticulously maintained, 
                and we provide backup vehicles for every reservation to ensure zero downtime.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-3 flex items-center">
                <span className="text-[#1e40af] mr-3 text-xl">●</span>
                Transparent Pricing
              </h3>
              <p className="text-slate-700 ml-8">
                No hidden fees or surprises. We provide detailed quotes upfront and work within your 
                budget. Invoicing and payment terms designed for corporate accounts.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-3 flex items-center">
                <span className="text-[#1e40af] mr-3 text-xl">●</span>
                Local Expertise
              </h3>
              <p className="text-slate-700 ml-8">
                15+ years serving Walla Walla Valley means we know every winery, restaurant, and venue. 
                We provide recommendations and handle reservations seamlessly.
              </p>
            </div>
          </div>
        </div>

        {/* Fleet */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Our Fleet
            </h2>
            <p className="text-lg text-slate-600">
              Clean, comfortable, and professionally maintained vehicles
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Mercedes Sprinter Vans
              </h3>
              <p className="text-slate-600 mb-3">
                Luxury transportation for groups of 8-14. Leather seating, climate control, 
                premium audio system.
              </p>
              <p className="text-sm text-slate-500">
                Perfect for wine tours, corporate outings, and group transfers
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Premium SUVs
              </h3>
              <p className="text-slate-600 mb-3">
                Executive transportation for individuals and small groups up to 6 passengers. 
                Ideal for airport transfers and private tours.
              </p>
              <p className="text-sm text-slate-500">
                Perfect for executive travel and intimate wine experiences
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Request a Quote or Reservation
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto text-lg">
            Professional service. Reliable execution. Competitive pricing. 
            Contact us today to discuss your transportation needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book?brand=3"
              className="inline-block bg-white text-[#1e40af] px-10 py-4 text-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
            >
              Book Online
            </Link>
            <a
              href="tel:+15092008000"
              className="inline-block bg-blue-800 text-white px-10 py-4 text-lg font-semibold hover:bg-blue-900 transition-colors shadow-lg border-2 border-blue-300"
            >
              Call (509) 200-8000
            </a>
          </div>
          <p className="text-blue-200 text-sm mt-6">
            Email: info@nwtc.com • 24/7 service available for corporate clients
          </p>
        </div>

        {/* Corporate Accounts */}
        <div className="mt-16 bg-slate-100 p-8 text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-3">
            Corporate Accounts Available
          </h3>
          <p className="text-slate-600 mb-4">
            Establish a corporate account for streamlined booking, consolidated billing, 
            and priority service. Contact us to learn more about our corporate programs.
          </p>
          <a
            href="mailto:corporate@nwtc.com"
            className="inline-block text-[#1e40af] font-semibold hover:underline"
          >
            corporate@nwtc.com →
          </a>
        </div>

      </div>

      {/* Footer */}
      <div className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="text-white font-bold mb-3">Contact</h4>
              <p className="text-sm mb-2">(509) 200-8000</p>
              <p className="text-sm mb-2">info@nwtc.com</p>
              <p className="text-sm">24/7 Dispatch Available</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">Service Area</h4>
              <p className="text-sm mb-2">Walla Walla Valley</p>
              <p className="text-sm mb-2">Tri-Cities / Pasco</p>
              <p className="text-sm">Seattle / SeaTac Airport</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-3">Certifications</h4>
              <p className="text-sm mb-2">DOT Compliant</p>
              <p className="text-sm mb-2">Fully Licensed & Insured</p>
              <p className="text-sm">Background-Checked Drivers</p>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 text-center text-sm">
            <p className="mb-2">
              NW Touring & Concierge operates as part of the Walla Walla Travel family of brands
            </p>
            <p className="text-slate-500">
              © {new Date().getFullYear()} NW Touring & Concierge. All rights reserved.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}


