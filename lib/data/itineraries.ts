/**
 * Sample Itineraries for SEO/Authority Content
 *
 * These itineraries provide concrete examples of Walla Walla trips
 * and serve as templates for AI-assisted trip planning.
 */

export interface ItineraryStop {
  time: string;
  name: string;
  type: 'winery' | 'restaurant' | 'activity' | 'lodging';
  description: string;
  tip?: string;
}

export interface ItineraryDay {
  dayNumber: number;
  title: string;
  description: string;
  stops: ItineraryStop[];
}

export interface Itinerary {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  metaDescription: string;
  duration: string;
  bestFor: string[];
  idealGroupSize: string;
  estimatedCost: string;
  lastUpdated: string;
  customizeUrl?: string; // Link to /my-trips for customization
  days: ItineraryDay[];
  tips: string[];
  faqs: {
    question: string;
    answer: string;
  }[];
}

export const itineraries: Itinerary[] = [
  {
    slug: 'weekend-getaway',
    title: 'Walla Walla Weekend Wine Getaway',
    shortTitle: 'Weekend Getaway',
    description: 'The perfect 2-day wine country escape with a balanced mix of tastings, dining, and relaxation.',
    metaDescription:
      'Plan the perfect Walla Walla weekend with this 2-day wine country itinerary. Includes top wineries, restaurants, and insider tips for an unforgettable getaway.',
    duration: '2 Days',
    bestFor: ['Couples', 'Friends', 'First-timers'],
    idealGroupSize: '2-6 people',
    estimatedCost: '$300-500 per person',
    lastUpdated: 'January 2026',
    customizeUrl: '/my-trips',
    days: [
      {
        dayNumber: 1,
        title: 'Downtown Discovery',
        description: 'Ease into wine country with downtown Walla Walla tastings and excellent dining.',
        stops: [
          {
            time: '11:00 AM',
            name: 'Check-in at Marcus Whitman Hotel',
            type: 'lodging',
            description: 'Historic downtown hotel within walking distance to tasting rooms. The lobby bar at L\'Ecole Heritage Wine Bar is right inside.',
          },
          {
            time: '11:30 AM',
            name: 'Kontos Cellars',
            type: 'winery',
            description: 'Family-owned winery with a welcoming covered patio and wine barrel swings. Great Bordeaux varietals and a warm, relaxed atmosphere.',
            tip: 'Ask about their estate vineyard story - the Kontos family loves sharing their journey.',
          },
          {
            time: '1:00 PM',
            name: 'Lunch at Passatempo Taverna',
            type: 'restaurant',
            description: 'Italian cuisine with house-made pastas and wood-fired pizzas. Perfect for sharing plates and local wines by the glass.',
          },
          {
            time: '2:30 PM',
            name: 'Seven Hills Winery',
            type: 'winery',
            description: 'One of Walla Walla\'s founding wineries (1988) in a beautiful historic building. Classic, approachable wines with knowledgeable staff.',
            tip: 'Seven Hills was one of the first seven wineries in Walla Walla - ask about the valley\'s early days.',
          },
          {
            time: '4:30 PM',
            name: 'Rest & Refresh',
            type: 'activity',
            description: 'Return to hotel. Freshen up before dinner. Explore downtown shops if time permits.',
          },
          {
            time: '6:30 PM',
            name: 'Dinner at Hattaway\'s on Alder',
            type: 'restaurant',
            description: 'Southern-inspired cuisine with Pacific Northwest ingredients. Highly rated (4.7 stars) with creative cocktails and an excellent wine list.',
            tip: 'Make reservations well in advance - this is one of the most popular spots in town.',
          },
        ],
      },
      {
        dayNumber: 2,
        title: 'Wine Country Exploration',
        description: 'Venture out to estate wineries for vineyard views and behind-the-scenes experiences.',
        stops: [
          {
            time: '9:00 AM',
            name: 'Breakfast at Bacon & Eggs',
            type: 'restaurant',
            description: 'Hearty breakfast to fuel your wine country day. Local favorite with generous portions.',
          },
          {
            time: '10:30 AM',
            name: 'L\'Ecole No 41',
            type: 'winery',
            description: 'Third-oldest winery in the valley, housed in a charming 1915 schoolhouse. Educational, welcoming, and a Walla Walla icon.',
            tip: 'The historic schoolhouse setting makes this a must-see. Walk-ins welcome.',
          },
          {
            time: '12:30 PM',
            name: 'Picnic Lunch from Graze',
            type: 'restaurant',
            description: 'Pick up gourmet sandwiches and provisions from Graze. Many wineries welcome picnickers on their grounds.',
          },
          {
            time: '2:00 PM',
            name: 'FIGGINS',
            type: 'winery',
            description: 'From the Leonetti Cellar family, with stunning views and Washington\'s first hillside basalt caves. Elevated tasting experience.',
            tip: 'Reserve the cave tour in advance ($150/person) for a truly memorable experience.',
          },
          {
            time: '4:00 PM',
            name: 'Return Downtown',
            type: 'activity',
            description: 'Head back to downtown to rest and freshen up before dinner.',
          },
          {
            time: '6:00 PM',
            name: 'Dinner at Brasserie Four',
            type: 'restaurant',
            description: 'French bistro in the heart of downtown. Classic dishes, excellent wine list, and perfect for a relaxed final evening.',
          },
        ],
      },
    ],
    tips: [
      'Book restaurant reservations as early as possible - popular spots fill up weeks in advance, especially for weekends',
      'Bring a cooler for wine purchases - summer heat can damage wine in a hot car',
      'If driving yourself: limit to 1-2 tasting stops with a full lunch in between. For more wineries, book a tour so everyone can fully enjoy',
      'Consider shipping wine home if purchasing significant quantities',
    ],
    faqs: [
      {
        question: 'How many wineries can we visit in a Walla Walla weekend?',
        answer:
          'If you have a designated driver or book a tour, 2-3 wineries per day works well. If everyone is tasting and driving, limit to 1-2 stops per day with a full meal in between - safety comes first, and a professional tour lets everyone fully enjoy the experience.',
      },
      {
        question: 'Do we need a car for this itinerary?',
        answer:
          'Day 1 is walkable from downtown hotels. Day 2 requires transportation to visit estate wineries. Options include rental car (with designated driver), rideshare, or private tour.',
      },
      {
        question: 'What is the best weekend to visit Walla Walla?',
        answer:
          'Any weekend May-October offers excellent experiences. Avoid major event weekends (Spring/Fall Release) unless you plan to attend. September-October harvest season is particularly magical, but also a very busy time for both guests and wineries.',
      },
    ],
  },
  {
    slug: 'first-timers',
    title: 'First-Timer\'s Guide to Walla Walla',
    shortTitle: 'First-Timers',
    description: 'An approachable introduction to Walla Walla wine country for those new to wine tasting.',
    metaDescription:
      'New to Walla Walla wine? This beginner-friendly itinerary takes the intimidation out of wine tasting with welcoming wineries and helpful tips.',
    duration: '1-2 Days',
    bestFor: ['Wine beginners', 'Curious visitors', 'Learning-focused'],
    idealGroupSize: '2-4 people',
    estimatedCost: '$150-300 per person',
    lastUpdated: 'January 2026',
    customizeUrl: '/my-trips',
    days: [
      {
        dayNumber: 1,
        title: 'Welcome to Wine Country',
        description: 'A gentle introduction with beginner-friendly wineries known for patient, educational staff.',
        stops: [
          {
            time: '10:30 AM',
            name: 'Orientation in Downtown',
            type: 'activity',
            description: 'Start your day downtown. Stop by Visit Walla Walla near First and Main (staffed during main daytime hours) for maps and recommendations, or grab wine maps at most hotels and tasting rooms.',
            tip: 'Ask any tasting room staff for recommendations based on your taste preferences.',
          },
          {
            time: '11:00 AM',
            name: 'L\'Ecole Heritage Wine Bar',
            type: 'winery',
            description: 'Walk-ins welcome at this tasting room inside the Marcus Whitman Hotel. L\'Ecole is the third-oldest winery in the valley - a perfect low-pressure start for beginners.',
            tip: 'Tell your server "This is our first time wine tasting" - they\'ll tailor the experience.',
          },
          {
            time: '12:30 PM',
            name: 'Lunch at TMACs',
            type: 'restaurant',
            description: 'Relaxed upscale-casual dining with a diverse menu. Good for groups with different tastes.',
          },
          {
            time: '2:00 PM',
            name: 'Kontos Cellars',
            type: 'winery',
            description: 'Warm family atmosphere with owners who love helping newcomers discover their preferences. The covered patio with wine barrel swings adds to the welcoming vibe.',
            tip: 'Notice how the same grape variety tastes different from different producers.',
          },
          {
            time: '4:00 PM',
            name: 'Rest at Hotel',
            type: 'activity',
            description: 'Return to your hotel to rest and refresh. Decompress and discuss your favorites.',
          },
          {
            time: '6:00 PM',
            name: 'Dinner at Passatempo Taverna',
            type: 'restaurant',
            description: 'Italian restaurant with excellent house-made pastas. Approachable wine list with helpful staff.',
            tip: 'Ask for a wine recommendation to pair with your meal - great way to continue learning.',
          },
        ],
      },
      {
        dayNumber: 2,
        title: 'Building Your Palate',
        description: 'Apply what you learned yesterday with more tastings focused on discovering your preferences.',
        stops: [
          {
            time: '9:30 AM',
            name: 'Coffee at Colville Street Patisserie',
            type: 'restaurant',
            description: 'Outstanding French pastries and coffee. Fuel up before another day of discovery.',
          },
          {
            time: '10:00 AM',
            name: 'Seven Hills Winery',
            type: 'winery',
            description: 'One of Walla Walla\'s founding wineries with patient, knowledgeable staff. Classic wines in a beautiful historic building - a quintessential Walla Walla experience.',
            tip: 'Take notes on what you enjoy. Look for patterns in your preferences.',
          },
          {
            time: '12:30 PM',
            name: 'Light Lunch from Graze',
            type: 'restaurant',
            description: 'Grab a gourmet sandwich or provisions for a quick lunch between tastings.',
          },
          {
            time: '2:30 PM',
            name: 'Pursued by Bear',
            type: 'winery',
            description: 'Kyle MacLachlan\'s intimate tasting room in a 1920s pink storefront. Reservations required, max 6 guests - a unique, memorable experience.',
            tip: 'Book in advance! This small space fills up quickly.',
          },
          {
            time: '4:00 PM',
            name: 'Recap Your Discoveries',
            type: 'activity',
            description: 'Review your notes over coffee or a snack. You\'re now an informed wine enthusiast! If you tasted today, stay for dinner and depart tomorrow morning.',
          },
        ],
      },
    ],
    tips: [
      'There are no wrong answers in wine - drink what you enjoy',
      'Don\'t be afraid to use the spit bucket, especially early in the day',
      'Water between tastings helps cleanse your palate and keep you hydrated',
      'Ask "what would you recommend for someone who likes X?" - staff love helping',
      'Tasting fees ($20-40) are usually waived with purchase',
    ],
    faqs: [
      {
        question: 'Do I need to know about wine before visiting Walla Walla?',
        answer:
          'Not at all! Walla Walla is known for its welcoming, unpretentious atmosphere. Tasting room staff genuinely enjoy introducing newcomers to wine. Ask questions freely.',
      },
      {
        question: 'What if I don\'t like wine?',
        answer:
          'Wine preference is personal. If you haven\'t found wines you enjoy yet, Walla Walla\'s diversity gives you the best chance. Tell staff what you usually drink (beer, cocktails, soda) and they can suggest approachable wines.',
      },
      {
        question: 'Is wine tasting expensive?',
        answer:
          'Tasting fees run $20-40 per winery, often waived with purchase. Book a tour and you can comfortably visit several wineries while someone else drives. Set a budget before you go if cost is a concern.',
      },
    ],
  },
  {
    slug: 'romantic-escape',
    title: 'Romantic Walla Walla Wine Country Escape',
    shortTitle: 'Romantic Escape',
    description: 'An intimate couples\' retreat featuring scenic wineries, fine dining, and memorable moments.',
    metaDescription:
      'Plan a romantic Walla Walla getaway with this couples-focused itinerary featuring intimate wineries, sunset views, fine dining, and luxurious accommodations.',
    duration: '2-3 Days',
    bestFor: ['Couples', 'Anniversaries', 'Proposals', 'Honeymoons'],
    idealGroupSize: '2 people',
    estimatedCost: '$500-800 per person',
    lastUpdated: 'January 2026',
    customizeUrl: '/my-trips',
    days: [
      {
        dayNumber: 1,
        title: 'Arrival & Indulgence',
        description: 'Set the romantic tone with upscale accommodations and an intimate evening.',
        stops: [
          {
            time: '3:00 PM',
            name: 'Check-in at Inn at Abeja',
            type: 'lodging',
            description: 'USA Today\'s Best Winery Hotel 2025. A restored farmstead with private cottages, included breakfast, and complimentary wine tasting at Abeja winery on the property.',
            tip: 'Book the cottage for maximum privacy and romance.',
          },
          {
            time: '4:00 PM',
            name: 'Private Tasting at Abeja',
            type: 'winery',
            description: 'Included with your stay at the Inn. Taste award-winning wines surrounded by the beautiful estate grounds.',
            tip: 'Request a sunset timing for magical light over the vineyards.',
          },
          {
            time: '7:00 PM',
            name: 'Dinner at The Kitchen at Abeja',
            type: 'restaurant',
            description: 'Five-course prix-fixe dinner for Inn guests. Intimate, romantic, and featuring wines from the estate. Reserve in advance.',
            tip: 'Let them know if you\'re celebrating a special occasion.',
          },
          {
            time: '9:30 PM',
            name: 'Evening on the Estate',
            type: 'activity',
            description: 'Stroll the beautiful grounds, enjoy a nightcap by the fire, and soak in the romance of wine country.',
          },
        ],
      },
      {
        dayNumber: 2,
        title: 'Scenic Romance',
        description: 'Visit wineries with the most romantic settings and stunning views.',
        stops: [
          {
            time: '9:00 AM',
            name: 'Breakfast at Inn at Abeja',
            type: 'restaurant',
            description: 'Enjoy the included gourmet breakfast at your accommodations. No need to rush.',
          },
          {
            time: '10:30 AM',
            name: 'Echolands',
            type: 'winery',
            description: 'The highest elevation winery in Walla Walla (1,400-1,800ft) with sweeping Blue Mountain views. The glass-walled tasting room is stunning. Doug Frost is both a Master Sommelier AND Master of Wine.',
            tip: 'Share a bottle instead of individual tastings for a more intimate experience.',
          },
          {
            time: '1:00 PM',
            name: 'Lunch at Passatempo Taverna',
            type: 'restaurant',
            description: 'Return to downtown for Italian cuisine with house-made pastas. Cozy and romantic.',
          },
          {
            time: '3:00 PM',
            name: 'Aluvé',
            type: 'winery',
            description: 'Veteran-owned winery where owners Kelly and JJ pour for you personally on a covered patio overlooking their vines. At 1,500ft elevation in the Blue Mountain foothills, the setting is intimate and memorable.',
            tip: 'Winemakers love hearing your story - share why you\'re visiting.',
          },
          {
            time: '5:30 PM',
            name: 'Return to Inn',
            type: 'activity',
            description: 'Head back to the Inn at Abeja to freshen up before dinner.',
          },
          {
            time: '6:30 PM',
            name: 'Dinner at Brasserie Four',
            type: 'restaurant',
            description: 'French bistro in downtown Walla Walla. Classic dishes, excellent wine list, and perfect for a romantic evening out.',
          },
        ],
      },
      {
        dayNumber: 3,
        title: 'Leisurely Departure',
        description: 'A slow morning before heading home with memories (and wine) to last.',
        stops: [
          {
            time: '9:00 AM',
            name: 'Breakfast at Inn at Abeja',
            type: 'restaurant',
            description: 'No alarms. Linger over coffee and relive the highlights of your trip.',
          },
          {
            time: '11:00 AM',
            name: 'FIGGINS Cave Tour (Optional)',
            type: 'winery',
            description: 'If you want one more special experience, reserve the cave tour at FIGGINS ($150/person). Washington\'s first hillside basalt caves with stunning views.',
            tip: 'Reserve well in advance - these tours book up quickly.',
          },
          {
            time: '12:30 PM',
            name: 'Farewell Lunch at TMACs',
            type: 'restaurant',
            description: 'Upscale comfort food for your final meal. Or grab picnic supplies from Graze for the road.',
          },
          {
            time: '2:00 PM',
            name: 'Depart Walla Walla',
            type: 'activity',
            description: 'Head home with wine, photos, and promises to return.',
          },
        ],
      },
    ],
    tips: [
      'Book accommodations and dinner reservations as soon as you know your dates - popular spots fill up fast',
      'Request special touches when booking - wineries and restaurants often accommodate romantic celebrations',
      'Book a tour so you can both fully enjoy tastings without worrying about driving',
      'Golden hour (1-2 hours before sunset) is the most romantic time at scenic wineries',
      'Ask your hotel about romantic touches they can arrange for your stay',
    ],
    faqs: [
      {
        question: 'Is Walla Walla good for a honeymoon or anniversary?',
        answer:
          'Absolutely! Walla Walla offers intimate accommodations, world-class dining, beautiful scenery, and relaxed sophistication perfect for romantic celebrations. Many couples return annually.',
      },
      {
        question: 'Can I arrange a proposal at a winery?',
        answer:
          'Yes! Contact wineries directly to arrange private moments. Many have scenic overlooks or private spaces perfect for proposals. Staff are often happy to help coordinate details.',
      },
      {
        question: 'What\'s the most romantic time of year in Walla Walla?',
        answer:
          'Late September through October offers gorgeous fall colors, harvest activities, and comfortable weather. Late spring (May-June) features lush vineyards and long evening light. Winter offers cozy, intimate atmosphere.',
      },
    ],
  },
];

/**
 * Get all itineraries
 */
export function getAllItineraries(): Itinerary[] {
  return itineraries;
}

/**
 * Get itinerary by slug
 */
export function getItineraryBySlug(slug: string): Itinerary | null {
  return itineraries.find((i) => i.slug === slug) || null;
}

/**
 * Get all itinerary slugs for static generation
 */
export function getAllItinerarySlugs(): string[] {
  return itineraries.map((i) => i.slug);
}
