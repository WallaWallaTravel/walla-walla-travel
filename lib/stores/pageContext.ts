import { create } from 'zustand';

interface DirectoryContext {
  category?: 'wineries' | 'tours' | 'events' | 'accommodations' | 'restaurants';
  filterApplied?: string;
  searchQuery?: string;
}

interface WineryDetailContext {
  wineryId?: number;
  wineryName?: string;
  winerySlug?: string;
}

interface WineryContext {
  id?: number;
  name?: string;
  slug?: string;
}

export interface PageContextState {
  directoryContext: DirectoryContext | null;
  wineryDetailContext: WineryDetailContext | null;

  // Actions
  setDirectoryContext: (context: DirectoryContext) => void;
  setWineryDetailContext: (context: WineryDetailContext) => void;
  setWineryContext: (context: WineryContext) => void;
  clearContext: () => void;
}

export const usePageContextStore = create<PageContextState>((set) => ({
  directoryContext: null,
  wineryDetailContext: null,

  setDirectoryContext: (context: DirectoryContext) => {
    set({ directoryContext: context });
  },

  setWineryDetailContext: (context: WineryDetailContext) => {
    set({ wineryDetailContext: context });
  },

  setWineryContext: (context: { id?: number; name?: string; slug?: string }) => {
    set({
      wineryDetailContext: {
        wineryId: context.id,
        wineryName: context.name,
        winerySlug: context.slug,
      },
    });
  },

  clearContext: () => {
    set({ directoryContext: null, wineryDetailContext: null });
  },
}));
