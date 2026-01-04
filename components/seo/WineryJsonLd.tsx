import type { Winery } from '@/lib/data/wineries';

interface WineryJsonLdProps {
  winery: Winery;
}

export function WineryJsonLd({ winery }: WineryJsonLdProps) {
  // Build the JSON-LD structured data for LocalBusiness
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `https://wallawalla.travel/wineries/${winery.slug}`,
    name: winery.name,
    description: winery.description,
    image: winery.image_url || undefined,
    telephone: winery.phone || undefined,
    url: winery.website || undefined,
    address: winery.address ? {
      '@type': 'PostalAddress',
      streetAddress: winery.address,
      addressLocality: 'Walla Walla',
      addressRegion: 'WA',
      addressCountry: 'US',
    } : undefined,
    geo: winery.latitude && winery.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: winery.latitude,
      longitude: winery.longitude,
    } : undefined,
    aggregateRating: winery.rating ? {
      '@type': 'AggregateRating',
      ratingValue: winery.rating,
      bestRating: 5,
      ratingCount: winery.review_count || 1,
    } : undefined,
    priceRange: winery.tasting_fee ? `$${winery.tasting_fee}` : undefined,
    openingHours: winery.hours || undefined,
  };

  // Remove undefined values for cleaner output
  const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanJsonLd, null, 0) }}
    />
  );
}
