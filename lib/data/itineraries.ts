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
    days: [
      {
        dayNumber: 1,
        title: 'Downtown Discovery',
        description: 'Ease into wine country with downtown Walla Walla tastings and excellent dining.',
        stops: [
          {
            time: '11:00 AM',
            name: 'Check-in at Downtown Hotel',
            type: 'lodging',
            description: 'Drop your bags at Marcus Whitman or another downtown property. Walking distance to tasting rooms.',
          },
          {
            time: '11:30 AM',
            name: 'Downtown Tasting Room',
            type: 'winery',
            description: 'Start with a downtown tasting room for easy walking access. Many excellent options on Main Street.',
            tip: 'Ask what wines are exclusive to the tasting room vs. available online.',
          },
          {
            time: '1:00 PM',
            name: 'Lunch at Saffron Mediterranean',
            type: 'restaurant',
            description: 'Fresh, flavorful Mediterranean cuisine perfect for wine country. Great for sharing.',
          },
          {
            time: '2:30 PM',
            name: 'Second Downtown Tasting',
            type: 'winery',
            description: 'Explore a different style - perhaps a Rhône specialist or boutique producer.',
            tip: 'Look for winemaker pours if available - great opportunity to learn.',
          },
          {
            time: '4:30 PM',
            name: 'Rest & Refresh',
            type: 'activity',
            description: 'Return to hotel. Freshen up before dinner. Explore downtown shops if time permits.',
          },
          {
            time: '6:30 PM',
            name: 'Dinner Downtown',
            type: 'restaurant',
            description: 'Choose from excellent downtown options like Saffron Mediterranean or Brasserie Four. Regional cuisine with excellent wine lists.',
            tip: 'Make reservations as early as possible - popular spots book up fast.',
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
            name: 'Southside Estate Winery',
            type: 'winery',
            description: 'Drive south to experience estate vineyards. Beautiful settings and wines you can only taste here.',
            tip: 'Call ahead to confirm hours and availability for your group.',
          },
          {
            time: '12:30 PM',
            name: 'Winery Picnic Lunch',
            type: 'restaurant',
            description: 'Many wineries allow picnics on their grounds. Pick up sandwiches from Graze or provisions from a local market.',
          },
          {
            time: '2:00 PM',
            name: 'Second Estate Visit',
            type: 'winery',
            description: 'Another estate winery - choose based on wine style preference or scenic setting.',
            tip: 'Ask about library wines or special releases not on the standard tasting menu.',
          },
          {
            time: '4:00 PM',
            name: 'Airport District Stop',
            type: 'winery',
            description: 'End with an Airport District winery. Relaxed atmosphere, often with food trucks or snacks.',
          },
          {
            time: '5:30 PM',
            name: 'Dinner & Overnight',
            type: 'activity',
            description: 'After a day of tasting, enjoy dinner downtown and stay another night. Depart refreshed in the morning.',
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
          'If you have a designated driver or book a tour, 3-4 wineries per day works well. If everyone is tasting and driving, limit to 1-2 stops per day with a full meal in between - safety comes first, and a professional tour lets everyone fully enjoy the experience.',
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
            name: 'First Tasting Experience',
            type: 'winery',
            description: 'Start with a winery known for patient, welcoming staff who enjoy helping newcomers discover wine. Ask lots of questions!',
            tip: 'Tell your server "This is our first time wine tasting" - they\'ll tailor the experience.',
          },
          {
            time: '12:30 PM',
            name: 'Casual Lunch',
            type: 'restaurant',
            description: 'Grab lunch at Graze or TMACs for relaxed, wine-country-appropriate fare.',
          },
          {
            time: '2:00 PM',
            name: 'Second Tasting - Different Style',
            type: 'winery',
            description: 'Try a different style - maybe a focus on single varietals, or a different neighborhood vibe. Compare the experience.',
            tip: 'Notice how the same grape variety tastes different from different producers.',
          },
          {
            time: '4:00 PM',
            name: 'Wine & Cheese at Hotel',
            type: 'activity',
            description: 'Return to your hotel to rest and refresh. Decompress and discuss your favorites.',
          },
          {
            time: '6:00 PM',
            name: 'Dinner at Brasserie Four',
            type: 'restaurant',
            description: 'French bistro with an excellent wine-by-the-glass list. Great for continuing your education.',
            tip: 'Ask the sommelier to recommend a local wine to pair with your meal.',
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
            time: '11:00 AM',
            name: 'Tasting Room with Variety',
            type: 'winery',
            description: 'Ask your hotel or yesterday\'s tasting room staff for a recommendation. Tell them what you enjoyed so far.',
            tip: 'Take notes on what you enjoy. Look for patterns in your preferences.',
          },
          {
            time: '1:00 PM',
            name: 'Light Lunch',
            type: 'restaurant',
            description: 'Grab a sandwich from Graze or a quick bite from a local cafe for lunch between tastings.',
          },
          {
            time: '2:30 PM',
            name: 'Final Tasting - Your Choice',
            type: 'winery',
            description: 'Ask staff at your earlier stop for a recommendation based on what you enjoyed. They know the valley.',
            tip: 'Don\'t feel pressured to buy. But if you find something you love, get it!',
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
            description: 'Historic farmstead turned luxury inn on a working winery. Stunning grounds, ultimate privacy.',
            tip: 'Book the cottage for maximum privacy and romance.',
          },
          {
            time: '4:30 PM',
            name: 'Private Winery Tour',
            type: 'winery',
            description: 'Many wineries offer private experiences. Explore the vineyards hand-in-hand while learning about winemaking.',
            tip: 'Request sunset timing for magical light over the vineyards.',
          },
          {
            time: '7:00 PM',
            name: 'Dinner at Walla Walla Steak Co.',
            type: 'restaurant',
            description: 'Upscale steakhouse with excellent local wines. Request a quiet corner table.',
            tip: 'Order the tasting menu with wine pairings for a special experience.',
          },
          {
            time: '9:30 PM',
            name: 'Evening Stroll Downtown',
            type: 'activity',
            description: 'Walk off dinner along Main Street. Window shop, share dessert, enjoy the evening air.',
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
            name: 'Breakfast at the Inn',
            type: 'restaurant',
            description: 'Enjoy included breakfast at your accommodations. No need to rush.',
          },
          {
            time: '11:00 AM',
            name: 'Scenic Estate Winery',
            type: 'winery',
            description: 'Choose a winery known for views - vineyard vistas or Blue Mountain panoramas.',
            tip: 'Share a bottle instead of individual tastings for a more intimate experience.',
          },
          {
            time: '1:30 PM',
            name: 'Picnic in the Vineyards',
            type: 'restaurant',
            description: 'Some wineries offer picnic settings among the vines. Pack gourmet provisions from a local market or deli.',
          },
          {
            time: '3:30 PM',
            name: 'Intimate Boutique Winery',
            type: 'winery',
            description: 'Small-production winery with personal attention. Often the winemaker pours.',
            tip: 'Winemakers love hearing your story - share why you\'re visiting.',
          },
          {
            time: '5:30 PM',
            name: 'Sunset at a View Winery',
            type: 'winery',
            description: 'End the day watching the sun set over wine country. Magical, memorable moments.',
          },
          {
            time: '7:30 PM',
            name: 'Chef\'s Table Experience',
            type: 'restaurant',
            description: 'Book a special dining experience - Whitehouse-Crawford or consider a private chef.',
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
            name: 'Late Breakfast in Bed',
            type: 'activity',
            description: 'No alarms. Linger over coffee and relive the highlights of your trip.',
          },
          {
            time: '11:00 AM',
            name: 'One Last Tasting',
            type: 'winery',
            description: 'Choose a downtown tasting room for easy access. Pick up bottles to enjoy at home.',
          },
          {
            time: '12:30 PM',
            name: 'Farewell Lunch',
            type: 'restaurant',
            description: 'Final meal at TMACS for upscale comfort food, or grab picnic supplies for the road.',
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
