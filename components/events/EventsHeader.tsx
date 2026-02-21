'use client';

import Link from 'next/link';
import { useState } from 'react';

export function EventsHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/events" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-[#8B1538]/10 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-[#8B1538]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span className="text-lg font-semibold text-gray-900">Walla Walla Events</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/events"
            className="text-gray-600 hover:text-[#8B1538] transition-colors font-medium"
          >
            Upcoming
          </Link>
          <Link
            href="/events#categories"
            className="text-gray-600 hover:text-[#8B1538] transition-colors"
          >
            Categories
          </Link>
          <Link
            href="/events?free=true"
            className="text-gray-600 hover:text-[#8B1538] transition-colors"
          >
            Free Events
          </Link>
          <Link
            href="/events#submit"
            className="text-gray-600 hover:text-[#8B1538] transition-colors"
          >
            Submit Event
          </Link>
          <a
            href="https://wallawalla.travel"
            className="bg-[#8B1538] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#722F37] transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Explore Wine Country
          </a>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 px-4 py-4 space-y-3">
          <Link
            href="/events"
            className="block py-2 text-gray-600 hover:text-[#8B1538] font-medium"
            onClick={() => setMobileMenuOpen(false)}
          >
            Upcoming
          </Link>
          <Link
            href="/events#categories"
            className="block py-2 text-gray-600 hover:text-[#8B1538]"
            onClick={() => setMobileMenuOpen(false)}
          >
            Categories
          </Link>
          <Link
            href="/events?free=true"
            className="block py-2 text-gray-600 hover:text-[#8B1538]"
            onClick={() => setMobileMenuOpen(false)}
          >
            Free Events
          </Link>
          <Link
            href="/events#submit"
            className="block py-2 text-gray-600 hover:text-[#8B1538]"
            onClick={() => setMobileMenuOpen(false)}
          >
            Submit Event
          </Link>
          <a
            href="https://wallawalla.travel"
            className="block w-full text-center bg-[#8B1538] text-white px-4 py-3 rounded-lg font-semibold hover:bg-[#722F37] transition-colors mt-4"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
          >
            Explore Wine Country
          </a>
          <p className="text-sm text-gray-500 text-center pt-2 border-t border-gray-100 mt-3">
            Part of{' '}
            <a
              href="https://wallawalla.travel"
              className="text-[#8B1538] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Walla Walla Travel
            </a>
          </p>
        </div>
      )}
    </nav>
  );
}
