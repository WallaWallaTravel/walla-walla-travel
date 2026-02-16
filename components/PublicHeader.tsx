'use client';

import Link from 'next/link';
import { useState } from 'react';

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-[#8B1538]/10 rounded-lg flex items-center justify-center">
            <span className="text-lg font-bold text-[#8B1538]">W</span>
          </div>
          <span className="text-lg font-semibold text-gray-900">Walla Walla Travel</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/wineries" className="text-gray-600 hover:text-[#8B1538] transition-colors font-medium">
            Wineries
          </Link>
          <Link href="/neighborhoods" className="text-gray-600 hover:text-[#8B1538] transition-colors">
            Districts
          </Link>
          <Link href="/guides" className="text-gray-600 hover:text-[#8B1538] transition-colors">
            Guides
          </Link>
          <Link href="/itineraries" className="text-gray-600 hover:text-[#8B1538] transition-colors">
            Itineraries
          </Link>
          <Link href="/geology" className="text-gray-600 hover:text-[#8B1538] transition-colors">
            Geology
          </Link>
          <Link href="/history" className="text-gray-600 hover:text-[#8B1538] transition-colors">
            History
          </Link>
          <Link
            href="/plan-your-visit"
            className="bg-[#8B1538] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#722F37] transition-colors"
          >
            Plan Your Visit
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 px-4 py-4 space-y-3">
          <Link
            href="/wineries"
            className="block py-2 text-gray-600 hover:text-[#8B1538] font-medium"
            onClick={() => setMobileMenuOpen(false)}
          >
            Wineries
          </Link>
          <Link
            href="/neighborhoods"
            className="block py-2 text-gray-600 hover:text-[#8B1538]"
            onClick={() => setMobileMenuOpen(false)}
          >
            Districts
          </Link>
          <Link
            href="/guides"
            className="block py-2 text-gray-600 hover:text-[#8B1538]"
            onClick={() => setMobileMenuOpen(false)}
          >
            Guides
          </Link>
          <Link
            href="/itineraries"
            className="block py-2 text-gray-600 hover:text-[#8B1538]"
            onClick={() => setMobileMenuOpen(false)}
          >
            Itineraries
          </Link>
          <Link
            href="/geology"
            className="block py-2 text-gray-600 hover:text-[#8B1538]"
            onClick={() => setMobileMenuOpen(false)}
          >
            Geology
          </Link>
          <Link
            href="/history"
            className="block py-2 text-gray-600 hover:text-[#8B1538]"
            onClick={() => setMobileMenuOpen(false)}
          >
            History
          </Link>
          <Link
            href="/plan-your-visit"
            className="block w-full text-center bg-[#8B1538] text-white px-4 py-3 rounded-lg font-semibold hover:bg-[#722F37] transition-colors mt-4"
            onClick={() => setMobileMenuOpen(false)}
          >
            Plan Your Visit
          </Link>
        </div>
      )}
    </nav>
  );
}
