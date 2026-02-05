/**
 * Guides Content for Authority/SEO Pages
 *
 * These comprehensive guides establish topic authority and provide
 * valuable content for both visitors and AI citation.
 */

export interface Guide {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  metaDescription: string;
  heroImage?: string;
  lastUpdated: string;
  readTime: string;
  sections: {
    title: string;
    content: string;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
}

export const guides: Guide[] = [
  {
    slug: 'best-time-to-visit',
    title: 'Best Time to Visit Walla Walla Wine Country',
    shortTitle: 'Best Time to Visit',
    description: 'Seasonal guide to planning your Walla Walla wine trip.',
    metaDescription:
      'Discover the best time to visit Walla Walla wine country. Month-by-month guide covering weather, events, crowds, and insider tips for every season.',
    lastUpdated: 'January 2026',
    readTime: '8 min read',
    sections: [
      {
        title: 'Overview: When to Visit',
        content: `Walla Walla wine country is beautiful year-round, but each season offers a distinct experience. The best time for your visit depends on what you're looking for: harvest energy, quiet tastings, perfect weather, or special events.

**Peak Season (May-October)**: Warm weather, all wineries open, outdoor tastings, harvest activities. Expect crowds on weekends.

**Shoulder Season (March-April, November)**: Milder weather, fewer visitors, more personal attention from winemakers.

**Off Season (December-February)**: Quieter atmosphere, holiday events, some wineries have limited hours.`,
      },
      {
        title: 'Spring (March - May)',
        content: `Spring brings renewal to wine country. Vineyards burst with new growth, and the valley turns green after winter rains.

**March**: Cool and occasionally rainy. Perfect for cozy indoor tastings. Spring Release Weekend typically happens in early May.

**April**: Wildflowers bloom, temperatures warm (50s-60s). Fewer crowds than summer. Some wineries begin outdoor seating.

**May**: Ideal conditions. Warm days (65-75°F), long evenings. The valley is lush and green. Memorial Day weekend is busy.

**Tip**: Spring is excellent for photography and smaller crowds while still enjoying good weather.`,
      },
      {
        title: 'Summer (June - August)',
        content: `Peak tourist season with the best weather and longest days. Expect warm to hot temperatures and dry conditions.

**June**: Near-perfect weather (70s-80s). School's out, so family visitors increase. Long days for extended tastings.

**July**: Hot (85-95°F). Outdoor tastings best in morning or evening. Fourth of July weekend is very busy.

**August**: Peak heat but vineyards are gorgeous. Grapes begin to ripen (veraison). Pre-harvest anticipation.

**Tip**: Visit during weekdays to avoid weekend crowds. Book reservations well in advance for popular wineries.`,
      },
      {
        title: 'Fall (September - November)',
        content: `Harvest season is magical. This is when Walla Walla truly comes alive with wine country energy.

**September**: Harvest begins. Vineyards are busy with picking. Weather is ideal (70s). Many special harvest events.

**October**: Peak harvest. Crush is underway at most wineries. Fall colors emerge. Fall Release Weekend draws crowds.

**November**: Harvest wraps up. Thanksgiving weekend is popular but manageable. Weather cools (40s-50s).

**Tip**: Book harvest experiences in advance. Seeing grape clusters ready for picking and crush activities is unforgettable.`,
      },
      {
        title: 'Winter (December - February)',
        content: `The quiet season offers intimate experiences and holiday charm. Some wineries have limited hours.

**December**: Holiday events and wine release parties. Light crowds. Some snow possible but usually mild.

**January**: Quietest month. Many locals take vacations. Great time for one-on-one winemaker encounters.

**February**: Wine club pickup events begin. Winter Wine Barrel Tasting Weekend is popular. Days start getting longer.

**Tip**: Call ahead in winter to confirm hours. Many wineries are happy to arrange appointments even if not regularly open.`,
      },
      {
        title: 'Major Wine Events',
        content: `Plan around these signature Walla Walla Valley events:

**Spring Release Weekend (Early May)**: New vintage releases, special tastings, winery open houses.

**Balloon Stampede (Mid-May)**: Hot air balloons fill the sky. Festive atmosphere valley-wide.

**Summer Wine Series (June-August)**: Concerts, dinners, and special tastings at various wineries.

**Celebrate Walla Walla Valley Wine (June)**: Valley-wide celebration with unique events at 100+ wineries.

**Fall Release Weekend (October)**: Fall vintages debut. Peak crowds. Book early.

**Holiday Barrel Tasting (November-December)**: Sample wines straight from the barrel at participating wineries.`,
      },
    ],
    faqs: [
      {
        question: 'What is the best month to visit Walla Walla wine country?',
        answer:
          'September and October are ideal for most visitors - harvest season brings perfect weather (70s), beautiful fall colors, and exciting winery activities. May and June are excellent alternatives with fewer crowds.',
      },
      {
        question: 'When is harvest season in Walla Walla?',
        answer:
          'Harvest typically runs from late August through October, with peak activity in September. Each grape variety is harvested at different times, so there is activity throughout this period.',
      },
      {
        question: 'Are Walla Walla wineries open in winter?',
        answer:
          'Yes, most wineries remain open year-round, though some have reduced hours (weekends only) December through February. Call ahead or check websites to confirm winter hours.',
      },
      {
        question: 'How far in advance should I book for peak season?',
        answer:
          'For popular wineries during May-October weekends or event weekends, book 2-4 weeks in advance. For regular weekdays, 1 week is usually sufficient. Some intimate wineries book up faster.',
      },
    ],
  },
  {
    slug: 'wine-101',
    title: 'Walla Walla Wine 101: A Beginner\'s Guide',
    shortTitle: 'Wine 101',
    description: 'Everything first-time visitors need to know about Walla Walla wines.',
    metaDescription:
      'New to Walla Walla wine? Learn about the region\'s signature grape varieties, tasting room etiquette, and how to make the most of your wine country visit.',
    lastUpdated: 'January 2026',
    readTime: '10 min read',
    sections: [
      {
        title: 'Why Walla Walla?',
        content: `Walla Walla has rapidly become one of America's premier wine destinations. Here's what makes it special:

**World-Class Wines**: The region produces exceptional Cabernet Sauvignon, Syrah, and Merlot that rival Napa and international competitors.

**Approachable Atmosphere**: Unlike some wine regions, Walla Walla maintains a friendly, unpretentious vibe. Winemakers often pour their own wines.

**Concentrated Excellence**: With 120+ wineries within 30 miles, you can visit world-class producers without extensive travel.

**Unique Terroir**: The combination of volcanic soils, elevation, and climate creates distinctive wines you can't find elsewhere.`,
      },
      {
        title: 'Signature Grape Varieties',
        content: `Walla Walla excels with several varieties. Here's what to look for:

**Cabernet Sauvignon**: The king of Walla Walla reds. Rich, full-bodied with dark fruit, firm tannins, and excellent aging potential. Great for collectors.

**Syrah**: The region's rising star. Produces both bold, peppery wines and elegant, Rhône-style expressions. Very food-friendly.

**Merlot**: Soft, approachable reds with plum and cherry notes. Often overlooked but excellent quality in Walla Walla.

**Bordeaux Blends**: Many wineries create proprietary blends combining Cabernet, Merlot, and other Bordeaux varieties.

**White Wines**: Though known for reds, excellent Chardonnay, Viognier, and white Rhône blends are available.`,
      },
      {
        title: 'Tasting Room Basics',
        content: `New to wine tasting? Here's what to expect:

**Tasting Fees**: Most wineries charge $20-40 for a flight of 4-6 wines. Fees are typically waived with purchase.

**Reservations**: Most wineries require reservations, especially on weekends. Check ahead.

**What Happens**: A staff member guides you through several wines, explaining each. Ask questions! That's what they're there for.

**Spitting**: It's perfectly acceptable (encouraged!) to use spit buckets. This lets you taste more wines safely.

**Purchasing**: No pressure to buy, but if you find something you love, take it home. Many wines sell out and aren't available elsewhere.

**Time Per Winery**: Depending on group size, plan 45-80 minutes per stop for a relaxed, complete experience.

**Dress Code**: Casual is fine. Comfortable shoes recommended.`,
      },
      {
        title: 'Tasting Etiquette Tips',
        content: `Be a welcome guest with these simple guidelines:

**Do**:
- Ask questions - staff love sharing knowledge
- Take notes if you want to remember favorites
- Tip if service is exceptional (not always expected)
- Tell them what styles you typically enjoy

**Don't**:
- Wear strong perfume or cologne
- Talk loudly on phones
- Rush - savor the experience
- Feel obligated to finish every pour`,
      },
      {
        title: 'How Many Wineries in One Day?',
        content: `This is the most common question from first-timers:

**3 Wineries**: Ideal for a relaxed, quality experience. You'll remember each stop.

**4 Wineries**: Possible but ambitious. Consider using a pour/spit strategy.

**More than 4 wineries** is not recommended, even if that's been done in other regions. Pours tend to be generous in the Walla Walla Valley and even at 4 wineries, the experience tends to decline before the day concludes.

**Our Recommendation**: Less is more. Three great wineries with time to enjoy a quality lunch makes for a fantastic day.

**Pacing Tips**:
- Start around 11am when most wineries open (some open at 10am)
- Take a lunch break mid-day
- Save one special winery for late afternoon
- Drink water between stops`,
      },
      {
        title: 'Building Your Palate',
        content: `Not sure what you like? Here's how to discover your preferences:

**For Bold Wine Lovers**: Start with Cabernet Sauvignon and rich Syrah. Ask for wineries known for "big" wines.

**For Lighter Preferences**: Explore Merlot, rosé, and white wines. Many Walla Walla whites are excellent.

**For Adventurous Types**: Try varietal wines like Tempranillo, Sangiovese, or unusual blends.

**Tasting Tip**: Tell your server "I usually like ___" and they'll guide you to similar wines or suggest something new to try.

**Don't Like It?**: It's okay! Wine is personal. A polite "this one isn't for me" is perfectly acceptable.`,
      },
    ],
    faqs: [
      {
        question: 'How much should I budget for wine tasting in Walla Walla?',
        answer:
          'Plan for $20-40 per person per winery for tasting fees. Many fees are waived with purchase. If you book a tour, you can comfortably visit 3-4 wineries and let someone else handle the driving.',
      },
      {
        question: 'Do I need to know about wine to enjoy Walla Walla?',
        answer:
          'Not at all! Walla Walla is famously welcoming to beginners. Tasting room staff are happy to explain everything and help you discover what you enjoy.',
      },
      {
        question: 'What is Walla Walla wine country known for?',
        answer:
          'Walla Walla is renowned for exceptional Cabernet Sauvignon and Syrah. The region\'s unique combination of volcanic soils, warm days, cool nights, and dedicated winemakers produces world-class red wines.',
      },
      {
        question: 'Can I bring children to Walla Walla wineries?',
        answer:
          'Policies vary by winery. Many welcome well-behaved children, especially those with outdoor spaces. Some intimate tasting rooms prefer adults only. Call ahead to confirm.',
      },
    ],
  },
  {
    slug: 'group-planning-tips',
    title: 'Planning a Group Wine Tour in Walla Walla',
    shortTitle: 'Group Planning',
    description: 'Essential tips for organizing wine tours with friends, family, or colleagues.',
    metaDescription:
      'Planning a group wine trip to Walla Walla? Expert tips for booking wineries, transportation, accommodations, and creating an unforgettable group experience.',
    lastUpdated: 'January 2026',
    readTime: '7 min read',
    sections: [
      {
        title: 'Group Size Considerations',
        content: `The size of your group significantly affects your planning:

**Small Groups (2-6 people)**: Maximum flexibility. Most wineries accommodate walk-ins. Easy to book.

**Medium Groups (7-12 people)**: Advance reservations essential. Most wineries can accommodate with notice.

**Large Groups (12+ people)**: Requires more planning. Some wineries have space limits. Consider private tours.

**Very Large Groups (20+)**: Contact wineries directly. Many prefer to host large groups during off-peak times.

**Tip**: Be honest about group size when booking. Showing up with more people than reserved is a common problem that creates issues for wineries.`,
      },
      {
        title: 'Booking Wineries',
        content: `How and when to secure your spots:

**When to Book**:
- Small groups (weekdays): 1 week ahead
- Small groups (weekends): 2 weeks ahead
- Medium groups: 3-4 weeks ahead
- Large groups: 1-2 months ahead
- Event weekends: As early as possible

**What to Tell Them**:
- Exact group size
- Date and preferred time
- Any special occasions (birthday, bachelor/ette)
- Dietary restrictions for food pairings
- Experience level of the group

**Pro Tips**:
- Book your "must-visit" wineries first
- Have backup options in case first choices are full
- Confirm reservations 2-3 days before`,
      },
      {
        title: 'Transportation Options',
        content: `Getting around safely is essential when wine is involved:

**Designated Driver**: Free but requires one person to skip tasting. Use spit buckets if driver wants to taste.

**Private Tour Company**: Best experience. Driver handles logistics, knows the area, can access exclusive opportunities. Costs vary ($150-400+ per person for full day).

**Rideshare (Uber/Lyft)**: Available but limited in wine country. Can be expensive and unreliable between wineries.

**Hotel Shuttle**: Some hotels offer wine tour shuttles. Ask when booking.

**Bicycle Tours**: Fun option for Downtown Walla Walla wineries. Multiple providers available.

**Our Recommendation**: For groups of 6+, a private tour company provides the best value and experience.`,
      },
      {
        title: 'Creating a Great Itinerary',
        content: `Structure your day for maximum enjoyment:

**Morning (10am-12pm)**: Start with 1-2 wineries while fresh. Begin with lighter wines.

**Lunch (12-1:30pm)**: Essential break. Many wineries have food or recommend nearby restaurants.

**Afternoon (1:30-4:30pm)**: 2-3 more wineries. This is when richer reds shine.

**Evening**: Dinner reservation in downtown Walla Walla. Don't plan more tastings after 5pm.

**Geography**: Group wineries by area to minimize driving. Downtown → Southside → Airport District is a common flow.

**Variety**: Mix established names with hidden gems. Different tasting experiences keep things interesting.`,
      },
      {
        title: 'Managing Different Preferences',
        content: `Groups often have varied experience levels and tastes:

**Wine Knowledge Gap**: Choose wineries with patient staff who welcome beginners. Avoid intimidating, ultra-premium spots.

**Taste Preferences**: Tell tasting room staff what your group enjoys - they'll recommend wineries that fit.

**Budget Differences**: Discuss spending expectations upfront. Some prefer to split costs; others pay their own way.

**Pace Preferences**: Not everyone wants to hit six wineries. Build in optional stops where people can relax or skip.

**Communication**: Send the itinerary in advance. Get buy-in on the plan before the day.`,
      },
      {
        title: 'Common Group Mistakes',
        content: `Avoid these pitfalls that can derail a group trip:

**Over-scheduling**: Trying to visit too many wineries. Quality over quantity.

**Under-booking**: Assuming you can walk in everywhere. Weekend groups especially need reservations.

**Skipping Lunch**: By 2pm, everyone is tired and cranky. Build in a real meal break.

**Uneven Drinking**: Some people drink more than others. Pace matters for everyone's enjoyment.

**Last-Minute Changes**: Adding people or changing times day-of creates problems. Stick to the plan.

**Ignoring Transportation**: Figure out the driver situation BEFORE the day starts, not after the first tasting.`,
      },
    ],
    faqs: [
      {
        question: 'What is the maximum group size for Walla Walla wineries?',
        answer:
          'It varies by winery. Many accommodate groups of 12-16 comfortably. Larger groups (20+) may need to split up or book private experiences. Always call ahead to confirm capacity.',
      },
      {
        question: 'How much does a private wine tour cost in Walla Walla?',
        answer:
          'Private tours typically range from $150-400+ per person for a full day, depending on group size, included meals, and tour company. Smaller groups pay more per person; larger groups get better rates.',
      },
      {
        question: 'Can we bring our own food to wineries?',
        answer:
          'Most wineries prefer you purchase their food offerings if available. For picnic-style wineries with outdoor areas, outside food is often allowed. Ask when booking to avoid awkward moments.',
      },
      {
        question: 'How do we handle payment for group wine tastings?',
        answer:
          'Most wineries can split payments or take one payment. Discuss with your group in advance. Some groups collect money beforehand; others split at each stop. Venmo and similar apps make day-of settling easier.',
      },
    ],
  },
];

/**
 * Get all guides
 */
export function getAllGuides(): Guide[] {
  return guides;
}

/**
 * Get guide by slug
 */
export function getGuideBySlug(slug: string): Guide | null {
  return guides.find((g) => g.slug === slug) || null;
}

/**
 * Get all guide slugs for static generation
 */
export function getAllGuideSlugs(): string[] {
  return guides.map((g) => g.slug);
}
