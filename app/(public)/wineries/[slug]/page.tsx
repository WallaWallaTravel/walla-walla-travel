import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getWineryBySlug, getAllWinerySlugs, getWineryNarrativeContent } from '@/lib/data/wineries';
import { WineryDetailClient } from '@/components/wineries/WineryDetailClient';
import { WineryJsonLd } from '@/components/seo/WineryJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { logger } from '@/lib/logger';

// ============================================================================
// Static Generation
// ============================================================================

/**
 * Generate static pages for all wineries at build time
 * Note: Wrapped in try/catch to allow build to succeed even if DB is unavailable
 */
export async function generateStaticParams() {
  try {
    const slugs = await getAllWinerySlugs();
    return slugs.map((slug) => ({ slug }));
  } catch (error) {
    // If database is unavailable during build, return empty array
    // Pages will be generated on-demand instead
    logger.error('Error generating static params for wineries', { error });
    return [];
  }
}

// Render dynamically at request time (not statically at build time)
// This avoids build errors and allows pages to always show fresh data
export const dynamic = 'force-dynamic';

// ============================================================================
// Dynamic Metadata (SEO)
// ============================================================================

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const winery = await getWineryBySlug(slug);

  if (!winery) {
    return {
      title: 'Winery Not Found',
      description: 'The requested winery could not be found.',
    };
  }

  const title = `${winery.name} | Walla Walla Winery`;
  const description = winery.description || `Visit ${winery.name} in Walla Walla wine country. ${winery.wine_styles?.slice(0, 3).join(', ')} and more.`;

  return {
    title,
    description,
    keywords: [
      winery.name,
      'Walla Walla winery',
      'wine tasting',
      ...(winery.wine_styles || []),
    ],
    openGraph: {
      title: winery.name,
      description,
      type: 'website',
      url: `https://wallawalla.travel/wineries/${winery.slug}`,
      images: winery.image_url ? [
        {
          url: winery.image_url,
          width: 1200,
          height: 630,
          alt: winery.name,
        },
      ] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: winery.name,
      description,
      images: winery.image_url ? [winery.image_url] : undefined,
    },
    alternates: {
      canonical: `https://wallawalla.travel/wineries/${winery.slug}`,
    },
    // AI Discoverability: Last-modified signals for content freshness
    other: {
      ...(winery.updated_at && { 'article:modified_time': new Date(winery.updated_at).toISOString() }),
      ...(winery.created_at && { 'article:published_time': new Date(winery.created_at).toISOString() }),
    },
  };
}

// ============================================================================
// Page Component (Server Component)
// ============================================================================

export default async function WineryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const winery = await getWineryBySlug(slug);

  if (!winery) {
    notFound();
  }

  // Fetch narrative content (origin story, philosophy, tips) in parallel
  const narrativeContent = await getWineryNarrativeContent(winery.id);

  // Breadcrumb data for structured data
  const breadcrumbs = [
    { name: 'Home', url: 'https://wallawalla.travel' },
    { name: 'Wineries', url: 'https://wallawalla.travel/wineries' },
    { name: winery.name, url: `https://wallawalla.travel/wineries/${winery.slug}` },
  ];

  return (
    <>
      {/* Structured Data for SEO */}
      <WineryJsonLd winery={winery} />
      <BreadcrumbJsonLd items={breadcrumbs} />

      {/* Interactive Content */}
      <WineryDetailClient winery={winery} narrativeContent={narrativeContent} />
    </>
  );
}
