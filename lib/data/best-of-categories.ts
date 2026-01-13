/**
 * Best-Of Categories for GEO-Optimized Listicle Pages
 *
 * These pages are designed for high citation rates in AI systems.
 * Research shows listicles make up 32% of AI citations.
 */

export interface BestOfCategory {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  metaDescription: string;
  intro: string;
  criteria: string[];
  tips: string[];
  // Filter criteria for querying wineries
  filterField?: string;
  filterValues?: string[];
  amenityFilter?: string;
}

export const bestOfCategories: BestOfCategory[] = [
  {
    slug: 'dog-friendly',
    title: 'Best Dog-Friendly Wineries in Walla Walla',
    shortTitle: 'Dog-Friendly',
    description: 'The top Walla Walla wineries that welcome your four-legged friends.',
    metaDescription: 'Discover the best dog-friendly wineries in Walla Walla. These pet-welcoming tasting rooms offer water bowls, outdoor spaces, and a warm welcome for wine-loving dog owners.',
    intro: `Walla Walla is one of the most dog-friendly wine regions in the country. Many local wineries not only tolerate dogs—they celebrate them. From dedicated dog parks to treats at the tasting bar, these wineries go above and beyond for canine visitors.

We've compiled this list based on factors like outdoor space availability, staff friendliness to pets, water and treat provisions, and overall atmosphere for dogs. All wineries on this list actively welcome well-behaved dogs.`,
    criteria: [
      'Dedicated outdoor tasting areas',
      'Water bowls and treats available',
      'Staff trained for pet interactions',
      'Shade and comfortable spaces for dogs',
      'No restrictions on dog breeds',
    ],
    tips: [
      'Call ahead on busy weekends to confirm dog-friendly availability',
      'Bring your own water and portable bowl as backup',
      'Keep dogs leashed unless explicitly told otherwise',
      'Avoid visiting during peak summer heat—morning tastings are best',
      'Consider bringing a blanket for your dog to rest on',
    ],
    amenityFilter: 'dog-friendly',
  },
  {
    slug: 'romantic',
    title: 'Most Romantic Wineries in Walla Walla',
    shortTitle: 'Romantic',
    description: 'Intimate wineries perfect for couples, anniversaries, and special occasions.',
    metaDescription: 'Discover the most romantic wineries in Walla Walla for couples. Intimate tasting rooms, stunning views, and exceptional wines make these the perfect date destinations.',
    intro: `Walla Walla wine country offers some of the most romantic settings in the Pacific Northwest. Whether you're celebrating an anniversary, planning a proposal, or simply enjoying a couples' getaway, these wineries create the perfect atmosphere.

We selected these wineries based on ambiance, intimate seating options, view quality, and the overall feeling of romance and escape they provide. Each offers something special for couples seeking a memorable experience.`,
    criteria: [
      'Intimate atmosphere and seating',
      'Stunning views or beautiful grounds',
      'Quality wine selections for sharing',
      'Private or semi-private tasting options',
      'Special touches like cheese pairings or sunset hours',
    ],
    tips: [
      'Visit during sunset hours for the most romantic atmosphere',
      'Book a private tasting for an elevated experience',
      'Ask about wine and cheese pairing options',
      'Weekday visits offer more intimate experiences than weekends',
      'Consider staying nearby to extend the romantic escape',
    ],
  },
  {
    slug: 'views',
    title: 'Wineries with the Best Views in Walla Walla',
    shortTitle: 'Best Views',
    description: 'Stunning vineyard vistas and panoramic views at these must-visit Walla Walla wineries.',
    metaDescription: 'Experience breathtaking vineyard views at these Walla Walla wineries. From Blue Mountain panoramas to rolling vineyard hills, these tasting rooms offer Instagram-worthy scenery.',
    intro: `Walla Walla Valley sits at the base of the Blue Mountains, creating some of the most spectacular winery views in wine country. The combination of rolling vineyards, dramatic mountain backdrops, and wide-open skies makes every tasting a visual feast.

These wineries were selected for their exceptional views—places where the scenery enhances the wine experience. Many feature outdoor terraces, vineyard walkways, and picture-perfect backdrops that make the visit unforgettable.`,
    criteria: [
      'Panoramic vineyard or mountain views',
      'Outdoor tasting areas with scenic overlooks',
      'Well-maintained grounds and landscaping',
      'Photo-worthy backdrops',
      'Sunset viewing potential',
    ],
    tips: [
      'Visit in late afternoon for golden hour lighting',
      'Bring a camera—these views deserve to be captured',
      'Spring (May-June) offers lush green vineyards',
      'Fall (September-October) provides harvest colors and activity',
      'Check weather before visiting—clear days offer best mountain views',
    ],
  },
];

/**
 * Get all best-of categories
 */
export function getAllBestOfCategories(): BestOfCategory[] {
  return bestOfCategories;
}

/**
 * Get a best-of category by slug
 */
export function getBestOfCategoryBySlug(slug: string): BestOfCategory | null {
  return bestOfCategories.find((c) => c.slug === slug) || null;
}

/**
 * Get all category slugs for static generation
 */
export function getAllBestOfCategorySlugs(): string[] {
  return bestOfCategories.map((c) => c.slug);
}
