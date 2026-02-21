'use client';

import { useState } from 'react';
import type { EventCategory, EventFilters as EventFiltersType } from '@/lib/types/events';

interface EventFiltersProps {
  categories: EventCategory[];
  currentFilters: EventFiltersType;
  onFilterChange: (filters: EventFiltersType) => void;
}

export function EventFilters({ categories, currentFilters, onFilterChange }: EventFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleSearchChange(value: string) {
    onFilterChange({ ...currentFilters, search: value || undefined });
  }

  function handleCategoryChange(value: string) {
    onFilterChange({ ...currentFilters, category: value || undefined });
  }

  function handleStartDateChange(value: string) {
    onFilterChange({ ...currentFilters, startDate: value || undefined });
  }

  function handleEndDateChange(value: string) {
    onFilterChange({ ...currentFilters, endDate: value || undefined });
  }

  function handleFreeToggle(checked: boolean) {
    onFilterChange({ ...currentFilters, isFree: checked || undefined });
  }

  function clearFilters() {
    onFilterChange({});
  }

  const hasActiveFilters =
    currentFilters.search ||
    currentFilters.category ||
    currentFilters.startDate ||
    currentFilters.endDate ||
    currentFilters.isFree;

  const filterContent = (
    <>
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <label htmlFor="event-search" className="block text-sm font-medium text-gray-900 mb-1">
          Search
        </label>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
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
            id="event-search"
            type="text"
            placeholder="Search events..."
            value={currentFilters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#8B1538]/50 focus:border-[#8B1538]"
          />
        </div>
      </div>

      {/* Category */}
      <div className="min-w-[160px]">
        <label htmlFor="event-category" className="block text-sm font-medium text-gray-900 mb-1">
          Category
        </label>
        <select
          id="event-category"
          value={currentFilters.category || ''}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1538]/50 focus:border-[#8B1538]"
        >
          <option value="">All Categories</option>
          {categories
            .filter((c) => c.is_active)
            .sort((a, b) => a.display_order - b.display_order)
            .map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
        </select>
      </div>

      {/* Start Date */}
      <div className="min-w-[150px]">
        <label htmlFor="event-start-date" className="block text-sm font-medium text-gray-900 mb-1">
          From
        </label>
        <input
          id="event-start-date"
          type="date"
          value={currentFilters.startDate || ''}
          onChange={(e) => handleStartDateChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B1538]/50 focus:border-[#8B1538]"
        />
      </div>

      {/* End Date */}
      <div className="min-w-[150px]">
        <label htmlFor="event-end-date" className="block text-sm font-medium text-gray-900 mb-1">
          To
        </label>
        <input
          id="event-end-date"
          type="date"
          value={currentFilters.endDate || ''}
          onChange={(e) => handleEndDateChange(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B1538]/50 focus:border-[#8B1538]"
        />
      </div>

      {/* Free Events Toggle */}
      <div className="flex items-end pb-0.5">
        <label className="flex items-center gap-2 cursor-pointer py-2.5">
          <input
            type="checkbox"
            checked={currentFilters.isFree || false}
            onChange={(e) => handleFreeToggle(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-[#8B1538] focus:ring-[#8B1538]"
          />
          <span className="text-sm font-medium text-gray-900 whitespace-nowrap">Free only</span>
        </label>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="flex items-end pb-0.5">
          <button
            onClick={clearFilters}
            className="text-sm text-[#8B1538] hover:text-[#722F37] font-medium py-2.5 whitespace-nowrap"
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      {/* Desktop: horizontal bar */}
      <div className="hidden md:flex items-start gap-4 flex-wrap">{filterContent}</div>

      {/* Mobile: collapsible */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center justify-between w-full text-gray-900 font-medium"
          aria-expanded={mobileOpen}
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center w-5 h-5 bg-[#8B1538] text-white text-xs rounded-full">
                !
              </span>
            )}
          </span>
          <svg
            className={`w-5 h-5 transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {mobileOpen && <div className="mt-4 space-y-4">{filterContent}</div>}
      </div>
    </div>
  );
}
