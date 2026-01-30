'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useFavoritesStore } from '@/lib/stores/favorites';

interface WinerySummary {
  id: number;
  name: string;
  slug: string;
  region?: string;
  tasting_fee?: number;
  image_url?: string;
}

interface WidgetMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  wineries?: WinerySummary[];
}

const QUICK_PROMPTS = [
  "Dog-friendly",
  "Romantic",
  "Groups 10+",
  "Outdoor seating",
  "Best views",
];

export function WineryFinderWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use individual selectors to prevent infinite re-renders
  const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);
  const isHydrated = useFavoritesStore(state => state.isHydrated);
  const isFavorite = useFavoritesStore(state => state.isFavorite);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async (query: string) => {
    if (!query.trim() || isLoading) return;

    const userMessage: WidgetMessage = {
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
        body: JSON.stringify({ query, includeExplanations: false }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: WidgetMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: data.recommendation.explanation,
          wineries: data.results.wineries?.slice(0, 3),
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        const errorMessage: WidgetMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: "Sorry, I couldn't process that. Try again?",
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch {
      const errorMessage: WidgetMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "Connection issue. Please try again.",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

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
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-6 right-6 z-50
          w-14 h-14 rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-300
          ${isOpen
            ? 'bg-stone-700 hover:bg-stone-800'
            : 'bg-[#8B1538] hover:bg-[#722F37]'
          }
        `}
        aria-label={isOpen ? 'Close winery finder' : 'Find wineries with AI'}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <span className="text-2xl">🍷</span>
        )}
      </button>

      {/* Widget Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
          {/* Header */}
          <div className="bg-[#8B1538] text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🍷</span>
                <h3 className="font-semibold">Winery Finder</h3>
              </div>
              <Link
                href="/wineries/discover"
                className="text-xs text-white/80 hover:text-white"
              >
                Full View →
              </Link>
            </div>
          </div>

          {/* Messages Area */}
          <div className="h-64 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-stone-600 mb-3">
                  What kind of winery are you looking for?
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSubmit(prompt)}
                      className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs rounded-full transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id}>
                  {msg.type === 'user' ? (
                    <div className="flex justify-end">
                      <div className="bg-[#8B1538] text-white px-3 py-2 rounded-xl rounded-br-sm text-sm max-w-[80%]">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-stone-100 px-3 py-2 rounded-xl rounded-bl-sm text-sm text-stone-800 max-w-[90%]">
                        {msg.content}
                      </div>
                      {msg.wineries && msg.wineries.length > 0 && (
                        <div className="space-y-1.5 pl-2">
                          {msg.wineries.map((winery) => (
                            <div
                              key={winery.id}
                              className="flex items-center justify-between bg-white border border-stone-200 rounded-lg p-2"
                            >
                              <Link
                                href={`/wineries/${winery.slug}`}
                                className="text-sm font-medium text-stone-900 hover:text-[#8B1538] truncate flex-1"
                              >
                                {winery.name}
                              </Link>
                              <button
                                onClick={() => handleSaveWinery(winery)}
                                className={`ml-2 p-1 rounded-full ${
                                  isHydrated && isFavorite(winery.id)
                                    ? 'text-red-500'
                                    : 'text-stone-400 hover:text-red-400'
                                }`}
                              >
                                <svg className="w-4 h-4" fill={isHydrated && isFavorite(winery.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex gap-1 py-2 pl-2">
                <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-stone-200 p-3">
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
                placeholder="Describe your ideal winery..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1538]/30 placeholder-gray-600"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="px-4 py-2 bg-[#8B1538] text-white rounded-lg text-sm hover:bg-[#722F37] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Go
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
