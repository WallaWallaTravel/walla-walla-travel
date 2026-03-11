import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import MyTripClientLayout from './MyTripClientLayout';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}

interface ProposalRow {
  customer_name: string;
  trip_type: string;
  party_size: number;
  trip_title: string | null;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { token } = await params;

  if (!token || token.length < 32) {
    return {
      title: 'My Trip',
      description: 'View your Walla Walla wine tour itinerary.',
    };
  }

  const rows = await prisma.$queryRaw<ProposalRow[]>`
    SELECT customer_name, trip_type, party_size, trip_title
    FROM trip_proposals
    WHERE access_token = ${token}`;
  const proposal = rows[0] ?? null;

  if (!proposal) {
    return {
      title: 'My Trip',
      description: 'View your Walla Walla wine tour itinerary.',
    };
  }

  const title = proposal.trip_title || `Your Walla Walla Wine Tour — ${proposal.trip_type}`;
  const description = `Custom ${proposal.trip_type.toLowerCase()} for ${proposal.party_size} guests. View your personalized Walla Walla wine country itinerary.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Walla Walla Wine Country' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: { index: false, follow: false },
  };
}

export default function MyTripLayout({ children }: LayoutProps) {
  return <MyTripClientLayout>{children}</MyTripClientLayout>;
}
