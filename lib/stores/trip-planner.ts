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
import { apiGet, apiPost, apiDelete, apiPatch, type ApiResponse } from '@/lib/utils/fetch-utils';

// Default timeout for trip operations (30 seconds)
const TRIP_API_TIMEOUT = 30000;
// Longer timeout for AI operations which may take longer
const AI_API_TIMEOUT = 60000;

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

    const result = await apiPost<Trip>('/api/trips', input, { timeout: TRIP_API_TIMEOUT });

    if (!result.success) {
      set({ error: result.error || 'Failed to create trip', isSaving: false });
      return null;
    }

    set({ isSaving: false, currentTrip: result.data || null });
    return result.data || null;
  },

  fetchTrip: async (shareCode: string) => {
    set({ isLoading: true, error: null });

    const result = await apiGet<Trip>(`/api/trips/${shareCode}`, { timeout: TRIP_API_TIMEOUT });

    if (!result.success) {
      set({ error: result.error || 'Failed to fetch trip', isLoading: false });
      return;
    }

    set({ currentTrip: result.data || null, isLoading: false });
  },

  loadTripByShareCode: async (shareCode: string) => {
    // Alias for fetchTrip
    await get().fetchTrip(shareCode);
  },

  fetchTrips: async () => {
    set({ isLoading: true, error: null });

    const result = await apiGet<TripSummary[]>('/api/trips', { timeout: TRIP_API_TIMEOUT });

    if (!result.success) {
      set({ error: result.error || 'Failed to fetch trips', isLoading: false });
      return;
    }

    set({ trips: result.data || [], isLoading: false });
  },

  loadMyTrips: async () => {
    set({ isLoading: true, error: null });

    const result = await apiGet<TripSummary[]>('/api/trips/my-trips', { timeout: TRIP_API_TIMEOUT });

    if (!result.success) {
      set({ error: result.error || 'Failed to load trips', isLoading: false });
      return;
    }

    set({ trips: result.data || [], isLoading: false });
  },

  updateTrip: async (tripIdOrShareCode: number | string, updates: Partial<TripBase>) => {
    set({ isSaving: true, error: null });

    const result = await apiPatch<Trip>(`/api/trips/${tripIdOrShareCode}`, updates, {
      timeout: TRIP_API_TIMEOUT,
    });

    if (!result.success) {
      set({ error: result.error || 'Failed to update trip', isSaving: false });
      return null;
    }

    const updatedTrip = result.data || null;
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
  },

  addStop: async (tripId: number, stop: AddStopRequest) => {
    set({ isSaving: true, error: null });

    const result = await apiPost<Trip['stops'][0]>(`/api/trips/${tripId}/stops`, stop, {
      timeout: TRIP_API_TIMEOUT,
    });

    if (!result.success) {
      set({ error: result.error || 'Failed to add stop', isSaving: false });
      return;
    }

    // Update local state with the new stop
    const currentTrip = get().currentTrip;
    if (currentTrip && result.data) {
      set({
        currentTrip: {
          ...currentTrip,
          stops: [...currentTrip.stops, result.data],
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
  },

  removeStop: async (tripId: number, stopId: number) => {
    set({ isSaving: true, error: null });

    const result = await apiDelete(`/api/trips/${tripId}/stops/${stopId}`, {
      timeout: TRIP_API_TIMEOUT,
    });

    if (!result.success) {
      set({ error: result.error || 'Failed to remove stop', isSaving: false });
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
  },

  addGuest: async (tripId: number, guest: AddGuestRequest) => {
    set({ isSaving: true, error: null });

    const result = await apiPost<Trip['guests'][0]>(`/api/trips/${tripId}/guests`, guest, {
      timeout: TRIP_API_TIMEOUT,
    });

    if (!result.success) {
      set({ error: result.error || 'Failed to add guest', isSaving: false });
      return;
    }

    // Update local state
    const currentTrip = get().currentTrip;
    if (currentTrip && result.data) {
      set({
        currentTrip: {
          ...currentTrip,
          guests: [...currentTrip.guests, result.data],
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
  },

  removeGuest: async (tripId: number, guestId: number) => {
    set({ isSaving: true, error: null });

    const result = await apiDelete(`/api/trips/${tripId}/guests/${guestId}`, {
      timeout: TRIP_API_TIMEOUT,
    });

    if (!result.success) {
      set({ error: result.error || 'Failed to remove guest', isSaving: false });
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
  },

  requestHandoff: async (tripId: number, notes?: string) => {
    set({ isSaving: true, error: null });

    const result = await apiPost<{ success: boolean }>(`/api/trips/${tripId}/handoff`, { notes }, {
      timeout: TRIP_API_TIMEOUT,
    });

    if (!result.success) {
      set({ error: result.error || 'Failed to request handoff', isSaving: false });
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

    // AI chat uses longer timeout since responses may take time
    const result = await apiPost<{
      message: string;
      actions?: TripAIAction[];
      proactiveTip?: string;
      refreshSuggestions?: boolean;
    }>(`/api/trips/${shareCode}/chat`, {
      message,
      history: [...chatMessages, userMessage],
    }, {
      timeout: AI_API_TIMEOUT,
    });

    if (!result.success) {
      set({ error: result.error || 'Failed to send message', isSendingMessage: false });
      return;
    }

    // Add assistant response
    const assistantMessage: TripChatMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      content: result.data?.message || '',
      timestamp: new Date().toISOString(),
      actions: result.data?.actions,
    };

    set({
      chatMessages: [...get().chatMessages, assistantMessage],
      isSendingMessage: false,
      proactiveTip: result.data?.proactiveTip || null,
    });

    // Refresh suggestions if the AI indicated we should
    if (result.data?.refreshSuggestions) {
      get().loadSuggestions(shareCode);
    }
  },

  loadSuggestions: async (shareCode: string, focusDay?: number) => {
    set({ isLoadingSuggestions: true });

    // AI suggestions uses longer timeout
    const result = await apiPost<{
      suggestions?: StopSuggestion[];
      proactiveTip?: string;
    }>(`/api/trips/${shareCode}/suggestions`, { focusDay }, {
      timeout: AI_API_TIMEOUT,
    });

    if (!result.success) {
      set({ isLoadingSuggestions: false });
      return;
    }

    set({
      suggestions: result.data?.suggestions || [],
      proactiveTip: result.data?.proactiveTip || get().proactiveTip,
      isLoadingSuggestions: false,
    });
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
