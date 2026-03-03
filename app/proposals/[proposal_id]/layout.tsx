import { Metadata } from 'next';
import { queryOne } from '@/lib/db-helpers';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ proposal_id: string }>;
}

interface ProposalRow {
  title: string;
  client_name: string;
  valid_until: string;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { proposal_id } = await params;

  const proposal = await queryOne<ProposalRow>(
    `SELECT title, client_name, valid_until
     FROM proposals
     WHERE proposal_number = $1 OR id::text = $1`,
    [proposal_id]
  );

  if (!proposal) {
    return {
      title: 'Proposal',
      description: 'View your Walla Walla travel proposal.',
    };
  }

  const title = proposal.title || 'Your Walla Walla Travel Proposal';
  const description = `Custom travel proposal for ${proposal.client_name}. Review your personalized Walla Walla wine country experience.`;

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

export default function ProposalLayout({ children }: LayoutProps) {
  return children;
}
