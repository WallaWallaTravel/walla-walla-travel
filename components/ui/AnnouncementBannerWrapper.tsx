'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamic import to avoid SSR issues with client-side localStorage/fetch
const AnnouncementBanner = dynamic(
  () => import('./AnnouncementBanner').then(mod => mod.AnnouncementBanner),
  {
    ssr: false,
    loading: () => null // Don't show anything while loading
  }
);

interface Props {
  position?: 'top' | 'homepage' | 'booking';
}

export function AnnouncementBannerWrapper({ position = 'top' }: Props) {
  return (
    <Suspense fallback={null}>
      <AnnouncementBanner position={position} />
    </Suspense>
  );
}
