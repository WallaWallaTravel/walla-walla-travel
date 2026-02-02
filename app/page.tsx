import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { HeroMedia } from '@/components/HeroMedia';
import { getFeaturedWineries } from '@/lib/data/wineries';

export const metadata: Metadata = {
  title: 'Walla Walla Wine Tours & Travel Planning | wallawalla.travel',
  description: 'Plan your perfect Walla Walla wine country trip. 120+ wineries, curated recommendations, and personalized tour planning from local experts who know the valley.',
  keywords: [
    'Walla Walla wine tours',
    'wine country travel',
    'Washington wine tasting',
    'Walla Walla wineries',
    'wine tour planning',
    'group wine tours',
  ],
  alternates: {
    canonical: 'https://wallawalla.travel',
  },
};

export default async function HomePage() {
  const featuredWineries = await getFeaturedWineries(4);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Video Background */}
      <header className="relative min-h-[70vh] text-white overflow-hidden">
        {/* Media Background - cycles through videos and images with fade transitions */}
        <HeroMedia />

        {/* Dark Overlay (the "veil") - adjust opacity as needed */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />

        {/* Content Layer */}
        <div className="relative z-10">
          {/* Navigation */}
          <nav className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold">W</span>
              </div>
              <span className="text-xl font-semibold">Walla Walla Travel</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/wineries" className="text-white/80 hover:text-white transition-colors">
                Wineries
              </Link>
              <Link href="/neighborhoods" className="text-white/80 hover:text-white transition-colors">
                Districts
              </Link>
              <Link href="/guides" className="text-white/80 hover:text-white transition-colors">
                Guides
              </Link>
              <Link href="/itineraries" className="text-white/80 hover:text-white transition-colors">
                Itineraries
              </Link>
              <Link
                href="/plan-your-visit"
                className="bg-white text-[#8B1538] px-5 py-2 rounded-lg font-semibold hover:bg-white/90 transition-colors"
              >
                Plan Your Visit
              </Link>
            </div>

            {/* Mobile menu button */}
            <button className="md:hidden p-2 text-white/80 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </nav>

          {/* Hero Content */}
          <div className="max-w-7xl mx-auto px-4 py-16 md:py-28">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 leading-tight drop-shadow-lg">
                Your Guide to Walla Walla Wine Country
              </h1>
              <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed drop-shadow-md">
                120+ wineries. Personalized recommendations. Local expertise.
                We help you discover the perfect wines and experiences for your visit.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/plan-your-visit"
                  className="inline-flex items-center justify-center gap-2 bg-white text-[#8B1538] px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/90 transition-colors shadow-lg"
                >
                  Plan Your Visit
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <Link
                  href="/wineries"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-colors border border-white/30"
                >
                  Browse Wineries
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <Link href="/wineries" className="group hover:scale-105 transition-transform">
              <div className="text-3xl md:text-4xl font-bold text-[#8B1538] group-hover:text-[#722F37]">120+</div>
              <div className="text-gray-600 mt-1 group-hover:text-gray-900">Wineries</div>
            </Link>
            <Link href="/neighborhoods" className="group hover:scale-105 transition-transform">
              <div className="text-3xl md:text-4xl font-bold text-[#8B1538] group-hover:text-[#722F37]">6</div>
              <div className="text-gray-600 mt-1 group-hover:text-gray-900">Wine Districts</div>
            </Link>
            <Link href="/about/walla-walla-wine-facts" className="group hover:scale-105 transition-transform">
              <div className="text-3xl md:text-4xl font-bold text-[#8B1538] group-hover:text-[#722F37]">400K+</div>
              <div className="text-gray-600 mt-1 group-hover:text-gray-900">Annual Visitors</div>
            </Link>
            <Link href="/about/walla-walla-wine-facts" className="group hover:scale-105 transition-transform">
              <div className="text-3xl md:text-4xl font-bold text-[#8B1538] group-hover:text-[#722F37]">40+</div>
              <div className="text-gray-600 mt-1 group-hover:text-gray-900">Grape Varieties</div>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Wineries */}
      {featuredWineries.length > 0 && (
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">
                  Featured Wineries
                </h2>
                <p className="text-gray-600 mt-1">Discover some of our favorite spots</p>
              </div>
              <Link
                href="/wineries"
                className="hidden md:inline-flex items-center gap-2 text-[#8B1538] font-semibold hover:underline"
              >
                View All Wineries
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredWineries.map((winery) => {
                // Use hero_image_url from media library, fallback to image_url, then placeholder
                const imageUrl = winery.hero_image_url || winery.image_url;
                const hasImage = imageUrl && !imageUrl.startsWith('data:');

                return (
                  <Link
                    key={winery.id}
                    href={`/wineries/${winery.slug}`}
                    className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-[#8B1538]/30 transition-all"
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-purple-100 to-purple-50 relative overflow-hidden">
                      {hasImage ? (
                        <Image
                          src={imageUrl}
                          alt={winery.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-5xl">🍷</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 group-hover:text-[#8B1538] transition-colors line-clamp-1">
                        {winery.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{winery.region || 'Walla Walla Valley'}</p>
                      {winery.experience_tags && winery.experience_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {winery.experience_tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 text-center md:hidden">
              <Link
                href="/wineries"
                className="inline-flex items-center gap-2 text-[#8B1538] font-semibold"
              >
                View All Wineries
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Explore By Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">
              Explore Walla Walla Wine Country
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Whether you&apos;re planning your first visit or your fiftieth,
              we&apos;ll help you find what you&apos;re looking for.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Browse Wineries */}
            <Link
              href="/wineries"
              className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all hover:border-[#8B1538]/30"
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                <svg className="w-20 h-20 text-[#8B1538]/60 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                </svg>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#8B1538] transition-colors">
                  Browse All Wineries
                </h3>
                <p className="text-gray-600">
                  Explore our complete directory of Walla Walla wineries with hours,
                  contact info, and insider tips.
                </p>
              </div>
            </Link>

            {/* Wine Districts */}
            <Link
              href="/neighborhoods"
              className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all hover:border-[#8B1538]/30"
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
                <svg className="w-20 h-20 text-[#8B1538]/60 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#8B1538] transition-colors">
                  Wine Districts
                </h3>
                <p className="text-gray-600">
                  Learn about Downtown, Airport District, Southside, and Westside
                  to plan your route.
                </p>
              </div>
            </Link>

            {/* Curated Lists */}
            <Link
              href="/best-of"
              className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all hover:border-[#8B1538]/30"
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-rose-100 to-rose-50 flex items-center justify-center">
                <svg className="w-20 h-20 text-[#8B1538]/60 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#8B1538] transition-colors">
                  Best Of Walla Walla
                </h3>
                <p className="text-gray-600">
                  Dog-friendly, romantic spots, great for groups, stunning views
                  - find what fits your style.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Plan With Us */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">
              Why Plan With Us
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We&apos;re not a booking aggregator. We&apos;re local experts with
              direct relationships in the valley.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-[#8B1538]/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#8B1538]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Local Knowledge</h3>
              <p className="text-gray-600">
                Our recommendations come from years of experience and personal relationships
                with winemakers and owners throughout the valley.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-[#8B1538]/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#8B1538]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197V21" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Personalized Fit</h3>
              <p className="text-gray-600">
                Every group is different. Tell us what you&apos;re looking for and
                we&apos;ll match you with experiences that fit your style and interests.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-[#8B1538]/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#8B1538]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Trusted Information</h3>
              <p className="text-gray-600">
                Hours, reservations, group policies - we verify details directly with wineries
                so you can plan with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">
            Ready to Plan Your Visit?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Tell us about your group and what you&apos;re looking for.
            We&apos;ll help you create the perfect wine country experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/plan-your-visit"
              className="inline-flex items-center justify-center gap-2 bg-[#8B1538] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#722F37] transition-colors shadow-lg"
            >
              Get Started
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <Link
              href="/corporate"
              className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-200 transition-colors"
            >
              Corporate & Group Events
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <span className="text-xl font-bold">W</span>
                </div>
                <span className="text-xl font-semibold">Walla Walla Travel</span>
              </Link>
              <p className="text-gray-400 text-sm">
                Your guide to Walla Walla Valley wine country.
                Local expertise, personalized recommendations.
              </p>
            </div>

            {/* Wineries - Most Prominent */}
            <div>
              <h4 className="font-semibold mb-4">
                <Link href="/wineries" className="hover:text-[#8B1538] transition-colors">
                  Browse Wineries
                </Link>
              </h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/wineries" className="hover:text-white transition-colors font-medium text-gray-300">All 120+ Wineries</Link></li>
                <li className="pt-1 text-xs text-gray-500 uppercase tracking-wide">By District</li>
                <li><Link href="/neighborhoods/downtown" className="hover:text-white transition-colors">Downtown</Link></li>
                <li><Link href="/neighborhoods/airport-district" className="hover:text-white transition-colors">Airport District</Link></li>
                <li><Link href="/neighborhoods/southside" className="hover:text-white transition-colors">Southside</Link></li>
                <li><Link href="/neighborhoods/westside" className="hover:text-white transition-colors">Westside</Link></li>
              </ul>
            </div>

            {/* Explore */}
            <div>
              <h4 className="font-semibold mb-4">Explore</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/neighborhoods" className="hover:text-white transition-colors">Wine Districts</Link></li>
                <li><Link href="/best-of" className="hover:text-white transition-colors">Best Of Lists</Link></li>
                <li><Link href="/about/walla-walla-wine-facts" className="hover:text-white transition-colors">Wine Facts</Link></li>
              </ul>
            </div>

            {/* Plan */}
            <div>
              <h4 className="font-semibold mb-4">Plan Your Trip</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/guides" className="hover:text-white transition-colors">Travel Guides</Link></li>
                <li><Link href="/itineraries" className="hover:text-white transition-colors">Sample Itineraries</Link></li>
                <li><Link href="/plan-your-visit" className="hover:text-white transition-colors">Plan Your Visit</Link></li>
                <li><Link href="/corporate" className="hover:text-white transition-colors">Corporate Events</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} Walla Walla Travel. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="/admin" className="hover:text-gray-300 transition-colors">Staff Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
