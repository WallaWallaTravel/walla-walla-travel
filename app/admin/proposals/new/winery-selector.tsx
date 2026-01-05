'use client';

import { useState, useRef } from 'react';

interface WinerySelectorProps {
  selectedWineries: Array<{ id: number; name: string; city: string }>;
  allWineries: Array<{ id: number; name: string; city: string }>;
  onUpdate: (wineries: Array<{ id: number; name: string; city: string }>) => void;
  descriptionFieldId?: string; // ID of the description field to focus after 3rd selection
}

export function WinerySelector({ selectedWineries, allWineries, onUpdate, descriptionFieldId }: WinerySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter wineries based on search term
  const filteredWineries = allWineries.filter((winery) =>
    winery.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleWinery = (winery: { id: number; name: string; city: string }) => {
    const isSelected = selectedWineries.some((w) => w.id === winery.id);
    
    if (isSelected) {
      onUpdate(selectedWineries.filter((w) => w.id !== winery.id));
    } else {
      const newSelected = [...selectedWineries, winery];
      onUpdate(newSelected);
      
      // Clear search and handle focus
      setSearchTerm('');
      
      // If we now have 3 wineries, move to description field
      if (newSelected.length >= 3 && descriptionFieldId) {
        setTimeout(() => {
          const descField = document.getElementById(descriptionFieldId);
          if (descField) {
            descField.focus();
          }
        }, 100);
      } else {
        // Otherwise, focus back on search for next selection
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }
    }
  };

  // Handle Enter key to select when only one result
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredWineries.length === 1) {
      e.preventDefault();
      const winery = filteredWineries[0];
      const isAlreadySelected = selectedWineries.some((w) => w.id === winery.id);
      
      if (!isAlreadySelected) {
        toggleWinery(winery);
      }
    }
  };

  return (
    <div>
      <label className="block text-sm font-bold text-gray-900 mb-2">
        Wineries ({selectedWineries.length} selected)
      </label>

      {/* Selected Wineries - Show first for easy access */}
      {selectedWineries.length > 0 && (
        <div className="mb-3 bg-[#FDF2F4] border-2 border-[#8B1538] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700">Selected Wineries</span>
            <button
              type="button"
              onClick={() => onUpdate([])}
              className="text-xs text-red-600 hover:text-red-700 font-bold"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedWineries.map((winery) => (
              <div
                key={winery.id}
                className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-300 text-sm"
              >
                <span className="text-gray-900 font-medium">{winery.name}</span>
                <button
                  type="button"
                  onClick={() => toggleWinery(winery)}
                  className="text-gray-400 hover:text-red-600 font-bold"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search wineries... (Press Enter to select)"
            className="w-full pl-10 pr-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#8B1538] focus:ring-4 focus:ring-[#FDF2F4]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        {filteredWineries.length === 1 && searchTerm && (
          <p className="text-xs text-green-600 mt-1 font-bold">
            ↵ Press Enter to select &quot;{filteredWineries[0].name}&quot;
          </p>
        )}
      </div>

      {/* Winery List */}
      <div className="max-h-48 overflow-y-auto border-2 border-gray-300 rounded-lg p-2">
        {filteredWineries.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            {searchTerm ? `No wineries found matching "${searchTerm}"` : 'No wineries available'}
          </p>
        ) : (
          filteredWineries.map((winery) => (
            <label
              key={winery.id}
              className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer rounded"
            >
              <input
                type="checkbox"
                checked={selectedWineries.some((w) => w.id === winery.id)}
                onChange={() => toggleWinery(winery)}
                className="w-4 h-4 text-[#8B1538] rounded focus:ring-[#8B1538]"
              />
              <span className="text-sm text-gray-900 flex-1">{winery.name}</span>
              {winery.city && (
                <span className="text-xs text-gray-500">{winery.city}</span>
              )}
            </label>
          ))
        )}
      </div>

      {/* Selected Count Info */}
      {searchTerm && filteredWineries.length > 0 && (
        <p className="text-xs text-gray-500 mt-1">
          Showing {filteredWineries.length} of {allWineries.length} wineries
        </p>
      )}
    </div>
  );
}

