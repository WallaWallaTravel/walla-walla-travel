import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface FavoriteWinery {
  id: number;
  name: string;
  slug: string;
  region?: string;
  image_url?: string;
  tasting_fee?: number;
  addedAt: Date;
  // Optional context about why it was added
  note?: string;
  source?: 'grid' | 'detail' | 'ai-recommendation';
}

interface FavoritesState {
  favorites: FavoriteWinery[];
  isHydrated: boolean;

  // Actions
  addFavorite: (winery: Omit<FavoriteWinery, 'addedAt'>) => void;
  removeFavorite: (wineryId: number) => void;
  toggleFavorite: (winery: Omit<FavoriteWinery, 'addedAt'>) => void;
  isFavorite: (wineryId: number) => boolean;
  updateNote: (wineryId: number, note: string) => void;
  clearFavorites: () => void;
  setHydrated: (hydrated: boolean) => void;
  getFavoriteIds: () => number[];
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      isHydrated: false,

      addFavorite: (winery) => {
        const { favorites } = get();
        // Don't add duplicates
        if (favorites.some(f => f.id === winery.id)) {
          return;
        }
        set({
          favorites: [
            ...favorites,
            { ...winery, addedAt: new Date() }
          ]
        });
      },

      removeFavorite: (wineryId) => {
        set({
          favorites: get().favorites.filter(f => f.id !== wineryId)
        });
      },

      toggleFavorite: (winery) => {
        const { favorites, addFavorite, removeFavorite } = get();
        if (favorites.some(f => f.id === winery.id)) {
          removeFavorite(winery.id);
        } else {
          addFavorite(winery);
        }
      },

      isFavorite: (wineryId) => {
        return get().favorites.some(f => f.id === wineryId);
      },

      updateNote: (wineryId, note) => {
        set({
          favorites: get().favorites.map(f =>
            f.id === wineryId ? { ...f, note } : f
          )
        });
      },

      clearFavorites: () => {
        set({ favorites: [] });
      },

      setHydrated: (hydrated) => {
        set({ isHydrated: hydrated });
      },

      getFavoriteIds: () => {
        return get().favorites.map(f => f.id);
      }
    }),
    {
      name: 'winery-favorites',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
      // Transform dates back to Date objects on rehydration
      merge: (persisted, current) => {
        const persistedState = persisted as FavoritesState | undefined;
        if (!persistedState) return current;

        return {
          ...current,
          ...persistedState,
          favorites: (persistedState.favorites || []).map(f => ({
            ...f,
            addedAt: new Date(f.addedAt)
          }))
        };
      }
    }
  )
);

// Hook for getting favorite count (useful for badges)
export function useFavoriteCount() {
  return useFavoritesStore(state => state.favorites.length);
}

// Hook for checking if a specific winery is favorited
export function useIsFavorite(wineryId: number) {
  return useFavoritesStore(state => state.favorites.some(f => f.id === wineryId));
}
