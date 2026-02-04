'use client';

import { createContext, useContext } from 'react';

interface HotelPartner {
  id: string;
  name: string;
  contact_name: string | null;
  email: string;
}

export interface AuthContextType {
  hotel: HotelPartner | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useHotelAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useHotelAuth must be used within a PartnerPortalLayout');
  }
  return context;
}
