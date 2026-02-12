import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getHistoryEraBySlug,
  getAllHistoryEraSlugs,
  getAllHistoryEras,
} from '@/lib/data/history';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { FAQJsonLd } from '@/components/seo/FAQJsonLd';
import { FAQSection } from '@/components/FAQSection';

// Generate static params for all eras
export async function generateStaticParams() {
  const slugs = getAllHistoryEraSlugs();
  return slugs.map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Dynamic metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const era = getHistoryEraBySlug(slug);

  if (!era) {
    return { title: 'Era Not Found' };
  }

  return {
    title: `${era.title} | History of Walla Walla`,
    description: era.metaDescription,
    keywords: [
      era.title,
      'Walla Walla history',
      'Walla Walla Valley',
      era.shortTitle,
    ],
    openGraph: {
      title: era.title,
      description: era.metaDescription,
      type: 'article',
      url: `https://wallawalla.travel/history/${slug}`,
    },
    alternates: {
      canonical: `https://wallawalla.travel/history/${slug}`,
    },
  };
}

export default async function HistoryEraPage({ params }: PageProps) {
  const { slug } = await params;
  const era = getHistoryEraBySlug(slug);

  if (!era) {
    notFound();
  }

  const allEras = getAllHistoryEras();
  const currentIndex = allEras.findIndex((e) => e.slug === slug);
  const prevEra = currentIndex > 0 ? allEras[currentIndex - 1] : null;
  const nextEra = currentIndex < allEras.length - 1 ? allEras[currentIndex + 1] : null;

  const breadcrumbs = [
    { name: 'Home', url: 'https://wallawalla.travel' },
    { name: 'History', url: 'https://wallawalla.travel/history' },
    { name: era.shortTitle, url: `https://wallawalla.travel/history/${slug}` },
  ];

  // Article JSON-LD
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: era.title,
    description: era.metaDescription,
    url: `https://wallawalla.travel/history/${slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'Walla Walla Travel',
      url: 'https://wallawalla.travel',
    },
    dateModified: new Date().toISOString(),
    about: {
      '@type': 'Place',
      name: 'Walla Walla Valley',
    },
  };

  return (
    <>
      {/* Schema Markup */}
      <BreadcrumbJsonLd items={breadcrumbs} />
      <FAQJsonLd faqs={era.faqs} pageUrl={`https://wallawalla.travel/history/${slug}`} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <div className="min-h-screen bg-gradient-to-b from-[#faf7f5] to-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#722F37] to-[#8B1538] text-white">
          <div className="max-w-4xl mx-auto px-4 py-16">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm mb-6">
              <Link href="/history" className="text-white/70 hover:text-white">
                History
              </Link>
              <span className="text-white/50">/</span>
              <span className="text-white">{era.shortTitle}</span>
            </nav>

            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-white/15 text-white text-sm font-semibold rounded-full mb-3">
                {era.yearRange}
              </span>
              <h1 className="text-3xl md:text-4xl font-serif font-bold">
                {era.title}
              </h1>
            </div>

            <p className="text-xl text-white/90 max-w-2xl mb-6">
              {era.description}
            </p>

            {/* Meta info */}
            <div className="flex items-center gap-4 text-white/70 text-sm">
              <span>{era.readTime}</span>
              <span>•</span>
              <span>Updated {era.lastUpdated}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-4 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-10">
              {/* Table of Contents */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h2 className="font-semibold text-gray-900 mb-3">In This Article</h2>
                <nav className="space-y-2">
                  {era.sections.map((section, index) => (
                    <a
                      key={index}
                      href={`#section-${index}`}
                      className="block text-gray-600 hover:text-[#8B1538] transition-colors"
                    >
                      {index + 1}. {section.title}
                    </a>
                  ))}
                </nav>
              </div>

              {/* Sections */}
              {era.sections.map((section, index) => (
                <section key={index} id={`section-${index}`} className="scroll-mt-8">
                  <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">
                    {section.title}
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-600">
                    {section.content.split('\n\n').map((paragraph, pIndex) => {
                      // Handle bold text definitions
                      if (paragraph.startsWith('**') && paragraph.includes('**:')) {
                        const parts = paragraph.split('**');
                        return (
                          <p key={pIndex} className="mb-4">
                            <strong className="text-gray-900">{parts[1]}</strong>
                            {parts[2]}
                          </p>
                        );
                      }

                      // Handle paragraphs with multiple bold items or lists
                      if (paragraph.includes('**') && paragraph.includes('\n')) {
                        return (
                          <div key={pIndex} className="mb-4">
                            {paragraph.split('\n').map((line, lIndex) => {
                              if (line.startsWith('**')) {
                                const parts = line.split('**');
                                return (
                                  <p key={lIndex} className="mb-2">
                                    <strong className="text-gray-900">{parts[1]}</strong>
                                    {parts[2]}
                                  </p>
                                );
                              }
                              if (line.startsWith('- ')) {
                                return (
                                  <p key={lIndex} className="mb-1 pl-4">
                                    • {line.substring(2)}
                                  </p>
                                );
                              }
                              return line ? (
                                <p key={lIndex} className="mb-2">
                                  {line}
                                </p>
                              ) : null;
                            })}
                          </div>
                        );
                      }

                      // Regular paragraph
                      return (
                        <p key={pIndex} className="mb-4">
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>
                </section>
              ))}

              {/* Sources Section */}
              {era.sources.length > 0 && (
                <section className="mt-12 pt-8 border-t border-gray-200">
                  <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">
                    Sources
                  </h2>
                  <div className="space-y-4">
                    {era.sources.map((source, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100"
                      >
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#722F37]/10 text-[#722F37] text-xs font-semibold flex items-center justify-center mt-0.5">
                          {index + 1}
                        </span>
                        <div>
                          {source.url ? (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-gray-900 hover:text-[#8B1538] transition-colors"
                            >
                              {source.name}
                              <span className="inline-block ml-1 text-gray-400">
                                <svg
                                  className="w-3.5 h-3.5 inline"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </span>
                            </a>
                          ) : (
                            <span className="font-semibold text-gray-900">
                              {source.name}
                            </span>
                          )}
                          <p className="text-sm text-gray-600 mt-1">
                            {source.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* FAQ Section */}
              <FAQSection
                faqs={era.faqs}
                className="mt-12 pt-8 border-t border-gray-200"
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* CTA Card */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Plan Your Visit
                </h3>
                <p className="text-gray-600 mb-6">
                  Experience the valley&apos;s history firsthand — from museums and
                  historic sites to the wineries continuing the story today.
                </p>

                <Link
                  href="/book"
                  className="block w-full bg-[#8B1538] text-white text-center py-3 rounded-xl font-semibold hover:bg-[#722F37] transition-colors mb-3"
                >
                  Plan Your Trip
                </Link>

                <Link
                  href="/wineries"
                  className="block w-full bg-gray-100 text-gray-700 text-center py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Browse Wineries
                </Link>
              </div>

              {/* Visit Today */}
              {era.visitableToday.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Visit Today
                  </h3>
                  <div className="space-y-3">
                    {era.visitableToday.map((place, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-lg mt-0.5 flex-shrink-0" aria-hidden="true">📍</span>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {place.name}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {place.description}
                          </p>
                          {place.location && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {place.location}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prev/Next Era Navigation */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  More History
                </h3>
                <div className="space-y-3">
                  {prevEra && (
                    <Link
                      href={`/history/${prevEra.slug}`}
                      className="block p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
                    >
                      <p className="text-xs text-gray-500 mb-1">Previous Era</p>
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-gray-400 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                        <span className="font-medium text-gray-900 text-sm">
                          {prevEra.shortTitle}
                        </span>
                      </div>
                    </Link>
                  )}
                  {nextEra && (
                    <Link
                      href={`/history/${nextEra.slug}`}
                      className="block p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
                    >
                      <p className="text-xs text-gray-500 mb-1">Next Era</p>
                      <div className="flex items-center gap-2 justify-between">
                        <span className="font-medium text-gray-900 text-sm">
                          {nextEra.shortTitle}
                        </span>
                        <svg
                          className="w-4 h-4 text-gray-400 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </Link>
                  )}
                  <Link
                    href="/history"
                    className="block mt-3 text-xs text-[#8B1538] font-medium hover:underline"
                  >
                    View Full Timeline →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
