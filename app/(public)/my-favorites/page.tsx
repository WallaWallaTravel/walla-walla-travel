'use client';

import { useFavoritesStore } from '@/lib/stores/favorites';
import Link from 'next/link';
import Image from 'next/image';

export default function MyFavoritesPage() {
  const { favorites, removeFavorite, clearFavorites, isHydrated } = useFavoritesStore();

  // Loading state while hydrating
  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-stone-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-10 w-48 bg-stone-200 rounded mb-4" />
            <div className="h-6 w-96 bg-stone-200 rounded mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-6 h-48" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 mb-2">My Saved Wineries</h1>
            <p className="text-stone-600">
              {favorites.length === 0
                ? 'Save wineries you want to visit'
                : `You have ${favorites.length} winer${favorites.length !== 1 ? 'ies' : 'y'} saved`}
            </p>
          </div>
          {favorites.length > 0 && (
            <div className="flex gap-3">
              <Link
                href="/itinerary-builder"
                className="px-4 py-2 bg-[#8B1538] text-white rounded-lg hover:bg-[#722F37] transition-colors text-sm font-medium"
              >
                Plan a Trip
              </Link>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear all saved wineries?')) {
                    clearFavorites();
                  }
                }}
                className="px-4 py-2 border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-100 transition-colors text-sm"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Empty State */}
        {favorites.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
            <span className="text-6xl mb-4 block">💜</span>
            <h2 className="text-xl font-semibold text-stone-900 mb-2">No saved wineries yet</h2>
            <p className="text-stone-600 mb-6 max-w-md mx-auto">
              Browse our winery directory and tap the heart icon to save wineries you want to visit.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/wineries"
                className="px-6 py-3 bg-[#8B1538] text-white rounded-lg hover:bg-[#722F37] transition-colors font-medium"
              >
                Browse Wineries
              </Link>
              <Link
                href="/wineries/discover"
                className="px-6 py-3 border border-[#8B1538] text-[#8B1538] rounded-lg hover:bg-[#8B1538]/5 transition-colors font-medium"
              >
                Ask AI for Suggestions
              </Link>
            </div>
          </div>
        )}

        {/* Favorites Grid */}
        {favorites.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {favorites.map((winery) => (
                <div
                  key={winery.id}
                  className="group bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-lg transition-all duration-300"
                >
                  {/* Image */}
                  <Link href={`/wineries/${winery.slug}`}>
                    <div className="h-40 bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center relative">
                      {winery.image_url ? (
                        <Image
                          src={winery.image_url}
                          alt={winery.name}
                          className="object-cover"
                          fill
                          unoptimized
                        />
                      ) : (
                        <span className="text-5xl">🍷</span>
                      )}
                      {/* Source Badge */}
                      {winery.source === 'ai-recommendation' && (
                        <div className="absolute top-3 left-3 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-md">
                          AI Pick
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="p-4">
                    <Link href={`/wineries/${winery.slug}`}>
                      <h3 className="text-lg font-semibold text-stone-900 group-hover:text-[#722F37] transition-colors mb-1">
                        {winery.name}
                      </h3>
                    </Link>
                    {winery.region && (
                      <p className="text-sm text-stone-500 mb-2">{winery.region}</p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                      <span className="text-sm text-stone-600">
                        {winery.tasting_fee && winery.tasting_fee > 0
                          ? `$${winery.tasting_fee}`
                          : 'Free tasting'}
                      </span>
                      <button
                        onClick={() => removeFavorite(winery.id)}
                        className="text-red-500 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"
                        aria-label={`Remove ${winery.name} from favorites`}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-br from-[#8B1538]/5 to-[#722F37]/5 rounded-2xl p-8 text-center border border-[#8B1538]/10">
              <h2 className="text-xl font-semibold text-stone-900 mb-2">
                Ready to plan your visit?
              </h2>
              <p className="text-stone-600 mb-6 max-w-lg mx-auto">
                Turn your saved wineries into a personalized itinerary, or let our local experts handle the details for you.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Link
                  href="/itinerary-builder"
                  className="px-6 py-3 bg-[#8B1538] text-white rounded-lg hover:bg-[#722F37] transition-colors font-medium"
                >
                  Build Itinerary
                </Link>
                <Link
                  href="/concierge"
                  className="px-6 py-3 border border-[#8B1538] text-[#8B1538] rounded-lg hover:bg-[#8B1538]/5 transition-colors font-medium"
                >
                  Talk to Concierge
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
