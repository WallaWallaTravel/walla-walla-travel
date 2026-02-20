import type { LodgingProperty } from '@/lib/data/lodging';

interface LodgingJsonLdProps {
  property: LodgingProperty;
}

export function LodgingJsonLd({ property }: LodgingJsonLdProps) {
  // Build price range string from min/max
  const priceRange = (() => {
    if (property.price_range_min && property.price_range_max) {
      return `$${property.price_range_min} - $${property.price_range_max}`;
    }
    if (property.price_range_min) {
      return `From $${property.price_range_min}`;
    }
    if (property.price_range_max) {
      return `Up to $${property.price_range_max}`;
    }
    return undefined;
  })();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    '@id': `https://wallawalla.travel/stays/${property.slug}`,
    name: property.name,
    description: property.description || property.short_description || undefined,
    image: property.cover_image_url || undefined,
    telephone: property.phone || undefined,
    url: property.website || undefined,
    address: property.address ? {
      '@type': 'PostalAddress',
      streetAddress: property.address,
      addressLocality: property.city || 'Walla Walla',
      addressRegion: property.state || 'WA',
      addressCountry: 'US',
    } : undefined,
    geo: property.latitude && property.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: property.latitude,
      longitude: property.longitude,
    } : undefined,
    priceRange: priceRange,
    checkinTime: property.check_in_time || undefined,
    checkoutTime: property.check_out_time || undefined,
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
