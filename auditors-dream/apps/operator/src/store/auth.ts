import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile, Operator } from '@/lib/database.types';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  operator: Operator | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      operator: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            // Fetch profile with operator
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            const profile = profileData as Profile | null;

            let operator: Operator | null = null;
            if (profile?.operator_id) {
              const { data: operatorData } = await supabase
                .from('operators')
                .select('*')
                .eq('id', profile.operator_id)
                .single();
              operator = operatorData as Operator | null;
            }

            set({
              user: session.user,
              profile,
              operator,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          set({ isLoading: false, error: 'Failed to initialize' });
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event) => {
          if (event === 'SIGNED_OUT') {
            set({
              user: null,
              profile: null,
              operator: null,
              isAuthenticated: false,
            });
          }
        });
      },

      signIn: async (email, password) => {
        set({ isLoading: true, error: null });

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (data.user) {
            // Fetch profile
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            const profile = profileData as Profile | null;

            let operator: Operator | null = null;
            if (profile?.operator_id) {
              const { data: operatorData } = await supabase
                .from('operators')
                .select('*')
                .eq('id', profile.operator_id)
                .single();
              operator = operatorData as Operator | null;
            }

            set({
              user: data.user,
              profile,
              operator,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Sign in failed';
          set({ error: message, isLoading: false });
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({
          user: null,
          profile: null,
          operator: null,
          isAuthenticated: false,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auditors-dream-auth',
      partialize: (state) => ({
        // Only persist these fields
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth on import
useAuthStore.getState().initialize();
