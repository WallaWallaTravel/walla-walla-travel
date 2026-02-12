import { Metadata } from 'next';
import Link from 'next/link';
import { getAllHistoryEras } from '@/lib/data/history';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'History of the Walla Walla Valley | Walla Walla Travel',
  description:
    'Explore the rich history of the Walla Walla Valley — from its Indigenous peoples and the Lewis & Clark expedition to the Whitman Mission, agricultural heritage, and the birth of wine country.',
  keywords: [
    'Walla Walla history',
    'Walla Walla Valley history',
    'Whitman Mission',
    'Lewis and Clark Walla Walla',
    'Walla Walla wine history',
    'Fort Walla Walla',
    'Walla Walla Sweet Onion history',
  ],
  openGraph: {
    title: 'History of the Walla Walla Valley',
    description:
      'From Indigenous peoples to modern wine country — the story of one of the Pacific Northwest\'s most historic valleys.',
    type: 'website',
    url: 'https://wallawalla.travel/history',
  },
  alternates: {
    canonical: 'https://wallawalla.travel/history',
  },
};

export default function HistoryIndexPage() {
  const eras = getAllHistoryEras();

  const breadcrumbs = [
    { name: 'Home', url: 'https://wallawalla.travel' },
    { name: 'History', url: 'https://wallawalla.travel/history' },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbs} />

      <div className="min-h-screen bg-gradient-to-b from-[#faf7f5] to-white">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-white py-24 px-4 overflow-hidden">
          {/* Background texture */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'url(https://images.unsplash.com/photo-1461360370896-922624d12a74?w=1920&q=80)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e]/60 via-transparent to-[#1a1a2e]/80" />

          <div className="relative max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              History of the Walla Walla Valley
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              From its Indigenous peoples to modern wine country — the story of one of
              the Pacific Northwest&apos;s most historic valleys.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="#timeline"
                className="px-6 py-3 bg-[#722F37] text-white rounded-lg font-medium hover:bg-[#5a252c] transition-colors"
              >
                Explore the Timeline
              </a>
              <Link
                href="/geology"
                className="px-6 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
              >
                Geology of the Valley
              </Link>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#faf7f5] to-transparent" />
        </section>

        {/* Timeline Section */}
        <section id="timeline" className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              A Valley Through Time
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Seven eras that shaped the Walla Walla Valley — each one building on
              the last, creating the unique place it is today.
            </p>

            {/* Timeline */}
            <div className="relative">
              {/* Center line — visible on md+ */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#722F37]/20 -translate-x-px" />

              {/* Mobile line — visible on small screens */}
              <div className="md:hidden absolute left-6 top-0 bottom-0 w-0.5 bg-[#722F37]/20" />

              <div className="space-y-12 md:space-y-16">
                {eras.map((era, index) => {
                  const isLeft = index % 2 === 0;

                  return (
                    <div key={era.slug} className="relative">
                      {/* Dot — desktop (center) */}
                      <div className="hidden md:flex absolute left-1/2 top-8 -translate-x-1/2 z-10 w-4 h-4 rounded-full bg-[#722F37] ring-4 ring-[#faf7f5]" />

                      {/* Dot — mobile (left) */}
                      <div className="md:hidden absolute left-6 top-8 -translate-x-1/2 z-10 w-4 h-4 rounded-full bg-[#722F37] ring-4 ring-[#faf7f5]" />

                      {/* Card */}
                      <div
                        className={`md:w-[calc(50%-2rem)] ${
                          isLeft ? 'md:mr-auto md:pr-0' : 'md:ml-auto md:pl-0'
                        } ml-12 md:ml-0`}
                      >
                        <Link
                          href={`/history/${era.slug}`}
                          className="group block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                        >
                          {/* Year badge */}
                          <span className="inline-block px-3 py-1 bg-[#722F37]/10 text-[#722F37] text-sm font-semibold rounded-full mb-3">
                            {era.timelineLabel}
                          </span>

                          <h3 className="text-xl font-serif font-bold text-gray-900 group-hover:text-[#722F37] transition-colors mb-2">
                            {era.title}
                          </h3>

                          <p className="text-gray-600 mb-4 leading-relaxed">
                            {era.description}
                          </p>

                          <div className="flex items-center text-[#722F37] font-medium gap-2 group-hover:gap-3 transition-all text-sm">
                            <span>Read more</span>
                            <svg
                              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14 5l7 7m0 0l-7 7m7-7H3"
                              />
                            </svg>
                          </div>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-[#722F37] to-[#8B1538] rounded-2xl p-8 text-white text-center">
              <h2 className="text-2xl font-serif font-bold mb-4">
                Experience the Valley&apos;s Living History
              </h2>
              <p className="text-white/90 mb-6 max-w-xl mx-auto">
                From the Whitman Mission to pioneer museums and the vineyards that
                transformed the landscape — history is everywhere in Walla Walla.
              </p>
              <Link
                href="/book"
                className="inline-flex items-center gap-2 bg-white text-[#8B1538] px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              >
                Plan Your Visit
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
