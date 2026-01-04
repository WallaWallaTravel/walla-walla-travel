'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with client-side localStorage/fetch
const AnnouncementBanner = dynamic(
  () => import('./AnnouncementBanner').then(mod => mod.AnnouncementBanner),
  { ssr: false }
);

interface Props {
  position?: 'top' | 'homepage' | 'booking';
}

export function AnnouncementBannerWrapper({ position = 'top' }: Props) {
  return <AnnouncementBanner position={position} />;
}
