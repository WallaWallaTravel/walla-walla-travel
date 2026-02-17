import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getGuideBySlug, getAllGuideSlugs, getAllGuides } from '@/lib/data/guides';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { FAQJsonLd } from '@/components/seo/FAQJsonLd';
import { FAQSection } from '@/components/FAQSection';

// Generate static params for all guides
export async function generateStaticParams() {
  const slugs = getAllGuideSlugs();
  return slugs.map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Dynamic metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return {
      title: 'Guide Not Found',
    };
  }

  return {
    title: guide.title,
    description: guide.metaDescription,
    keywords: [
      guide.title,
      'Walla Walla wine guide',
      'wine country tips',
      'wine tasting guide',
    ],
    openGraph: {
      title: guide.title,
      description: guide.metaDescription,
      type: 'article',
      url: `https://wallawalla.travel/guides/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: guide.title,
      description: guide.metaDescription,
    },
    alternates: {
      canonical: `https://wallawalla.travel/guides/${slug}`,
    },
  };
}

// Guide icons
const guideIcons: Record<string, string> = {
  'best-time-to-visit': '📅',
  'wine-101': '🍷',
  'group-planning-tips': '👥',
};

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const allGuides = getAllGuides();
  const otherGuides = allGuides.filter((g) => g.slug !== slug);

  const breadcrumbs = [
    { name: 'Home', url: 'https://wallawalla.travel' },
    { name: 'Guides', url: 'https://wallawalla.travel/guides' },
    { name: guide.shortTitle, url: `https://wallawalla.travel/guides/${slug}` },
  ];

  return (
    <>
      {/* Schema Markup */}
      <BreadcrumbJsonLd items={breadcrumbs} />
      <FAQJsonLd faqs={guide.faqs} pageUrl={`https://wallawalla.travel/guides/${slug}`} />

      <div className="min-h-screen bg-gradient-to-b from-[#faf7f5] to-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#722F37] to-[#8B1538] text-white">
          <div className="max-w-4xl mx-auto px-4 py-16">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm mb-6">
              <Link href="/guides" className="text-white/70 hover:text-white">
                Guides
              </Link>
              <span className="text-white/50">/</span>
              <span className="text-white">{guide.shortTitle}</span>
            </nav>

            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl">{guideIcons[slug] || '📖'}</span>
              <div>
                <h1 className="text-3xl md:text-4xl font-serif font-bold">
                  {guide.title}
                </h1>
              </div>
            </div>

            <p className="text-xl text-white/90 max-w-2xl mb-6">
              {guide.description}
            </p>

            {/* Meta info */}
            <div className="flex items-center gap-4 text-white/70 text-sm">
              <span>{guide.readTime}</span>
              <span>•</span>
              <span>Updated {guide.lastUpdated}</span>
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
                <h2 className="font-semibold text-gray-900 mb-3">In This Guide</h2>
                <nav className="space-y-2">
                  {guide.sections.map((section, index) => (
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
              {guide.sections.map((section, index) => (
                <section key={index} id={`section-${index}`} className="scroll-mt-8">
                  <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">
                    {section.title}
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-600">
                    {section.content.split('\n\n').map((paragraph, pIndex) => {
                      // Handle bold text and lists
                      if (paragraph.startsWith('**') && paragraph.includes('**:')) {
                        // This is a definition/label paragraph
                        const parts = paragraph.split('**');
                        return (
                          <p key={pIndex} className="mb-4">
                            <strong className="text-gray-900">{parts[1]}</strong>
                            {parts[2]}
                          </p>
                        );
                      }

                      // Handle paragraphs with multiple bold items (like lists)
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
                              return <p key={lIndex} className="mb-2">{line}</p>;
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

              {/* FAQ Section */}
              <FAQSection
                faqs={guide.faqs}
                className="mt-12 pt-8 border-t border-gray-200"
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* CTA Card */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Ready to Visit?
                </h3>
                <p className="text-gray-600 mb-6">
                  Let us help you plan the perfect wine country experience.
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

              {/* Explore by District */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Explore by District
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/neighborhoods/downtown" className="text-sm text-gray-600 hover:text-[#8B1538] transition-colors">Downtown</Link>
                  <Link href="/neighborhoods/airport-district" className="text-sm text-gray-600 hover:text-[#8B1538] transition-colors">Airport</Link>
                  <Link href="/neighborhoods/southside" className="text-sm text-gray-600 hover:text-[#8B1538] transition-colors">Southside</Link>
                  <Link href="/neighborhoods/westside" className="text-sm text-gray-600 hover:text-[#8B1538] transition-colors">Westside</Link>
                </div>
                <Link href="/neighborhoods" className="block mt-3 text-xs text-[#8B1538] font-medium hover:underline">
                  View All Districts →
                </Link>
              </div>

              {/* Other Guides */}
              {otherGuides.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    More Guides
                  </h3>
                  <div className="space-y-3">
                    {otherGuides.map((other) => (
                      <Link
                        key={other.slug}
                        href={`/guides/${other.slug}`}
                        className="block p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{guideIcons[other.slug] || '📖'}</span>
                          <span className="font-medium text-gray-900">{other.shortTitle}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
