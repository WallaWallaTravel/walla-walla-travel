'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function EventsSearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/events?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto flex gap-3">
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search events, venues, or keywords..."
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#8B1538]/50 focus:border-[#8B1538]"
          aria-label="Search events"
        />
      </div>
      <button
        type="submit"
        className="px-6 py-3 rounded-lg bg-[#8B1538] text-white font-medium hover:bg-[#722F37] transition-colors"
      >
        Search
      </button>
    </form>
  );
}
