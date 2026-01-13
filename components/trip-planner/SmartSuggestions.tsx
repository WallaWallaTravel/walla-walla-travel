'use client';

import { useEffect } from 'react';
import {
  useTripPlannerStore,
  useSuggestions,
  useIsLoadingSuggestions,
} from '@/lib/stores/trip-planner';
import { StopSuggestion, StopType } from '@/lib/types/trip-planner';

// ============================================================================
// Stop Type Icons
// ============================================================================

const STOP_TYPE_ICONS: Record<StopType, string> = {
  winery: '🍷',
  restaurant: '🍽️',
  activity: '🎯',
  accommodation: '🏨',
  transportation: '🚗',
  custom: '📍',
};

// ============================================================================
// Suggestion Card Component
// ============================================================================

interface SuggestionCardProps {
  suggestion: StopSuggestion;
  onAdd: () => void;
  onMoreInfo: () => void;
}

function SuggestionCard({ suggestion, onAdd, onMoreInfo }: SuggestionCardProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 hover:border-[#722F37]/30 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center text-xl">
          {STOP_TYPE_ICONS[suggestion.type] || '📍'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-stone-900 text-sm truncate">
            {suggestion.name}
          </h4>
          <p className="text-xs text-stone-600 mt-0.5 line-clamp-2">
            {suggestion.reason}
          </p>

          {/* Tags */}
          {(suggestion.wineStyles || suggestion.experienceTags) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {suggestion.wineStyles?.slice(0, 2).map((style, idx) => (
                <span
                  key={`wine-${idx}`}
                  className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs"
                >
                  {style}
                </span>
              ))}
              {suggestion.experienceTags?.slice(0, 2).map((tag, idx) => (
                <span
                  key={`exp-${idx}`}
                  className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Day recommendation */}
          {suggestion.dayRecommendation && (
            <p className="text-xs text-stone-500 mt-2">
              Suggested for Day {suggestion.dayRecommendation}
              {suggestion.arrivalTime && ` at ${suggestion.arrivalTime}`}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={onAdd}
          className="flex-1 px-3 py-1.5 bg-[#722F37] text-white rounded-lg text-xs font-medium hover:bg-[#8B1538] transition-colors"
        >
          + Add to Itinerary
        </button>
        <button
          onClick={onMoreInfo}
          className="px-3 py-1.5 border border-stone-200 text-stone-700 rounded-lg text-xs font-medium hover:bg-stone-50 transition-colors"
        >
          Details
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function SuggestionSkeleton() {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-stone-200 rounded-lg" />
        <div className="flex-1">
          <div className="h-4 bg-stone-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-stone-200 rounded w-full mb-1" />
          <div className="h-3 bg-stone-200 rounded w-2/3" />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <div className="flex-1 h-8 bg-stone-200 rounded-lg" />
        <div className="w-16 h-8 bg-stone-200 rounded-lg" />
      </div>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="text-center py-6">
      <div className="text-3xl mb-2">🤖</div>
      <p className="text-sm text-stone-600 mb-3">
        Get personalized suggestions based on your trip
      </p>
      <button
        onClick={onRefresh}
        className="px-4 py-2 bg-[#722F37] text-white rounded-lg text-sm font-medium hover:bg-[#8B1538] transition-colors"
      >
        Get Suggestions
      </button>
    </div>
  );
}

// ============================================================================
// Main SmartSuggestions Component
// ============================================================================

interface SmartSuggestionsProps {
  shareCode: string;
  tripId: number;
  focusDay?: number;
  className?: string;
}

export function SmartSuggestions({
  shareCode,
  tripId,
  focusDay,
  className = '',
}: SmartSuggestionsProps) {
  const suggestions = useSuggestions();
  const isLoading = useIsLoadingSuggestions();
  const loadSuggestions = useTripPlannerStore((state) => state.loadSuggestions);
  const applySuggestion = useTripPlannerStore((state) => state.applySuggestion);
  const sendChatMessage = useTripPlannerStore((state) => state.sendChatMessage);

  // Load suggestions on mount
  useEffect(() => {
    if (shareCode && suggestions.length === 0) {
      loadSuggestions(shareCode, focusDay);
    }
  }, [shareCode, focusDay, loadSuggestions, suggestions.length]);

  const handleRefresh = () => {
    loadSuggestions(shareCode, focusDay);
  };

  const handleAddSuggestion = async (suggestion: StopSuggestion) => {
    await applySuggestion(suggestion);
    // Refresh suggestions after adding
    loadSuggestions(shareCode, focusDay);
  };

  const handleMoreInfo = (suggestion: StopSuggestion) => {
    // Send a chat message asking for more details
    sendChatMessage(
      shareCode,
      `Tell me more about ${suggestion.name}. What makes it special and what should I expect?`
    );
  };

  const isEmpty = suggestions.length === 0 && !isLoading;

  return (
    <div className={`bg-stone-50 rounded-xl p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="font-semibold text-stone-900 text-sm">Smart Suggestions</h3>
        </div>
        {!isEmpty && !isLoading && (
          <button
            onClick={handleRefresh}
            className="text-xs text-[#722F37] hover:underline font-medium"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          <SuggestionSkeleton />
          <SuggestionSkeleton />
        </div>
      ) : isEmpty ? (
        <EmptyState onRefresh={handleRefresh} />
      ) : (
        <div className="space-y-3">
          {suggestions.slice(0, 3).map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onAdd={() => handleAddSuggestion(suggestion)}
              onMoreInfo={() => handleMoreInfo(suggestion)}
            />
          ))}
        </div>
      )}

      {/* Footer hint */}
      {!isEmpty && !isLoading && (
        <p className="text-xs text-stone-500 text-center mt-3">
          Based on your trip preferences and current itinerary
        </p>
      )}
    </div>
  );
}

export default SmartSuggestions;
