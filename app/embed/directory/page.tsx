'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Embeddable Directory Widget
 * 
 * AI-powered local directory search. Designed to be embedded in Webflow:
 * <iframe src="https://wallawalla.travel/embed/directory" />
 * 
 * URL Parameters:
 * - category: Filter to specific category (winery, restaurant, lodging, activity)
 * - minimal: Hide header (true/false)
 * - primaryColor: Override primary color
 * - chat: Enable chat mode (true/false)
 */

interface SearchResult {
  id: string;
  name: string;
  category: string;
  description: string;
  image?: string;
  rating?: number;
  priceRange?: string;
}

// Mock data - will be replaced with real API calls
const MOCK_RESULTS: SearchResult[] = [
  { id: '1', name: 'L\'Ecole No. 41', category: 'winery', description: 'Pioneer Walla Walla winery in a historic schoolhouse. Known for Semillon and Cabernet.', rating: 4.8 },
  { id: '2', name: 'Whitehouse-Crawford', category: 'restaurant', description: 'Upscale farm-to-table dining in a converted planing mill.', priceRange: '$$$', rating: 4.7 },
  { id: '3', name: 'The Marcus Whitman Hotel', category: 'lodging', description: 'Historic downtown hotel with modern amenities and rooftop bar.', priceRange: '$$', rating: 4.5 },
  { id: '4', name: 'Foundry Vineyards', category: 'winery', description: 'Art-focused winery featuring rotating gallery exhibitions alongside tastings.', rating: 4.6 },
];

function EmbedDirectoryContent() {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get('category');
  const isMinimal = searchParams.get('minimal') === 'true';
  const isChatMode = searchParams.get('chat') === 'true';
  const primaryColor = searchParams.get('primaryColor') || '#E07A5F';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  useEffect(() => {
    // Notify parent window of height changes
    const sendHeight = () => {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'walla-embed-resize',
          height: document.body.scrollHeight
        }, '*');
      }
    };
    sendHeight();
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [results, chatMessages]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);

    if (isChatMode) {
      // Chat mode - add message and get AI response
      setChatMessages(prev => [...prev, { role: 'user', content: query }]);
      
      // Simulate AI response (will be replaced with real RAG API)
      setTimeout(() => {
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Based on your interest in "${query}", I'd recommend checking out L'Ecole No. 41 for their excellent wines and historic setting. If you're looking for dining, Whitehouse-Crawford offers an incredible farm-to-table experience. Would you like more specific recommendations?`
        }]);
        setIsSearching(false);
      }, 1000);
    } else {
      // Standard search mode
      setTimeout(() => {
        let filtered = MOCK_RESULTS;
        if (categoryFilter) {
          filtered = filtered.filter(r => r.category === categoryFilter);
        }
        // Simple text matching (will be replaced with semantic search)
        filtered = filtered.filter(r => 
          r.name.toLowerCase().includes(query.toLowerCase()) ||
          r.description.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered.length > 0 ? filtered : MOCK_RESULTS.slice(0, 3));
        setIsSearching(false);
      }, 500);
    }

    setQuery('');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'winery':
        return '🍷';
      case 'restaurant':
        return '🍽️';
      case 'lodging':
        return '🏨';
      case 'activity':
        return '🎯';
      default:
        return '📍';
    }
  };

  return (
    <div className="bg-white min-h-[300px]">
      {/* Header */}
      {!isMinimal && (
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: primaryColor }}
            >
              W
            </div>
            <span className="font-medium text-slate-900 text-sm">
              {isChatMode ? 'Ask About Walla Walla' : 'Explore Walla Walla'}
            </span>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Search Input */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isChatMode ? "Ask me anything about Walla Walla..." : "Search wineries, restaurants, activities..."}
              className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-white transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isChatMode ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  )}
                </svg>
              )}
            </button>
          </div>
        </form>

        {/* Chat Mode Messages */}
        {isChatMode && chatMessages.length > 0 && (
          <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'bg-slate-100 ml-8'
                    : 'bg-slate-50 mr-8 border border-slate-200'
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>
        )}

        {/* Search Results */}
        {!isChatMode && results.length > 0 && (
          <div className="space-y-3">
            {results.map((result) => (
              <div
                key={result.id}
                className="bg-slate-50 rounded-lg p-3 border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer"
                onClick={() => {
                  // Notify parent window
                  if (window.parent !== window) {
                    window.parent.postMessage({
                      type: 'walla-directory-select',
                      data: result
                    }, '*');
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl border border-slate-200">
                    {getCategoryIcon(result.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900 text-sm truncate">{result.name}</h3>
                      {result.rating && (
                        <span className="text-xs text-amber-600 flex items-center gap-0.5">
                          ★ {result.rating}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{result.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400 capitalize">{result.category}</span>
                      {result.priceRange && (
                        <span className="text-xs text-slate-400">{result.priceRange}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isChatMode && results.length === 0 && !isSearching && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🍷</div>
            <p className="text-sm text-slate-600 mb-1">Discover Walla Walla</p>
            <p className="text-xs text-slate-400">Search for wineries, restaurants, and more</p>
          </div>
        )}

        {/* Quick Categories */}
        {!isChatMode && results.length === 0 && !categoryFilter && (
          <div className="flex flex-wrap gap-2 mt-4">
            {['winery', 'restaurant', 'lodging', 'activity'].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setQuery(cat);
                  handleSearch({ preventDefault: () => {} } as React.FormEvent);
                }}
                className="px-3 py-1.5 bg-slate-100 rounded-full text-xs text-slate-600 hover:bg-slate-200 transition-colors capitalize"
              >
                {getCategoryIcon(cat)} {cat === 'winery' ? 'Wineries' : cat === 'lodging' ? 'Stay' : cat + 's'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmbedDirectoryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
      <EmbedDirectoryContent />
    </Suspense>
  );
}
