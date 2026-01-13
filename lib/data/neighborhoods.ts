/**
 * Walla Walla Wine Country Districts
 *
 * Geographic guides to help visitors understand the layout of wine country.
 * Great wineries exist in every district - these pages help with logistics
 * and proximity, not "which district is best."
 */

export interface Neighborhood {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  longDescription: string;
  whatYoullFind: string[];
  highlights: string[];
  practicalInfo: string;
  approximateWineries: number;
  // Rough geographic bounds for filtering wineries
  bounds?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export const neighborhoods: Neighborhood[] = [
  {
    slug: 'airport-district',
    name: 'Airport District',
    shortName: 'Airport',
    description: 'A cluster of wineries near the Walla Walla Regional Airport, offering convenient access and often spacious tasting rooms with vineyard views.',
    longDescription: `The Airport District sits just minutes from the Walla Walla Regional Airport, making it a convenient option for visitors arriving by air or approaching from the west.

This area features a mix of established producers and newer wineries, many with spacious properties and room to spread out. The rolling terrain and cobblestone-studded soils contribute to the area's distinctive wines.

Like all of Walla Walla's districts, you'll find a diverse range of winery styles here—from intimate family operations to larger venues. The proximity of wineries to each other makes it easy to visit several in one trip.`,
    whatYoullFind: [
      'Convenient access from Highway 12',
      'Often ample parking',
      'Mix of large and small producers',
      'Vineyard-surrounded tasting rooms',
    ],
    highlights: [
      'Close to the regional airport',
      'Wineries often clustered together',
      'Scenic vineyard landscapes',
      'Range of tasting experiences',
    ],
    practicalInfo: 'Many wineries here have generous parking and outdoor spaces. Proximity to each other makes multi-winery visits easy.',
    approximateWineries: 17,
  },
  {
    slug: 'downtown',
    name: 'Downtown Walla Walla',
    shortName: 'Downtown',
    description: 'The walkable heart of town with tasting rooms tucked into historic buildings along Main Street and surrounding blocks.',
    longDescription: `Downtown Walla Walla brings wine tasting into an urban setting. Tasting rooms are interspersed with restaurants, shops, and galleries in beautifully restored historic buildings.

The walkable nature of downtown makes it unique in wine country—you can park once and explore on foot, ducking into tasting rooms as you discover them. This is also where you'll find the valley's best dining options.

Downtown attracts a wide range of producers, from prestigious names to small-lot specialists. The urban setting means tasting rooms tend to be more compact and intimate than their rural counterparts.`,
    whatYoullFind: [
      'Walkable tasting room concentration',
      'Historic Main Street setting',
      'Restaurants and shops nearby',
      'Compact, intimate spaces',
    ],
    highlights: [
      '30+ tasting rooms within walking distance',
      'Historic building character',
      'Easy to combine with dining',
      'Evening hours at many locations',
    ],
    practicalInfo: 'Park once and walk. Many tasting rooms are reservation-only due to limited space. Great option when you want to combine wine with dinner.',
    approximateWineries: 30,
  },
  {
    slug: 'southside',
    name: 'Southside',
    shortName: 'Southside',
    description: 'South of town, this area is home to many estate wineries surrounded by their own vineyards with views back toward the Blue Mountains.',
    longDescription: `The Southside extends south from Walla Walla into the agricultural heart of the valley. Many wineries here are estate operations, meaning they grow grapes on the same property where they make and pour wine.

This area offers a more rural wine country experience, with wineries often set among their own vineyards. The terrain provides excellent views looking back toward the Blue Mountains to the east.

Some of Walla Walla's founding wineries established themselves on the Southside, and the area continues to attract both established and emerging producers.`,
    whatYoullFind: [
      'Estate wineries with on-site vineyards',
      'Rural wine country atmosphere',
      'Views of the Blue Mountains',
      'Both pioneering and newer producers',
    ],
    highlights: [
      'Vineyards surrounding tasting rooms',
      'Scenic country drives',
      'Opportunity to see where grapes are grown',
      'Mix of acclaimed names and hidden gems',
    ],
    practicalInfo: 'Driving required between wineries. Some offer vineyard tours. Reservations often required, especially for smaller operations.',
    approximateWineries: 23,
  },
  {
    slug: 'westside',
    name: 'Westside',
    shortName: 'Westside',
    description: 'West of downtown, this evolving area features a mix of wineries, cideries, and craft beverage producers.',
    longDescription: `The Westside has grown as a wine destination in recent years, with new tasting rooms joining established operations west of downtown Walla Walla.

This area has a slightly more eclectic feel, with wineries joined by cideries and other craft beverage producers. You'll find everything from traditional approaches to experimental styles.

The Westside is still developing as a wine district, which means you're likely to discover producers you won't find mentioned in the usual guides.`,
    whatYoullFind: [
      'Mix of wine, cider, and craft beverages',
      'Newer and establishing wineries',
      'Range of traditional to experimental styles',
      'Less touristy atmosphere',
    ],
    highlights: [
      'Craft beverage variety beyond wine',
      'Emerging producers to discover',
      'Meet winemakers directly',
      'More casual atmosphere',
    ],
    practicalInfo: 'Wineries are more spread out than downtown. Good for visitors who enjoy discovering off-the-beaten-path spots.',
    approximateWineries: 15,
  },
  {
    slug: 'eastside-mill-creek',
    name: 'Eastside / Mill Creek',
    shortName: 'Eastside',
    description: 'East of town along Mill Creek Road, this scenic corridor features established wineries with beautiful grounds and Blue Mountain views.',
    longDescription: `The Eastside along Mill Creek Road offers one of Walla Walla's most scenic wine touring routes. This corridor follows the base of the Blue Mountains, with wineries set against dramatic foothill backdrops.

Many of the valley's well-known producers have established themselves here, drawn by the combination of excellent growing conditions and beautiful settings. The Mill Creek drainage provides natural irrigation and creates a distinct microclimate.

The drive along Mill Creek Road is part of the experience—winding through vineyards and farmland with the mountains rising to the east. Wineries here often feature expansive grounds with picnic areas and outdoor seating.`,
    whatYoullFind: [
      'Scenic Blue Mountain views',
      'Established, respected producers',
      'Beautiful winery grounds',
      'Creek-side vineyards',
    ],
    highlights: [
      'Some of the valley\'s most acclaimed wineries',
      'Dramatic mountain backdrop',
      'Well-developed visitor facilities',
      'Excellent for photography',
    ],
    practicalInfo: 'Mill Creek Road winds east from town. Wineries are spread along the route, so plan for driving time. Many offer outdoor seating with views.',
    approximateWineries: 8,
  },
  {
    slug: 'the-rocks-district',
    name: 'The Rocks District',
    shortName: 'The Rocks',
    description: 'A unique AVA defined by its distinctive cobblestone soils—dark basalt rocks that store heat and produce bold, concentrated wines.',
    longDescription: `The Rocks District of Milton-Freewater is one of America's most unique wine appellations. This AVA (American Viticultural Area) is defined not by geography but by its distinctive soil: dark basalt cobblestones deposited by ancient floods.

These fist-sized rocks absorb heat during the day and radiate it back at night, creating a microclimate that produces intensely flavored wines. Syrah thrives here, making up 40% of plantings, followed by Cabernet Sauvignon at 32%.

Though technically in Oregon, The Rocks is integral to the greater Walla Walla wine experience. Wines from this area are known for their bold, concentrated character and distinctive minerality that reflects the unique terroir.`,
    whatYoullFind: [
      'Distinctive cobblestone soils',
      'Bold, concentrated wines',
      'World-class Syrah producers',
      'Unique terroir experience',
    ],
    highlights: [
      'Walk among the famous cobblestones',
      'Learn about terroir firsthand',
      'Taste wines shaped by unique geology',
      'Experience Oregon\'s Walla Walla connection',
    ],
    practicalInfo: 'Located in Milton-Freewater, Oregon, about 10 minutes south of Walla Walla. Worth the drive for wine enthusiasts interested in terroir.',
    approximateWineries: 6,
  },
  {
    slug: 'red-mountain',
    name: 'Red Mountain AVA',
    shortName: 'Red Mountain',
    description: 'Washington\'s most acclaimed Cabernet region, about an hour west near the Tri-Cities. Known for powerful reds and dramatic desert landscapes.',
    longDescription: `Red Mountain is one of Washington's smallest yet most prestigious wine regions, located near Benton City about an hour west of Walla Walla. This AVA has earned a reputation for producing some of the state's most powerful and age-worthy Cabernet Sauvignon.

The southwest-facing slope of Red Mountain receives intense afternoon sun and consistent winds, creating one of the warmest growing sites in Washington. The combination of heat, well-drained soils, and stress on the vines produces wines with remarkable concentration and structure.

While outside the Walla Walla Valley, Red Mountain is a natural addition to a Washington wine tour. Many serious wine enthusiasts consider it essential to compare the bold Cabernets of Red Mountain with Walla Walla's more diverse offerings.`,
    whatYoullFind: [
      'World-class Cabernet Sauvignon',
      'Dramatic desert landscape',
      'Prestigious estate wineries',
      'Bold, structured red wines',
    ],
    highlights: [
      'Home to acclaimed producers like Hedges, Col Solare, and Fidelitas',
      'Distinct terroir from Walla Walla—great for comparison',
      'Spectacular views of the Yakima Valley',
      'Less crowded than more touristy regions',
    ],
    practicalInfo: 'About 1 hour west of Walla Walla via I-82. We offer day trips that combine Red Mountain with Walla Walla for a comprehensive Washington wine experience.',
    approximateWineries: 15,
  },
];

/**
 * Get all neighborhoods
 */
export function getAllNeighborhoods(): Neighborhood[] {
  return neighborhoods;
}

/**
 * Get a neighborhood by slug
 */
export function getNeighborhoodBySlug(slug: string): Neighborhood | null {
  return neighborhoods.find((n) => n.slug === slug) || null;
}

/**
 * Get all neighborhood slugs for static generation
 */
export function getAllNeighborhoodSlugs(): string[] {
  return neighborhoods.map((n) => n.slug);
}
