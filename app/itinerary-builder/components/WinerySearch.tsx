// Winery Search Component with Autocomplete

import React from 'react';
import { Winery } from '../types';

interface WinerySearchProps {
  searchTerm: string;
  wineries: Winery[];
  onSearchChange: (value: string) => void;
  onWinerySelect: (winery: Winery) => void;
  onAddNew: () => void;
  handleFocusSelect: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export const WinerySearch: React.FC<WinerySearchProps> = ({
  searchTerm,
  wineries,
  onSearchChange,
  onWinerySelect,
  onAddNew,
  handleFocusSelect,
}) => {
  const filteredWineries = wineries
    .filter(w => w.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aStartsWith = a.name.toLowerCase().startsWith(searchTerm.toLowerCase());
      const bStartsWith = b.name.toLowerCase().startsWith(searchTerm.toLowerCase());
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      const aWordMatch = new RegExp(`\\b${searchTerm}`, 'i').test(a.name);
      const bWordMatch = new RegExp(`\\b${searchTerm}`, 'i').test(b.name);
      if (aWordMatch && !bWordMatch) return -1;
      if (!aWordMatch && bWordMatch) return 1;
      
      const aIndex = a.name.toLowerCase().indexOf(searchTerm.toLowerCase());
      const bIndex = b.name.toLowerCase().indexOf(searchTerm.toLowerCase());
      if (aIndex !== bIndex) return aIndex - bIndex;
      
      return a.name.localeCompare(b.name);
    })
    .slice(0, 10);

  const handleInputChange = (value: string) => {
    onSearchChange(value);
    if (value.toLowerCase().trim() === 'add...') {
      onAddNew();
      onSearchChange('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4 relative">
      <label className="block text-base font-bold text-gray-900 mb-2">Add Stop to Tour</label>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={handleFocusSelect}
        placeholder="Type winery name or 'add...' to create new"
        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />
      
      {/* Autocomplete Dropdown */}
      {searchTerm && searchTerm.toLowerCase() !== 'add...' && (
        <div className="absolute z-10 w-[calc(100%-3rem)] mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {filteredWineries.map(winery => (
            <button
              key={winery.id}
              onClick={() => onWinerySelect(winery)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-200 last:border-b-0 transition-colors"
            >
              <div className="font-bold text-gray-900">{winery.name}</div>
              <div className="text-sm text-gray-600">{winery.address}, {winery.city}</div>
            </button>
          ))}
          {filteredWineries.length === 0 && (
            <div className="px-4 py-3 text-gray-600 text-center">
              No matches found. Type "add..." to create a new winery.
            </div>
          )}
        </div>
      )}
    </div>
  );
};




