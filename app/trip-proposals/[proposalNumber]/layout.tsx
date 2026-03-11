import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ proposalNumber: string }>;
}

const TRIP_TYPE_LABELS: Record<string, string> = {
  wine_tour: 'Wine Tour',
  celebration: 'Celebration',
  corporate: 'Corporate Event',
  family: 'Family Trip',
  romantic: 'Romantic Getaway',
  birthday: 'Birthday Celebration',
  anniversary: 'Anniversary',
  wedding: 'Wedding',
  custom: 'Custom Experience',
  other: 'Wine Country Experience',
};

function formatTripType(raw: string): string {
  return TRIP_TYPE_LABELS[raw] || raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { proposalNumber } = await params;

  const proposal = await prisma.trip_proposals.findUnique({
    where: { proposal_number: proposalNumber },
    select: {
      customer_name: true,
      trip_type: true,
      trip_title: true,
      party_size: true,
      start_date: true,
    },
  });

  if (!proposal) {
    return {
      title: 'Trip Proposal | Walla Walla Travel',
      description: 'View your personalized Walla Walla wine country trip proposal.',
    };
  }

  const tripLabel = formatTripType(proposal.trip_type || 'other');
  const dateStr = proposal.start_date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const title = proposal.trip_title
    ? proposal.trip_title
    : `${tripLabel} for ${proposal.party_size}`;

  const description = `${tripLabel} for ${proposal.party_size} guests — ${dateStr}. Your personalized Walla Walla wine country itinerary.`;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://wallawalla.travel';

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Walla Walla Travel`,
      description,
      type: 'website',
      siteName: 'Walla Walla Travel',
      url: `${baseUrl}/trip-proposals/${proposalNumber}`,
      images: [{ url: `${baseUrl}/og-wine-country.jpg`, width: 1200, height: 630, alt: 'Walla Walla Wine Country' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Walla Walla Travel`,
      description,
      images: [`${baseUrl}/og-wine-country.jpg`],
    },
    robots: { index: false, follow: false },
  };
}

export default function TripProposalLayout({ children }: LayoutProps) {
  return children;
}
