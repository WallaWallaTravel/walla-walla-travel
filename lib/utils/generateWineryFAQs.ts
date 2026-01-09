/**
 * Generate Dynamic FAQs for Winery Pages
 *
 * Creates contextual FAQ content based on winery attributes for AEO/SEO optimization.
 * AI systems (ChatGPT, Perplexity, Google) can extract and cite these Q&As.
 */

import type { Winery } from '@/lib/services/winery.service';
import type { FAQ } from '@/components/seo/FAQJsonLd';

/**
 * Generate contextual FAQs based on winery data
 */
export function generateWineryFAQs(winery: Winery): FAQ[] {
  const faqs: FAQ[] = [];

  // Q1: Tasting fee
  if (winery.tasting_fee !== undefined) {
    const feeText = winery.tasting_fee > 0
      ? `$${winery.tasting_fee}`
      : 'free';
    const waiverText = winery.tasting_fee_waived
      ? ` ${winery.tasting_fee_waived}`
      : '';

    faqs.push({
      question: `How much does a wine tasting at ${winery.name} cost?`,
      answer: `Wine tasting at ${winery.name} costs ${feeText}.${waiverText}`,
    });
  }

  // Q2: Reservations
  faqs.push({
    question: `Do I need a reservation to visit ${winery.name}?`,
    answer: winery.reservation_required
      ? `Yes, reservations are required at ${winery.name}. We recommend booking in advance to ensure availability.`
      : `No, ${winery.name} welcomes walk-in visitors. However, reservations are recommended for groups to ensure the best experience.`,
  });

  // Q3: Group size
  if (winery.max_group_size) {
    faqs.push({
      question: `Can ${winery.name} accommodate groups?`,
      answer: `Yes, ${winery.name} can accommodate groups of up to ${winery.max_group_size} guests. For larger parties, please contact the winery directly to arrange a private tasting.`,
    });
  }

  // Q4: Wine styles
  if (winery.wine_styles && winery.wine_styles.length > 0) {
    const styles = winery.wine_styles.slice(0, 5);
    faqs.push({
      question: `What wines does ${winery.name} produce?`,
      answer: `${winery.name} specializes in ${styles.join(', ')}. They are known for producing high-quality wines that showcase the unique terroir of Walla Walla Valley.`,
    });
  }

  // Q5: Hours
  if (winery.hours) {
    faqs.push({
      question: `What are the hours at ${winery.name}?`,
      answer: `${winery.name} is open ${winery.hours}. We recommend confirming hours before your visit, especially during holidays or off-season.`,
    });
  }

  // Q6: Location
  if (winery.address) {
    faqs.push({
      question: `Where is ${winery.name} located?`,
      answer: `${winery.name} is located at ${winery.address} in the ${winery.region || 'Walla Walla'} area of Washington wine country.`,
    });
  }

  // Q7: Pet policy (if specified)
  if (winery.pet_policy) {
    faqs.push({
      question: `Are dogs allowed at ${winery.name}?`,
      answer: winery.pet_policy,
    });
  }

  // Q8: Amenities (if has interesting features)
  if (winery.features && winery.features.length > 0) {
    const amenities = winery.features.slice(0, 5);
    faqs.push({
      question: `What amenities are available at ${winery.name}?`,
      answer: `${winery.name} offers: ${amenities.join(', ')}. Contact the winery for the most current amenities.`,
    });
  }

  // Limit to 5 most relevant FAQs
  return faqs.slice(0, 5);
}

/**
 * Get generic FAQs about Walla Walla wine country
 * (Used when winery-specific data is limited)
 */
export function getGenericWineryFAQs(wineryName: string): FAQ[] {
  return [
    {
      question: `How do I book a tasting at ${wineryName}?`,
      answer: `You can book a tasting at ${wineryName} by visiting their website, calling directly, or using a booking service like wallawalla.travel. Reservations are recommended, especially on weekends.`,
    },
    {
      question: `What should I know before visiting ${wineryName}?`,
      answer: `Before visiting ${wineryName}, consider: arrive during their open hours, designate a driver if tasting multiple wineries, and bring water and snacks. Casual attire is welcome at most Walla Walla wineries.`,
    },
    {
      question: `How many wineries are in Walla Walla?`,
      answer: `Walla Walla Valley has over 130 wineries within 30 miles, making it one of Washington State's premier wine destinations. ${wineryName} is one of the many excellent options to explore.`,
    },
  ];
}
