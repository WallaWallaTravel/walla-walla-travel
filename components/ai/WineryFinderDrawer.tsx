'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useFavoritesStore } from '@/lib/stores/favorites';

interface WinerySummary {
  id: number;
  name: string;
  slug: string;
  region?: string;
  description?: string;
  wine_styles?: string[];
  tasting_fee?: number;
  image_url?: string;
  experience_tags?: string[];
  features?: string[];
}

interface WineryExplanation {
  wineryId: number;
  wineryName: string;
  matchReasons: string[];
  highlights: string[];
}

interface DrawerMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  wineries?: WinerySummary[];
  explanations?: WineryExplanation[];
  followUpSuggestions?: string[];
}

interface WineryFinderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters?: (filters: Record<string, unknown>) => void;
}

const SUGGESTED_QUERIES = [
  "Dog-friendly with outdoor seating",
  "Romantic with great views",
  "Good for groups of 10+",
  "Best Cabernet under $25",
  "Boutique experiences",
];

export function WineryFinderDrawer({ isOpen, onClose, onApplyFilters }: WineryFinderDrawerProps) {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<DrawerMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { toggleFavorite, isHydrated } = useFavoritesStore();
  const isFavorite = useFavoritesStore(state => (id: number) => state.favorites.some(f => f.id === id));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(async (query: string) => {
    if (!query.trim() || isLoading) return;

    const userMessage: DrawerMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
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
        const aiMessage: DrawerMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: data.recommendation.explanation,
          wineries: data.results.wineries,
          explanations: data.results.explanations,
          followUpSuggestions: data.recommendation.followUpSuggestions,
        };
        setMessages(prev => [...prev, aiMessage]);

        // Optionally apply filters to the main grid
        if (onApplyFilters && data.recommendation.filters) {
          // Convert AI filters to URL-compatible format
          // This allows users to see results in both the drawer and main grid
        }
      } else {
        const errorMessage: DrawerMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: "I had trouble with that request. Could you try rephrasing?",
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch {
      const errorMessage: DrawerMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "Connection issue. Please try again.",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, onApplyFilters]);

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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-[#8B1538] text-white px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍷</span>
            <div>
              <h2 className="font-semibold">AI Winery Finder</h2>
              <p className="text-xs text-white/80">Describe what you're looking for</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close drawer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-stone-600 mb-4">
                Tell me what you're looking for in a winery experience.
              </p>
              <div className="space-y-2">
                {SUGGESTED_QUERIES.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubmit(suggestion)}
                    className="block w-full px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm rounded-lg transition-colors text-left"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id}>
                {msg.type === 'user' ? (
                  <div className="flex justify-end">
                    <div className="bg-[#8B1538] text-white px-4 py-2 rounded-2xl rounded-br-sm max-w-[85%]">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-shrink-0 w-7 h-7 bg-[#8B1538]/10 rounded-full flex items-center justify-center text-sm">
                        🍷
                      </div>
                      <p className="text-stone-800 text-sm pt-1">{msg.content}</p>
                    </div>

                    {/* Winery Results */}
                    {msg.wineries && msg.wineries.length > 0 && (
                      <div className="pl-9 space-y-2">
                        <p className="text-xs text-stone-500">
                          {msg.wineries.length} winer{msg.wineries.length !== 1 ? 'ies' : 'y'} found
                        </p>
                        {msg.wineries.slice(0, 5).map((winery) => {
                          const explanation = msg.explanations?.find(e => e.wineryId === winery.id);
                          return (
                            <DrawerWineryCard
                              key={winery.id}
                              winery={winery}
                              explanation={explanation}
                              isFavorite={isHydrated && isFavorite(winery.id)}
                              onSave={() => handleSaveWinery(winery)}
                            />
                          );
                        })}
                        {msg.wineries.length > 5 && (
                          <Link
                            href="/wineries/discover"
                            className="block text-center text-[#8B1538] text-sm hover:underline pt-1"
                          >
                            View all {msg.wineries.length} results →
                          </Link>
                        )}
                      </div>
                    )}

                    {/* Follow-up Suggestions */}
                    {msg.followUpSuggestions && msg.followUpSuggestions.length > 0 && (
                      <div className="pl-9 pt-2">
                        <p className="text-xs text-stone-400 mb-2">Try asking:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.followUpSuggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSubmit(suggestion)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs rounded-full transition-colors"
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
            ))
          )}

          {isLoading && (
            <div className="flex gap-2 pl-9">
              <div className="flex items-center gap-1 py-2">
                <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-stone-200 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(inputValue);
            }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Describe your ideal wine experience..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 placeholder-gray-600"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-5 py-3 bg-[#8B1538] text-white rounded-xl hover:bg-[#722F37] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Search
            </button>
          </form>

          {/* Quick Links */}
          <div className="flex justify-center gap-4 mt-3 text-xs">
            <Link href="/my-favorites" className="text-stone-500 hover:text-[#8B1538]">
              View Saved ({useFavoritesStore.getState().favorites.length})
            </Link>
            <Link href="/wineries/discover" className="text-stone-500 hover:text-[#8B1538]">
              Full Discovery Mode
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

// Compact winery card for drawer
function DrawerWineryCard({
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
    <div className="flex gap-3 p-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
      <Link href={`/wineries/${winery.slug}`} className="flex-shrink-0">
        <div className="w-14 h-14 bg-stone-200 rounded-lg overflow-hidden relative">
          {winery.image_url ? (
            <Image
              src={winery.image_url}
              alt={winery.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">🍷</div>
          )}
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <Link href={`/wineries/${winery.slug}`}>
            <h4 className="font-medium text-stone-900 text-sm hover:text-[#8B1538] transition-colors line-clamp-1">
              {winery.name}
            </h4>
          </Link>
          <button
            onClick={(e) => {
              e.preventDefault();
              onSave();
            }}
            className={`flex-shrink-0 p-1 rounded-full ${
              isFavorite ? 'text-red-500' : 'text-stone-400 hover:text-red-400'
            }`}
          >
            <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
        {explanation?.matchReasons?.[0] && (
          <p className="text-xs text-stone-600 line-clamp-2 mt-0.5">
            {explanation.matchReasons[0]}
          </p>
        )}
        <div className="flex gap-1 mt-1">
          <span className="text-xs text-stone-500">
            {winery.tasting_fee ? `$${winery.tasting_fee}` : 'Free'}
          </span>
          {winery.region && (
            <>
              <span className="text-xs text-stone-300">•</span>
              <span className="text-xs text-stone-500">{winery.region}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
