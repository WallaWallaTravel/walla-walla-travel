import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Walla Walla Valley Travel Guide | Wine Country Tours & Wineries',
  description: 'Your intelligent guide to Walla Walla Valley wine country. Discover wineries, plan tours, and get personalized recommendations for the perfect wine country experience.',
  keywords: 'Walla Walla, wine tours, wineries, travel guide, wine country, Washington wine, Oregon wine, Walla Walla Valley',
  openGraph: {
    title: 'Walla Walla Valley Travel Guide',
    description: 'Your intelligent guide to Walla Walla Valley wine country',
    type: 'website',
  }
};

export default function TravelGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

