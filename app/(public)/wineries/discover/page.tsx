'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useFavoritesStore } from '@/lib/stores/favorites';

interface WinerySummary {
  id: number;
  name: string;
  slug: string;
  region: string;
  description: string;
  wine_styles: string[];
  tasting_fee: number;
  reservation_required: boolean;
  rating?: number;
  image_url?: string;
  experience_tags: string[];
  features: string[];
  max_group_size?: number;
  verified: boolean;
}

interface WineryExplanation {
  wineryId: number;
  wineryName: string;
  matchReasons: string[];
  highlights: string[];
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  wineries?: WinerySummary[];
  explanations?: WineryExplanation[];
  followUpSuggestions?: string[];
}

const SUGGESTED_QUERIES = [
  "Find dog-friendly wineries with outdoor seating",
  "Romantic spots for our anniversary",
  "Great Cabernet under $25",
  "Wineries good for groups of 10+",
  "Boutique wineries with unique experiences",
  "Best scenic views and picnic areas",
];

export default function WineryDiscoverPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { toggleFavorite, isHydrated } = useFavoritesStore();
  const isFavorite = useFavoritesStore(state => (id: number) => state.favorites.some(f => f.id === id));

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = useCallback(async (query: string) => {
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/wineries/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, includeExplanations: true }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: data.recommendation.explanation,
          timestamp: new Date(),
          wineries: data.results.wineries,
          explanations: data.results.explanations,
          followUpSuggestions: data.recommendation.followUpSuggestions,
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: "I'm sorry, I had trouble processing that request. Could you try rephrasing?",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I'm having trouble connecting. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleSuggestionClick = (suggestion: string) => {
    handleSubmit(suggestion);
  };

  const handleSaveWinery = (winery: WinerySummary) => {
    toggleFavorite({
      id: winery.id,
      name: winery.name,
      slug: winery.slug,
      region: winery.region,
      image_url: winery.image_url,
      tasting_fee: winery.tasting_fee,
      source: 'ai-recommendation',
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      {/* Header */}
      <div className="bg-[#8B1538] text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Discover Your Perfect Winery
          </h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            Tell me what you're looking for, and I'll find the perfect Walla Walla wineries for your visit.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Chat Container */}
        <div className="bg-white rounded-2xl shadow-lg border border-stone-200 overflow-hidden">
          {/* Messages Area */}
          <div className="min-h-[400px] max-h-[600px] overflow-y-auto p-6">
            {messages.length === 0 ? (
              // Welcome State
              <div className="text-center py-8">
                <span className="text-6xl mb-4 block">🍷</span>
                <h2 className="text-xl font-semibold text-stone-900 mb-2">
                  What kind of wine experience are you looking for?
                </h2>
                <p className="text-stone-600 mb-8">
                  Describe your ideal winery visit and I'll find the best matches.
                </p>

                {/* Suggested Queries */}
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED_QUERIES.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-full text-sm transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Messages
              <div className="space-y-6">
                {messages.map((message) => (
                  <div key={message.id}>
                    {message.type === 'user' ? (
                      // User Message
                      <div className="flex justify-end">
                        <div className="bg-[#8B1538] text-white px-4 py-3 rounded-2xl rounded-br-md max-w-[80%]">
                          {message.content}
                        </div>
                      </div>
                    ) : (
                      // AI Message
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-[#8B1538]/10 rounded-full flex items-center justify-center">
                            <span className="text-sm">🍷</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-stone-800">{message.content}</p>
                          </div>
                        </div>

                        {/* Winery Results */}
                        {message.wineries && message.wineries.length > 0 && (
                          <div className="mt-4 space-y-3 pl-11">
                            <p className="text-sm text-stone-500 font-medium">
                              Found {message.wineries.length} winer{message.wineries.length !== 1 ? 'ies' : 'y'}
                            </p>
                            <div className="grid gap-3">
                              {message.wineries.slice(0, 6).map((winery) => {
                                const explanation = message.explanations?.find(
                                  (e) => e.wineryId === winery.id
                                );
                                return (
                                  <WineryCard
                                    key={winery.id}
                                    winery={winery}
                                    explanation={explanation}
                                    isFavorite={isHydrated && isFavorite(winery.id)}
                                    onSave={() => handleSaveWinery(winery)}
                                  />
                                );
                              })}
                            </div>
                            {message.wineries.length > 6 && (
                              <Link
                                href={`/wineries?search=${encodeURIComponent(messages.find(m => m.type === 'user')?.content || '')}`}
                                className="block text-center text-[#8B1538] hover:underline text-sm font-medium pt-2"
                              >
                                View all {message.wineries.length} results in directory →
                              </Link>
                            )}
                          </div>
                        )}

                        {/* No Results */}
                        {message.wineries && message.wineries.length === 0 && (
                          <div className="mt-4 pl-11 text-stone-500 text-sm">
                            No wineries matched those exact criteria. Try broadening your search.
                          </div>
                        )}

                        {/* Follow-up Suggestions */}
                        {message.followUpSuggestions && message.followUpSuggestions.length > 0 && (
                          <div className="mt-4 pl-11">
                            <p className="text-xs text-stone-400 mb-2">Try asking:</p>
                            <div className="flex flex-wrap gap-2">
                              {message.followUpSuggestions.map((suggestion, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleSuggestionClick(suggestion)}
                                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-full text-xs transition-colors"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#8B1538]/10 rounded-full flex items-center justify-center">
                      <span className="text-sm">🍷</span>
                    </div>
                    <div className="flex items-center gap-1 py-3">
                      <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-stone-200 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(inputValue);
              }}
              className="flex gap-3"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Describe your ideal wine experience..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 focus:border-[#8B1538] placeholder-gray-600 disabled:bg-stone-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="px-6 py-3 bg-[#8B1538] text-white rounded-xl hover:bg-[#722F37] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Search
              </button>
            </form>
          </div>
        </div>

        {/* Bottom CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/wineries"
            className="px-6 py-3 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors text-center"
          >
            Browse All Wineries
          </Link>
          <Link
            href="/my-favorites"
            className="px-6 py-3 border border-[#8B1538] text-[#8B1538] rounded-lg hover:bg-[#8B1538]/5 transition-colors text-center"
          >
            View Saved Wineries
          </Link>
        </div>

        {/* Soft CTA */}
        <div className="mt-8 bg-gradient-to-br from-[#8B1538]/5 to-[#722F37]/5 rounded-xl p-6 text-center border border-[#8B1538]/10">
          <p className="text-stone-700 mb-3">
            Planning multiple days in wine country? Our local experts can handle all the details.
          </p>
          <Link
            href="/concierge"
            className="inline-block px-6 py-2 text-[#8B1538] font-medium hover:underline"
          >
            Talk to a Concierge →
          </Link>
        </div>
      </div>
    </main>
  );
}

// Winery Card Component
function WineryCard({
  winery,
  explanation,
  isFavorite,
  onSave,
}: {
  winery: WinerySummary;
  explanation?: WineryExplanation;
  isFavorite: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex gap-4 p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
      {/* Image */}
      <Link href={`/wineries/${winery.slug}`} className="flex-shrink-0">
        <div className="w-20 h-20 bg-stone-200 rounded-lg overflow-hidden relative">
          {winery.image_url ? (
            <Image
              src={winery.image_url}
              alt={winery.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">🍷</div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/wineries/${winery.slug}`}>
            <h3 className="font-semibold text-stone-900 hover:text-[#8B1538] transition-colors">
              {winery.name}
            </h3>
          </Link>
          <button
            onClick={(e) => {
              e.preventDefault();
              onSave();
            }}
            className={`flex-shrink-0 p-1.5 rounded-full transition-colors ${
              isFavorite
                ? 'text-red-500 hover:text-red-600'
                : 'text-stone-400 hover:text-red-400'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
          >
            <svg
              className="w-5 h-5"
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        </div>

        {winery.region && (
          <p className="text-xs text-stone-500 mb-1">{winery.region}</p>
        )}

        {/* Match Reasons */}
        {explanation && explanation.matchReasons.length > 0 && (
          <p className="text-sm text-stone-600 line-clamp-2">
            {explanation.matchReasons[0]}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {winery.tasting_fee !== undefined && (
            <span className="px-2 py-0.5 bg-white text-stone-600 text-xs rounded-full border border-stone-200">
              {winery.tasting_fee > 0 ? `$${winery.tasting_fee}` : 'Free'}
            </span>
          )}
          {explanation?.highlights?.slice(0, 2).map((highlight, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-[#8B1538]/10 text-[#8B1538] text-xs rounded-full"
            >
              {highlight}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
