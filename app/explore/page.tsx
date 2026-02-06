'use client';

import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface Category {
  title: string;
  icon: string;
  description: string;
  items: RecommendationItem[];
}

interface RecommendationItem {
  name: string;
  description: string;
  tags: string[];
  // Future: affiliateUrl, trackingId for referral commissions
}

// ============================================================================
// Data (Future: pull from database with referral links)
// ============================================================================

const CATEGORIES: Category[] = [
  {
    title: "Where to Stay",
    icon: "🛏️",
    description: "From boutique hotels to cozy B&Bs",
    items: [
      {
        name: "The Marcus Whitman Hotel",
        description: "Historic downtown hotel with modern amenities. Walk to tasting rooms.",
        tags: ["Downtown", "Historic", "Full Service"],
      },
      {
        name: "The Finch",
        description: "Boutique hotel in a restored building. Stylish and central.",
        tags: ["Boutique", "Downtown", "Modern"],
      },
      {
        name: "Inn at Abeja",
        description: "Farmstead retreat surrounded by vineyards. Ultimate wine country experience.",
        tags: ["Vineyard Views", "Romantic", "Luxury"],
      },
    ],
  },
  {
    title: "Where to Eat",
    icon: "🍽️",
    description: "Farm-to-table dining and local favorites",
    items: [
      {
        name: "Passatempo Taverna",
        description: "Italian cuisine with house-made pastas and wood-fired pizzas.",
        tags: ["Italian", "Casual", "Wine List"],
      },
      {
        name: "Brasserie Four",
        description: "French-inspired bistro. Great for lunch between tastings.",
        tags: ["French", "Casual", "Lunch"],
      },
      {
        name: "Whitehouse-Crawford",
        description: "Northwest cuisine in a historic planing mill. Special occasion spot.",
        tags: ["Northwest", "Historic", "Dinner"],
      },
    ],
  },
  {
    title: "Beyond Wine",
    icon: "🎯",
    description: "Other ways to enjoy the valley",
    items: [
      {
        name: "Hot Air Balloon Rides",
        description: "See the valley from above at sunrise. Unforgettable views.",
        tags: ["Adventure", "Scenic", "Morning"],
      },
      {
        name: "Downtown Walking Tour",
        description: "Historic architecture, local shops, and hidden gems.",
        tags: ["Walking", "History", "Shopping"],
      },
      {
        name: "Fort Walla Walla Museum",
        description: "Pioneer history and regional heritage. Great for history buffs.",
        tags: ["History", "Museum", "Family"],
      },
    ],
  },
];

// ============================================================================
// Components
// ============================================================================

function RecommendationCard({ item }: { item: RecommendationItem }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 hover:border-purple-200 hover:shadow-sm transition-all">
      <h4 className="font-semibold text-gray-900 mb-1">{item.name}</h4>
      <p className="text-sm text-gray-600 mb-3">{item.description}</p>
      <div className="flex flex-wrap gap-1">
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function CategorySection({ category }: { category: Category }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{category.icon}</span>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{category.title}</h2>
          <p className="text-sm text-gray-500">{category.description}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {category.items.map((item) => (
          <RecommendationCard key={item.name} item={item} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ExplorePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/concierge" className="text-purple-600 hover:text-purple-700 text-sm mb-4 inline-block">
            ← Back
          </Link>
          <h1 className="text-3xl font-bold text-purple-900 mb-3">
            Explore Walla Walla
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            Our curated recommendations for lodging, dining, and activities.
            All insider picks from locals who know the valley.
          </p>
        </div>

        {/* Categories */}
        {CATEGORIES.map((category) => (
          <CategorySection key={category.title} category={category} />
        ))}

        {/* CTA */}
        <div className="text-center mt-12 p-8 bg-purple-50 rounded-2xl">
          <h3 className="text-xl font-bold text-purple-900 mb-2">
            Want personalized recommendations?
          </h3>
          <p className="text-gray-600 mb-4">
            Chat with our AI concierge or let us plan your entire trip.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/chat"
              className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors"
            >
              Chat with Concierge
            </Link>
            <Link
              href="/contact?service=full-planning"
              className="px-6 py-3 bg-white text-purple-700 font-semibold rounded-xl border-2 border-purple-600 hover:bg-purple-50 transition-colors"
            >
              Full Trip Planning
            </Link>
          </div>
        </div>

        {/* Future: Referral Tracking Note */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Some links may earn us a small commission at no cost to you.
        </p>
      </div>
    </div>
  );
}
