/**
 * TouristTrip JSON-LD Schema for AI Discoverability
 *
 * Uses Schema.org TouristTrip type to describe wine tour offerings.
 * AI crawlers can extract tour details, pricing, and itinerary information.
 */

export interface TourOffer {
  name: string;
  price: number;
  priceCurrency?: string;
  description?: string;
}

export interface TourItineraryItem {
  name: string;
  description?: string;
}

interface TourJsonLdProps {
  name: string;
  description: string;
  url?: string;
  touristType?: string[];
  offers?: TourOffer[];
  itineraryItems?: TourItineraryItem[];
  duration?: string;
  provider?: {
    name: string;
    url?: string;
    telephone?: string;
  };
}

export function TourJsonLd({
  name,
  description,
  url,
  touristType,
  offers,
  itineraryItems,
  duration,
  provider,
}: TourJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name,
    description,
    url: url || undefined,
    touristType: touristType || undefined,
    itinerary: itineraryItems?.length
      ? {
          '@type': 'ItemList',
          itemListElement: itineraryItems.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            description: item.description || undefined,
          })),
        }
      : undefined,
    offers: offers?.length
      ? offers.map((offer) => ({
          '@type': 'Offer',
          name: offer.name,
          price: offer.price,
          priceCurrency: offer.priceCurrency || 'USD',
          description: offer.description || undefined,
        }))
      : undefined,
    duration: duration || undefined,
    provider: provider
      ? {
          '@type': 'Organization',
          name: provider.name,
          url: provider.url || undefined,
          telephone: provider.telephone || undefined,
        }
      : undefined,
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
