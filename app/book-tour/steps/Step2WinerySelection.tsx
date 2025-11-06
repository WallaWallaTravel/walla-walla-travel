'use client';

import { useState, useEffect } from 'react';
import { BookingData } from '../page';

interface Props {
  bookingData: BookingData;
  updateBookingData: (data: Partial<BookingData>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

interface Winery {
  id: number;
  name: string;
  city: string;
  address: string;
  description?: string;
  specialties?: string;
  tasting_fee?: number;
}

export default function Step2WinerySelection({ bookingData, updateBookingData, nextStep, prevStep }: Props) {
  const [wineries, setWineries] = useState<Winery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadWineries();
  }, []);

  const loadWineries = async () => {
    try {
      const response = await fetch('/api/wineries');
      const result = await response.json();
      if (result.success) {
        setWineries(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load wineries:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWinery = (winery: Winery) => {
    const isSelected = bookingData.selected_wineries.some(w => w.id === winery.id);
    
    if (isSelected) {
      updateBookingData({
        selected_wineries: bookingData.selected_wineries.filter(w => w.id !== winery.id)
      });
    } else {
      // Check max wineries based on duration
      const maxWineries = bookingData.duration_hours === 4 ? 3 : bookingData.duration_hours === 6 ? 4 : 6;
      
      if (bookingData.selected_wineries.length >= maxWineries) {
        alert(`Maximum ${maxWineries} wineries for a ${bookingData.duration_hours}-hour tour`);
        return;
      }

      updateBookingData({
        selected_wineries: [...bookingData.selected_wineries, {
          id: winery.id,
          name: winery.name,
          city: winery.city,
          address: winery.address
        }]
      });
    }
  };

  const moveWinery = (index: number, direction: 'up' | 'down') => {
    const newWineries = [...bookingData.selected_wineries];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < newWineries.length) {
      [newWineries[index], newWineries[newIndex]] = [newWineries[newIndex], newWineries[index]];
      updateBookingData({ selected_wineries: newWineries });
    }
  };

  const filteredWineries = wineries.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const maxWineries = bookingData.duration_hours === 4 ? 3 : bookingData.duration_hours === 6 ? 4 : 6;
  const minWineries = 2;

  const canContinue = bookingData.selected_wineries.length >= minWineries;

  return (
    <div>
      {/* Header with better visual hierarchy */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-gray-900 mb-3">🍇 Choose Your Wineries</h2>
        <p className="text-lg text-gray-600 mb-4">
          Select {minWineries}-{maxWineries} wineries for your {bookingData.duration_hours}-hour tour
        </p>
        
        {/* Progress indicator */}
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-600">
              {bookingData.selected_wineries.length} of {maxWineries} selected
            </span>
            <span className="text-sm font-semibold text-purple-600">
              {Math.round((bookingData.selected_wineries.length / maxWineries) * 100)}%
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${(bookingData.selected_wineries.length / maxWineries) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selected Wineries (Left Column) - Enhanced */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6 sticky top-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Your Itinerary
              </h3>
              <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-bold">
                {bookingData.selected_wineries.length}/{maxWineries}
              </span>
            </div>

            {bookingData.selected_wineries.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-full flex items-center justify-center shadow-md">
                  <span className="text-5xl">🍷</span>
                </div>
                <p className="text-gray-700 font-bold text-lg mb-2">Start Building Your Tour</p>
                <p className="text-sm text-gray-600 mb-4">Click on wineries to add them to your itinerary</p>
                <div className="bg-white rounded-lg p-4 text-left">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">💡 Pro Tips:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Start with your must-visit wineries</li>
                    <li>• Mix different wine varieties</li>
                    <li>• Consider tasting fees</li>
                    <li>• Reorder stops anytime</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {bookingData.selected_wineries.map((winery, index) => (
                  <div
                    key={winery.id}
                    className="bg-white rounded-lg p-4 shadow-md border-2 border-purple-100 hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveWinery(index, 'up')}
                          disabled={index === 0}
                          className="w-8 h-8 bg-purple-100 hover:bg-purple-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-purple-700 font-bold transition-colors"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveWinery(index, 'down')}
                          disabled={index === bookingData.selected_wineries.length - 1}
                          className="w-8 h-8 bg-purple-100 hover:bg-purple-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-purple-700 font-bold transition-colors"
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-7 h-7 bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                            {index + 1}
                          </span>
                          <h4 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                            {winery.name}
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <span>📍</span> {winery.city}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleWinery(winery as Winery)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-1 font-bold transition-all"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Estimated timing */}
                {bookingData.selected_wineries.length > 0 && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800 font-semibold mb-1">⏰ Estimated Timing</p>
                    <p className="text-xs text-blue-700">
                      ~{Math.floor(bookingData.duration_hours / bookingData.selected_wineries.length * 60)} min per winery
                    </p>
                  </div>
                )}
              </div>
            )}

            {bookingData.selected_wineries.length < minWineries && (
              <div className="mt-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 animate-pulse">
                <p className="text-sm text-yellow-800 font-semibold flex items-center gap-2">
                  <span>⚠️</span>
                  Select at least {minWineries} wineries to continue
                </p>
              </div>
            )}
            
            {bookingData.selected_wineries.length >= minWineries && (
              <div className="mt-4 bg-green-50 border-2 border-green-300 rounded-lg p-3">
                <p className="text-sm text-green-800 font-semibold flex items-center gap-2">
                  <span>✓</span>
                  Ready to continue!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Available Wineries (Right Column) - Enhanced */}
        <div className="lg:col-span-2">
          {/* Search bar with icon */}
          <div className="mb-6">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search by name or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl text-gray-900 font-semibold focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {filteredWineries.length} winer{filteredWineries.length !== 1 ? 'ies' : 'y'} available
            </p>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mb-4"></div>
              <p className="text-lg text-gray-600 font-semibold">Loading wineries...</p>
              <p className="text-sm text-gray-500 mt-2">Discovering the best of Walla Walla</p>
            </div>
          ) : filteredWineries.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-lg text-gray-600 font-semibold mb-2">No wineries found</p>
              <p className="text-sm text-gray-500">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[650px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredWineries.map((winery) => {
                const isSelected = bookingData.selected_wineries.some(w => w.id === winery.id);
                
                return (
                  <button
                    key={winery.id}
                    onClick={() => toggleWinery(winery)}
                    className={`
                      group text-left p-5 rounded-xl border-2 transition-all duration-300 relative overflow-hidden
                      ${isSelected
                        ? 'border-purple-600 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg scale-[1.02]'
                        : 'border-gray-200 hover:border-purple-400 hover:shadow-md hover:scale-[1.01] bg-white'
                      }
                    `}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-0 right-0 w-16 h-16 bg-purple-600 transform rotate-45 translate-x-8 -translate-y-8">
                        <span className="absolute bottom-2 left-2 text-white text-lg transform -rotate-45">✓</span>
                      </div>
                    )}
                    
                    {/* Winery image placeholder */}
                    <div className={`
                      w-full h-32 rounded-lg mb-3 flex items-center justify-center text-4xl transition-all
                      ${isSelected 
                        ? 'bg-gradient-to-br from-purple-200 to-purple-300' 
                        : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-purple-100 group-hover:to-purple-200'
                      }
                    `}>
                      🍷
                    </div>

                    <div className="flex items-start justify-between mb-2">
                      <h4 className={`
                        font-bold text-lg leading-tight transition-colors
                        ${isSelected ? 'text-purple-900' : 'text-gray-900 group-hover:text-purple-700'}
                      `}>
                        {winery.name}
                      </h4>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="text-base">📍</span>
                        <span className="font-medium">{winery.city}</span>
                      </p>
                      
                      {winery.specialties && (
                        <p className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-base">🍇</span>
                          <span className="flex-1">{winery.specialties}</span>
                        </p>
                      )}
                      
                      {winery.tasting_fee && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <span>💰</span>
                            Tasting: ${winery.tasting_fee}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Hover effect overlay */}
                    {!isSelected && (
                      <div className="absolute inset-0 bg-purple-600 opacity-0 group-hover:opacity-5 transition-opacity rounded-xl pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t-2 border-gray-200 mt-8">
        <button
          onClick={prevStep}
          className="px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-bold text-lg transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={nextStep}
          disabled={!canContinue}
          className="px-8 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg transition-colors shadow-lg"
        >
          Continue to Your Info →
        </button>
      </div>
    </div>
  );
}

