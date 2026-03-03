import { Metadata } from 'next';
import { queryOne } from '@/lib/db-helpers';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ proposalNumber: string }>;
}

interface ProposalRow {
  customer_name: string;
  trip_type: string;
  party_size: number;
  start_date: string;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { proposalNumber } = await params;

  const proposal = await queryOne<ProposalRow>(
    `SELECT customer_name, trip_type, party_size, start_date
     FROM trip_proposals
     WHERE proposal_number = $1`,
    [proposalNumber]
  );

  if (!proposal) {
    return {
      title: 'Trip Proposal',
      description: 'View your Walla Walla wine tour proposal.',
    };
  }

  const title = `Your Walla Walla Wine Tour — ${proposal.trip_type}`;
  const description = `Custom ${proposal.trip_type.toLowerCase()} for ${proposal.party_size} guests. Review your personalized Walla Walla wine country itinerary.`;

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

export default function TripProposalLayout({ children }: LayoutProps) {
  return children;
}
