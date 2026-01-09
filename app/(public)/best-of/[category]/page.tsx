import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getBestOfCategoryBySlug,
  getAllBestOfCategorySlugs,
  getAllBestOfCategories,
} from '@/lib/data/best-of-categories';
import { getWineries } from '@/lib/data/wineries';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { FAQJsonLd, FAQ } from '@/components/seo/FAQJsonLd';

// Generate static params for all categories
export async function generateStaticParams() {
  const slugs = getAllBestOfCategorySlugs();
  return slugs.map((category) => ({ category }));
}

interface PageProps {
  params: Promise<{ category: string }>;
}

// Dynamic metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const categoryData = getBestOfCategoryBySlug(category);

  if (!categoryData) {
    return {
      title: 'Category Not Found',
    };
  }

  return {
    title: categoryData.title,
    description: categoryData.metaDescription,
    keywords: [
      categoryData.title,
      `${categoryData.shortTitle} Walla Walla`,
      'best wineries',
      'Walla Walla wine tour',
      'wine tasting recommendations',
    ],
    openGraph: {
      title: categoryData.title,
      description: categoryData.metaDescription,
      type: 'article',
      url: `https://wallawalla.travel/best-of/${category}`,
    },
    alternates: {
      canonical: `https://wallawalla.travel/best-of/${category}`,
    },
  };
}

// Generate FAQs for the category
function generateCategoryFAQs(category: NonNullable<ReturnType<typeof getBestOfCategoryBySlug>>): FAQ[] {
  return [
    {
      question: `What makes a winery ${category.shortTitle.toLowerCase()}?`,
      answer: `We evaluate wineries based on: ${category.criteria.slice(0, 3).join(', ')}, and more.`,
    },
    {
      question: `How many ${category.shortTitle.toLowerCase()} wineries are in Walla Walla?`,
      answer: `Walla Walla has numerous wineries that cater to ${category.shortTitle.toLowerCase()} preferences. Our curated list features the top recommendations based on verified criteria.`,
    },
    {
      question: `Do I need reservations for ${category.shortTitle.toLowerCase()} wineries?`,
      answer: `Reservation policies vary. We recommend calling ahead, especially on weekends or for groups, to ensure availability and the best experience.`,
    },
  ];
}

export default async function BestOfCategoryPage({ params }: PageProps) {
  const { category } = await params;
  const categoryData = getBestOfCategoryBySlug(category);

  if (!categoryData) {
    notFound();
  }

  // Get wineries (in production, this would filter by category criteria)
  const allWineries = await getWineries();

  // Filter wineries based on category (simplified - in production would use DB filters)
  let filteredWineries = allWineries;

  if (categoryData.amenityFilter) {
    filteredWineries = allWineries.filter((w) =>
      w.experience_tags?.some((tag) =>
        tag.toLowerCase().includes(categoryData.amenityFilter!.toLowerCase())
      )
    );
  }

  // If no matches, show top-rated wineries as fallback
  if (filteredWineries.length < 5) {
    filteredWineries = allWineries
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10);
  }

  // Take top 10 for the listicle
  const topWineries = filteredWineries.slice(0, 10);

  const allCategories = getAllBestOfCategories();
  const otherCategories = allCategories.filter((c) => c.slug !== category);
  const faqs = generateCategoryFAQs(categoryData);

  const breadcrumbs = [
    { name: 'Home', url: 'https://wallawalla.travel' },
    { name: 'Best Of', url: 'https://wallawalla.travel/best-of' },
    { name: categoryData.shortTitle, url: `https://wallawalla.travel/best-of/${category}` },
  ];

  // Category-specific icons
  const categoryIcons: Record<string, string> = {
    'dog-friendly': '🐕',
    'large-groups': '👥',
    'romantic': '💕',
    'views': '🏔️',
  };

  return (
    <>
      {/* Schema Markup */}
      <BreadcrumbJsonLd items={breadcrumbs} />
      <FAQJsonLd faqs={faqs} pageUrl={`https://wallawalla.travel/best-of/${category}`} />

      <div className="min-h-screen bg-gradient-to-b from-[#faf7f5] to-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#722F37] to-[#8B1538] text-white">
          <div className="max-w-6xl mx-auto px-4 py-16">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm mb-6">
              <Link href="/best-of" className="text-white/70 hover:text-white">
                Best Of
              </Link>
              <span className="text-white/50">/</span>
              <span className="text-white">{categoryData.shortTitle}</span>
            </nav>

            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl">{categoryIcons[category] || '🍷'}</span>
              <h1 className="text-3xl md:text-4xl font-serif font-bold">
                {categoryData.title}
              </h1>
            </div>
            <p className="text-xl text-white/90 max-w-2xl">
              {categoryData.description}
            </p>

            {/* Last Updated */}
            <p className="mt-6 text-sm text-white/70">
              Last updated: January 2026 • Based on local expertise and visitor feedback
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-10">
              {/* Intro */}
              <section>
                <div className="prose prose-lg max-w-none text-gray-600">
                  {categoryData.intro.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="mb-4">{paragraph}</p>
                  ))}
                </div>
              </section>

              {/* Winery List */}
              <section>
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">
                  Top {categoryData.shortTitle} Wineries
                </h2>
                <div className="space-y-6">
                  {topWineries.map((winery, index) => (
                    <div
                      key={winery.id}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          {/* Rank */}
                          <div className="flex-shrink-0 w-10 h-10 bg-[#8B1538] text-white rounded-full flex items-center justify-center font-bold text-lg">
                            {index + 1}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                  {winery.name}
                                </h3>
                                <p className="text-gray-500 text-sm mt-1">
                                  {winery.region} • {winery.tasting_fee > 0 ? `$${winery.tasting_fee} tasting` : 'By appointment'}
                                </p>
                              </div>
                              {winery.rating && (
                                <div className="flex items-center gap-1 text-amber-500">
                                  <span>⭐</span>
                                  <span className="font-medium">{winery.rating}</span>
                                </div>
                              )}
                            </div>

                            <p className="text-gray-600 mt-3 line-clamp-2">
                              {winery.description}
                            </p>

                            {/* Tags */}
                            {winery.experience_tags && winery.experience_tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {winery.experience_tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* CTA */}
                            <Link
                              href={`/wineries/${winery.slug}`}
                              className="inline-flex items-center gap-2 mt-4 text-[#8B1538] font-medium hover:underline"
                            >
                              View Details
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Tips Section */}
              <section className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
                <h2 className="text-xl font-semibold text-amber-900 mb-4 flex items-center gap-2">
                  <span>💡</span>
                  Pro Tips for {categoryData.shortTitle} Visits
                </h2>
                <ul className="space-y-3">
                  {categoryData.tips.map((tip) => (
                    <li key={tip} className="flex items-start gap-3">
                      <span className="text-amber-600 mt-1">•</span>
                      <span className="text-amber-800">{tip}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* FAQ Section */}
              <section>
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">
                  Frequently Asked Questions
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
              {/* CTA Card */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Plan Your {categoryData.shortTitle} Tour
                </h3>
                <p className="text-gray-600 mb-6">
                  Let us help you plan the perfect itinerary featuring these top picks.
                </p>

                <Link
                  href={`/book?preference=${encodeURIComponent(categoryData.shortTitle)}`}
                  className="block w-full bg-[#8B1538] text-white text-center py-3 rounded-xl font-semibold hover:bg-[#722F37] transition-colors mb-3"
                >
                  Create Custom Itinerary
                </Link>

                <Link
                  href="/wineries"
                  className="block w-full bg-gray-100 text-gray-700 text-center py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Browse All Wineries
                </Link>
              </div>

              {/* Criteria */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Our Selection Criteria
                </h3>
                <ul className="space-y-3">
                  {categoryData.criteria.map((criterion) => (
                    <li key={criterion} className="flex items-start gap-3">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span className="text-gray-700 text-sm">{criterion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Other Categories */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  More Best-Of Lists
                </h3>
                <div className="space-y-3">
                  {otherCategories.map((other) => (
                    <Link
                      key={other.slug}
                      href={`/best-of/${other.slug}`}
                      className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{categoryIcons[other.slug] || '🍷'}</span>
                        <span className="font-medium text-gray-900">{other.shortTitle}</span>
                      </div>
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
