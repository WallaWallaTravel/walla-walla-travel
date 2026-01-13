import { create } from 'zustand';
import {
  Trip,
  TripBase,
  CreateTripInput,
  TripSummary,
  AddStopRequest,
  AddGuestRequest,
  TripChatMessage,
  TripAIAction,
  StopSuggestion,
} from '@/lib/types/trip-planner';

export interface TripPlannerState {
  trips: TripSummary[];
  currentTrip: Trip | null;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;

  // AI Chat State
  chatMessages: TripChatMessage[];
  isSendingMessage: boolean;
  suggestions: StopSuggestion[];
  isLoadingSuggestions: boolean;
  proactiveTip: string | null;

  // Core Actions
  createTrip: (input: CreateTripInput) => Promise<Trip | null>;
  fetchTrip: (shareCode: string) => Promise<void>;
  fetchTrips: () => Promise<void>;
  loadMyTrips: () => Promise<void>;
  loadTripByShareCode: (shareCode: string) => Promise<void>;
  updateTrip: (tripIdOrShareCode: number | string, updates: Partial<TripBase>) => Promise<Trip | null>;
  clearError: () => void;

  // Stop Actions
  addStop: (tripId: number, stop: AddStopRequest) => Promise<void>;
  removeStop: (tripId: number, stopId: number) => Promise<void>;

  // Guest Actions
  addGuest: (tripId: number, guest: AddGuestRequest) => Promise<void>;
  removeGuest: (tripId: number, guestId: number) => Promise<void>;

  // Handoff Actions
  requestHandoff: (tripId: number, notes?: string) => Promise<boolean>;

  // AI Chat Actions
  sendChatMessage: (shareCode: string, message: string) => Promise<void>;
  loadSuggestions: (shareCode: string, focusDay?: number) => Promise<void>;
  applySuggestion: (suggestion: StopSuggestion) => Promise<void>;
  clearChat: () => void;
}

export const useTripPlannerStore = create<TripPlannerState>((set, get) => ({
  trips: [],
  currentTrip: null,
  isSaving: false,
  isLoading: false,
  error: null,

  // AI Chat State
  chatMessages: [],
  isSendingMessage: false,
  suggestions: [],
  isLoadingSuggestions: false,
  proactiveTip: null,

  createTrip: async (input: CreateTripInput) => {
    set({ isSaving: true, error: null });

    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = typeof data.error === 'string'
          ? data.error
          : data.error?.message || 'Failed to create trip';
        set({ error: errorMessage, isSaving: false });
        return null;
      }

      const trip = data.data;
      set({ isSaving: false, currentTrip: trip });
      return trip;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create trip';
      set({ error: errorMessage, isSaving: false });
      return null;
    }
  },

  fetchTrip: async (shareCode: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`/api/trips/${shareCode}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = typeof data.error === 'string'
          ? data.error
          : data.error?.message || 'Failed to fetch trip';
        set({ error: errorMessage, isLoading: false });
        return;
      }

      set({ currentTrip: data.data, isLoading: false });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trip';
      set({ error: errorMessage, isLoading: false });
    }
  },

  loadTripByShareCode: async (shareCode: string) => {
    // Alias for fetchTrip
    await get().fetchTrip(shareCode);
  },

  fetchTrips: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/trips');
      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = typeof data.error === 'string'
          ? data.error
          : data.error?.message || 'Failed to fetch trips';
        set({ error: errorMessage, isLoading: false });
        return;
      }

      set({ trips: data.data, isLoading: false });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trips';
      set({ error: errorMessage, isLoading: false });
    }
  },

  loadMyTrips: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/trips/my-trips');
      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = typeof data.error === 'string'
          ? data.error
          : data.error?.message || 'Failed to load trips';
        set({ error: errorMessage, isLoading: false });
        return;
      }

      set({ trips: data.data, isLoading: false });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load trips';
      set({ error: errorMessage, isLoading: false });
    }
  },

  updateTrip: async (tripIdOrShareCode: number | string, updates: Partial<TripBase>) => {
    set({ isSaving: true, error: null });

    try {
      const response = await fetch(`/api/trips/${tripIdOrShareCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = typeof data.error === 'string'
          ? data.error
          : data.error?.message || 'Failed to update trip';
        set({ error: errorMessage, isSaving: false });
        return null;
      }

      const updatedTrip = data.data;
      set({
        currentTrip: updatedTrip,
        isSaving: false,
        trips: get().trips.map(t =>
          t.share_code === (typeof tripIdOrShareCode === 'string' ? tripIdOrShareCode : updatedTrip?.share_code)
            ? { ...t, ...updates }
            : t
        )
      });
      return updatedTrip;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update trip';
      set({ error: errorMessage, isSaving: false });
      return null;
    }
  },

  addStop: async (tripId: number, stop: AddStopRequest) => {
    set({ isSaving: true, error: null });

    try {
      const response = await fetch(`/api/trips/${tripId}/stops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stop),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = typeof data.error === 'string'
          ? data.error
          : data.error?.message || 'Failed to add stop';
        set({ error: errorMessage, isSaving: false });
        return;
      }

      // Refresh the current trip to get updated stops
      const currentTrip = get().currentTrip;
      if (currentTrip) {
        set({
          currentTrip: {
            ...currentTrip,
            stops: [...currentTrip.stops, data.data],
            stats: {
              ...currentTrip.stats,
              total_stops: currentTrip.stats.total_stops + 1,
            },
          },
          isSaving: false,
        });
      } else {
        set({ isSaving: false });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add stop';
      set({ error: errorMessage, isSaving: false });
    }
  },

  removeStop: async (tripId: number, stopId: number) => {
    set({ isSaving: true, error: null });

    try {
      const response = await fetch(`/api/trips/${tripId}/stops/${stopId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = typeof data.error === 'string'
          ? data.error
          : data.error?.message || 'Failed to remove stop';
        set({ error: errorMessage, isSaving: false });
        return;
      }

      // Update local state
      const currentTrip = get().currentTrip;
      if (currentTrip) {
        set({
          currentTrip: {
            ...currentTrip,
            stops: currentTrip.stops.filter(s => s.id !== stopId),
            stats: {
              ...currentTrip.stats,
              total_stops: Math.max(0, currentTrip.stats.total_stops - 1),
            },
          },
          isSaving: false,
        });
      } else {
        set({ isSaving: false });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove stop';
      set({ error: errorMessage, isSaving: false });
    }
  },

  addGuest: async (tripId: number, guest: AddGuestRequest) => {
    set({ isSaving: true, error: null });

    try {
      const response = await fetch(`/api/trips/${tripId}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guest),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = typeof data.error === 'string'
          ? data.error
          : data.error?.message || 'Failed to add guest';
        set({ error: errorMessage, isSaving: false });
        return;
      }

      // Update local state
      const currentTrip = get().currentTrip;
      if (currentTrip) {
        set({
          currentTrip: {
            ...currentTrip,
            guests: [...currentTrip.guests, data.data],
            stats: {
              ...currentTrip.stats,
              pending_rsvps: currentTrip.stats.pending_rsvps + 1,
            },
          },
          isSaving: false,
        });
      } else {
        set({ isSaving: false });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add guest';
      set({ error: errorMessage, isSaving: false });
    }
  },

  removeGuest: async (tripId: number, guestId: number) => {
    set({ isSaving: true, error: null });

    try {
      const response = await fetch(`/api/trips/${tripId}/guests/${guestId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = typeof data.error === 'string'
          ? data.error
          : data.error?.message || 'Failed to remove guest';
        set({ error: errorMessage, isSaving: false });
        return;
      }

      // Update local state
      const currentTrip = get().currentTrip;
      if (currentTrip) {
        const removedGuest = currentTrip.guests.find(g => g.id === guestId);
        set({
          currentTrip: {
            ...currentTrip,
            guests: currentTrip.guests.filter(g => g.id !== guestId),
            stats: {
              ...currentTrip.stats,
              attending_guests: removedGuest?.rsvp_status === 'attending'
                ? Math.max(0, currentTrip.stats.attending_guests - 1)
                : currentTrip.stats.attending_guests,
              pending_rsvps: removedGuest?.rsvp_status === 'pending'
                ? Math.max(0, currentTrip.stats.pending_rsvps - 1)
                : currentTrip.stats.pending_rsvps,
            },
          },
          isSaving: false,
        });
      } else {
        set({ isSaving: false });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove guest';
      set({ error: errorMessage, isSaving: false });
    }
  },

  requestHandoff: async (tripId: number, notes?: string) => {
    set({ isSaving: true, error: null });

    try {
      const response = await fetch(`/api/trips/${tripId}/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = typeof data.error === 'string'
          ? data.error
          : data.error?.message || 'Failed to request handoff';
        set({ error: errorMessage, isSaving: false });
        return false;
      }

      // Update local state (Trip has flat structure)
      const currentTrip = get().currentTrip;
      if (currentTrip) {
        set({
          currentTrip: {
            ...currentTrip,
            status: 'handed_off',
          },
          isSaving: false,
        });
      } else {
        set({ isSaving: false });
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request handoff';
      set({ error: errorMessage, isSaving: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  // ==========================================================================
  // AI Chat Actions
  // ==========================================================================

  sendChatMessage: async (shareCode: string, message: string) => {
    const { chatMessages } = get();

    // Add user message immediately
    const userMessage: TripChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    set({
      chatMessages: [...chatMessages, userMessage],
      isSendingMessage: true,
      error: null,
    });

    try {
      const response = await fetch(`/api/trips/${shareCode}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: [...chatMessages, userMessage],
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          typeof data.error === 'string'
            ? data.error
            : data.error?.message || 'Failed to send message';
        set({ error: errorMessage, isSendingMessage: false });
        return;
      }

      // Add assistant response
      const assistantMessage: TripChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: data.data.message,
        timestamp: new Date().toISOString(),
        actions: data.data.actions,
      };

      set({
        chatMessages: [...get().chatMessages, assistantMessage],
        isSendingMessage: false,
        proactiveTip: data.data.proactiveTip || null,
      });

      // Refresh suggestions if the AI indicated we should
      if (data.data.refreshSuggestions) {
        get().loadSuggestions(shareCode);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      set({ error: errorMessage, isSendingMessage: false });
    }
  },

  loadSuggestions: async (shareCode: string, focusDay?: number) => {
    set({ isLoadingSuggestions: true });

    try {
      const response = await fetch(`/api/trips/${shareCode}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusDay }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        set({ isLoadingSuggestions: false });
        return;
      }

      set({
        suggestions: data.data.suggestions || [],
        proactiveTip: data.data.proactiveTip || get().proactiveTip,
        isLoadingSuggestions: false,
      });
    } catch (err) {
      set({ isLoadingSuggestions: false });
    }
  },

  applySuggestion: async (suggestion: StopSuggestion) => {
    const { currentTrip } = get();
    if (!currentTrip) return;

    // Convert suggestion to AddStopRequest
    const stopRequest: AddStopRequest = {
      name: suggestion.name,
      stop_type: suggestion.type,
      day_number: suggestion.dayRecommendation,
      planned_arrival: suggestion.arrivalTime,
      winery_id: suggestion.wineryId,
      notes: suggestion.reason,
    };

    // Use existing addStop action
    await get().addStop(currentTrip.id, stopRequest);

    // Remove the applied suggestion from the list
    set({
      suggestions: get().suggestions.filter((s) => s.id !== suggestion.id),
    });

    // Reload suggestions after adding
    get().loadSuggestions(currentTrip.share_code);
  },

  clearChat: () => {
    set({
      chatMessages: [],
      proactiveTip: null,
    });
  },
}));

// Selector hooks for convenience
export const useMyTrips = () => useTripPlannerStore((state) => state.trips);
export const useCurrentTrip = () => useTripPlannerStore((state) => state.currentTrip);
export const useTripLoading = () => useTripPlannerStore((state) => state.isLoading);
export const useTripError = () => useTripPlannerStore((state) => state.error);

// AI Chat selectors
export const useChatMessages = () => useTripPlannerStore((state) => state.chatMessages);
export const useIsSendingMessage = () => useTripPlannerStore((state) => state.isSendingMessage);
export const useSuggestions = () => useTripPlannerStore((state) => state.suggestions);
export const useIsLoadingSuggestions = () => useTripPlannerStore((state) => state.isLoadingSuggestions);
export const useProactiveTip = () => useTripPlannerStore((state) => state.proactiveTip);
