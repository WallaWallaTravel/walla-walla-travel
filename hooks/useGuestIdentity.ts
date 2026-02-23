'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

interface GuestData {
  guest_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  is_registered: boolean;
  is_primary: boolean;
  dietary_restrictions: string | null;
  accessibility_needs: string | null;
  special_requests: string | null;
}

interface RegisterData {
  name: string;
  email: string;
  phone?: string;
}

interface UseGuestIdentityReturn {
  guestId: number | null;
  guestToken: string | null;
  guest: GuestData | null;
  isRegistered: boolean;
  loading: boolean;
  resolveGuest: () => Promise<void>;
  registerGuest: (data: RegisterData) => Promise<void>;
}

const STORAGE_PREFIX = 'wwt_guest_';

function getStoredToken(proposalToken: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${proposalToken}`);
  } catch {
    return null;
  }
}

function storeToken(proposalToken: string, guestToken: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${proposalToken}`, guestToken);
  } catch {
    // localStorage not available
  }
}

export function useGuestIdentity(proposalToken: string): UseGuestIdentityReturn {
  const searchParams = useSearchParams();
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<number | null>(null);
  const [guest, setGuest] = useState<GuestData | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  // On mount: get guest token from URL param or localStorage
  useEffect(() => {
    const urlToken = searchParams.get('guest');
    const storedToken = getStoredToken(proposalToken);
    const token = urlToken || storedToken;

    if (token) {
      setGuestToken(token);
      // Persist to localStorage for return visits
      storeToken(proposalToken, token);
    } else {
      // No guest token = coordinator view
      setLoading(false);
    }
  }, [searchParams, proposalToken]);

  // Resolve guest identity when we have a token
  const resolveGuest = useCallback(async () => {
    if (!guestToken) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/my-trip/${proposalToken}/guests/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_token: guestToken }),
      });

      if (!res.ok) {
        setLoading(false);
        return;
      }

      const json = await res.json();
      if (json.success && json.data) {
        setGuestId(json.data.guest_id);
        setGuest(json.data);
        setIsRegistered(json.data.is_registered);
      }
    } catch {
      // Silently fail — guest just won't be identified
    } finally {
      setLoading(false);
    }
  }, [guestToken, proposalToken]);

  // Auto-resolve when token becomes available
  useEffect(() => {
    if (guestToken) {
      resolveGuest();
    }
  }, [guestToken, resolveGuest]);

  // Register guest
  const registerGuest = useCallback(
    async (data: RegisterData) => {
      if (!guestId) return;

      const res = await fetch(
        `/api/my-trip/${proposalToken}/guests/${guestId}/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || 'Registration failed');
      }

      const json = await res.json();
      if (json.success && json.data) {
        setGuest({
          guest_id: json.data.id,
          name: json.data.name,
          email: json.data.email,
          phone: json.data.phone,
          is_registered: true,
          is_primary: json.data.is_primary,
          dietary_restrictions: json.data.dietary_restrictions,
          accessibility_needs: json.data.accessibility_needs,
          special_requests: json.data.special_requests,
        });
        setIsRegistered(true);
      }
    },
    [guestId, proposalToken]
  );

  return {
    guestId,
    guestToken,
    guest,
    isRegistered,
    loading,
    resolveGuest,
    registerGuest,
  };
}
