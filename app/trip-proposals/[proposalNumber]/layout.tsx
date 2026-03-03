import { Metadata } from 'next';
import { queryOne } from '@/lib/db-helpers';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ proposalNumber: string }>;
}

interface ProposalRow {
  customer_name: string;
  trip_type: string;
  trip_title: string | null;
  party_size: number;
  start_date: string;
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

  const proposal = await queryOne<ProposalRow>(
    `SELECT customer_name, trip_type, trip_title, party_size, start_date
     FROM trip_proposals
     WHERE proposal_number = $1`,
    [proposalNumber]
  );

  if (!proposal) {
    return {
      title: 'Trip Proposal | Walla Walla Travel',
      description: 'View your personalized Walla Walla wine country trip proposal.',
    };
  }

  const tripLabel = formatTripType(proposal.trip_type);
  const dateStr = new Date(proposal.start_date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const title = proposal.trip_title
    ? `${proposal.trip_title} | Walla Walla Travel`
    : `${tripLabel} for ${proposal.party_size} | Walla Walla Travel`;

  const description = `${tripLabel} for ${proposal.party_size} guests — ${dateStr}. Your personalized Walla Walla wine country itinerary.`;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://wallawalla.travel';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Walla Walla Travel',
      url: `${baseUrl}/trip-proposals/${proposalNumber}`,
      images: [{ url: `${baseUrl}/og-wine-country.jpg`, width: 1200, height: 630, alt: 'Walla Walla Wine Country' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/og-wine-country.jpg`],
    },
    robots: { index: false, follow: false },
  };
}

export default function TripProposalLayout({ children }: LayoutProps) {
  return children;
}
