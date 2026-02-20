import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLodgingBySlug, getAllLodgingSlugs } from '@/lib/data/lodging';
import { LodgingDetailClient } from '@/components/lodging/LodgingDetailClient';
import { LodgingJsonLd } from '@/components/seo/LodgingJsonLd';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';
import { logger } from '@/lib/logger';

// ============================================================================
// Static Generation
// ============================================================================

/**
 * Generate static pages for all lodging properties at build time
 * Note: Wrapped in try/catch to allow build to succeed even if DB is unavailable
 */
export async function generateStaticParams() {
  try {
    const slugs = await getAllLodgingSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch (error) {
    // If database is unavailable during build, return empty array
    // Pages will be generated on-demand instead
    logger.error('Error generating static params for lodging', { error });
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
  const property = await getLodgingBySlug(slug);

  if (!property) {
    return {
      title: 'Property Not Found',
      description: 'The requested lodging property could not be found.',
    };
  }

  const title = `${property.name} | Stay in Walla Walla`;
  const description = property.short_description
    || property.description
    || `Stay at ${property.name} in ${property.city}, WA. Book your Walla Walla wine country accommodation.`;

  return {
    title,
    description,
    keywords: [
      property.name,
      'Walla Walla lodging',
      'Walla Walla accommodation',
      `${property.city} hotel`,
      'wine country stay',
    ],
    openGraph: {
      title: property.name,
      description,
      type: 'website',
      url: `https://wallawalla.travel/stays/${property.slug}`,
      images: property.cover_image_url ? [
        {
          url: property.cover_image_url,
          width: 1200,
          height: 630,
          alt: property.name,
        },
      ] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: property.name,
      description,
      images: property.cover_image_url ? [property.cover_image_url] : undefined,
    },
    alternates: {
      canonical: `https://wallawalla.travel/stays/${property.slug}`,
    },
    other: {
      ...(property.updated_at && { 'article:modified_time': new Date(property.updated_at).toISOString() }),
      ...(property.created_at && { 'article:published_time': new Date(property.created_at).toISOString() }),
    },
  };
}

// ============================================================================
// Page Component (Server Component)
// ============================================================================

export default async function LodgingDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const property = await getLodgingBySlug(slug);

  if (!property) {
    notFound();
  }

  // Breadcrumb data for structured data
  const breadcrumbs = [
    { name: 'Home', url: 'https://wallawalla.travel' },
    { name: 'Stays', url: 'https://wallawalla.travel/stays' },
    { name: property.name, url: `https://wallawalla.travel/stays/${property.slug}` },
  ];

  return (
    <>
      {/* Structured Data for SEO */}
      <LodgingJsonLd property={property} />
      <BreadcrumbJsonLd items={breadcrumbs} />

      {/* Interactive Content */}
      <LodgingDetailClient property={property} />
    </>
  );
}
