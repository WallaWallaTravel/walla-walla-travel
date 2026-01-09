import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getNeighborhoodBySlug,
  getAllNeighborhoodSlugs,
  getAllNeighborhoods,
} from '@/lib/data/neighborhoods';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { FAQJsonLd, FAQ } from '@/components/seo/FAQJsonLd';

// Generate static params for all neighborhoods
export async function generateStaticParams() {
  const slugs = getAllNeighborhoodSlugs();
  return slugs.map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Dynamic metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const neighborhood = getNeighborhoodBySlug(slug);

  if (!neighborhood) {
    return {
      title: 'Neighborhood Not Found',
    };
  }

  return {
    title: `${neighborhood.name} Wineries | Walla Walla Wine District`,
    description: neighborhood.description,
    keywords: [
      `${neighborhood.name} wineries`,
      `${neighborhood.shortName} Walla Walla`,
      'wine tasting',
      'Walla Walla wine tour',
    ],
    openGraph: {
      title: `${neighborhood.name} - Walla Walla Wine District`,
      description: neighborhood.description,
      type: 'website',
      url: `https://wallawalla.travel/neighborhoods/${slug}`,
    },
    alternates: {
      canonical: `https://wallawalla.travel/neighborhoods/${slug}`,
    },
  };
}

// Generate contextual FAQs for the neighborhood
function generateNeighborhoodFAQs(neighborhood: NonNullable<ReturnType<typeof getNeighborhoodBySlug>>): FAQ[] {
  return [
    {
      question: `How many wineries are in the ${neighborhood.name}?`,
      answer: `There are approximately ${neighborhood.approximateWineries}+ wineries in the ${neighborhood.name}. Like all Walla Walla districts, you'll find a diverse range of producers here.`,
    },
    {
      question: `What's special about the ${neighborhood.name}?`,
      answer: neighborhood.practicalInfo,
    },
    {
      question: `Do I need reservations for wineries in the ${neighborhood.name}?`,
      answer: neighborhood.slug === 'downtown'
        ? 'Many Downtown tasting rooms recommend reservations due to limited space, especially on weekends. Walk-ins may have limited availability.'
        : `Reservation requirements vary by winery. It's always a good idea to call ahead, especially for groups or weekend visits.`,
    },
  ];
}

export default async function NeighborhoodDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const neighborhood = getNeighborhoodBySlug(slug);

  if (!neighborhood) {
    notFound();
  }

  const allNeighborhoods = getAllNeighborhoods();
  const otherNeighborhoods = allNeighborhoods.filter((n) => n.slug !== slug);
  const faqs = generateNeighborhoodFAQs(neighborhood);

  const breadcrumbs = [
    { name: 'Home', url: 'https://wallawalla.travel' },
    { name: 'Districts', url: 'https://wallawalla.travel/neighborhoods' },
    { name: neighborhood.name, url: `https://wallawalla.travel/neighborhoods/${slug}` },
  ];

  return (
    <>
      {/* Schema Markup */}
      <BreadcrumbJsonLd items={breadcrumbs} />
      <FAQJsonLd faqs={faqs} pageUrl={`https://wallawalla.travel/neighborhoods/${slug}`} />

      <div className="min-h-screen bg-gradient-to-b from-[#faf7f5] to-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#722F37] to-[#8B1538] text-white">
          <div className="max-w-6xl mx-auto px-4 py-16">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm mb-6">
              <Link href="/neighborhoods" className="text-white/70 hover:text-white">
                Districts
              </Link>
              <span className="text-white/50">/</span>
              <span className="text-white">{neighborhood.shortName}</span>
            </nav>

            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              {neighborhood.name}
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mb-8">
              {neighborhood.description}
            </p>

            {/* Quick Stat */}
            <div className="inline-block bg-white/10 rounded-lg px-4 py-3">
              <p className="text-white/70 text-sm">Approximate Wineries</p>
              <p className="text-2xl font-bold">{neighborhood.approximateWineries}+</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-10">
              {/* About */}
              <section>
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">
                  About This Area
                </h2>
                <div className="prose prose-lg max-w-none text-gray-600">
                  {neighborhood.longDescription.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="mb-4">{paragraph}</p>
                  ))}
                </div>
              </section>

              {/* What You'll Find */}
              <section>
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">
                  What You&apos;ll Find Here
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {neighborhood.whatYoullFind.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl"
                    >
                      <span className="text-gray-400 text-xl">→</span>
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Highlights */}
              <section>
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">
                  Highlights
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {neighborhood.highlights.map((highlight) => (
                    <div
                      key={highlight}
                      className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200"
                    >
                      <span className="text-[#8B1538] text-xl">✓</span>
                      <span className="text-gray-700">{highlight}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* FAQ Section */}
              <section>
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">
                  Common Questions
                </h2>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <details
                      key={index}
                      className="group bg-white rounded-xl border border-gray-200 hover:border-[#8B1538]/30 transition-colors"
                    >
                      <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                        <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                        <span className="text-[#8B1538] group-open:rotate-180 transition-transform flex-shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </summary>
                      <div className="px-4 pb-4 text-gray-600 border-t border-gray-100 pt-3">
                        {faq.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* CTA Card - Updated language */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Explore {neighborhood.shortName}
                </h3>
                <p className="text-gray-600 mb-6">
                  Looking for specific recommendations? We know these wineries personally
                  and can help you find the right fit for your visit.
                </p>

                <Link
                  href={`/book?area=${encodeURIComponent(neighborhood.name)}`}
                  className="block w-full bg-[#8B1538] text-white text-center py-3 rounded-xl font-semibold hover:bg-[#722F37] transition-colors mb-3"
                >
                  Get Recommendations
                </Link>

                <Link
                  href="/wineries"
                  className="block w-full bg-gray-100 text-gray-700 text-center py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Browse All Wineries
                </Link>
              </div>

              {/* Practical Info */}
              <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
                <h3 className="text-lg font-semibold text-amber-900 mb-3 flex items-center gap-2">
                  <span>💡</span>
                  Good to Know
                </h3>
                <p className="text-amber-800">
                  {neighborhood.practicalInfo}
                </p>
              </div>

              {/* Other Districts */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Other Districts
                </h3>
                <div className="space-y-3">
                  {otherNeighborhoods.map((other) => (
                    <Link
                      key={other.slug}
                      href={`/neighborhoods/${other.slug}`}
                      className="block p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
                    >
                      <p className="font-medium text-gray-900">{other.name}</p>
                      <p className="text-sm text-gray-500 mt-1">{other.approximateWineries}+ wineries</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
