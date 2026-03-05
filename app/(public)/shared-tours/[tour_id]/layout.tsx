import { Metadata } from 'next';
import { queryOne } from '@/lib/db-helpers';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ tour_id: string }>;
}

interface TourRow {
  title: string;
  tour_date: string;
  description: string | null;
  base_price_per_person: number;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { tour_id } = await params;

  const tour = await queryOne<TourRow>(
    `SELECT title, tour_date, description, base_price_per_person
     FROM shared_tour_schedule
     WHERE id = $1`,
    [tour_id]
  );

  if (!tour) {
    return {
      title: 'Shared Wine Tour',
      description: 'Book a shared wine tour in Walla Walla wine country.',
    };
  }

  const dateStr = new Date(tour.tour_date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const title = `${tour.title} — ${dateStr}`;
  const description = tour.description || `Join a shared wine tour in Walla Walla on ${dateStr}. Starting at $${tour.base_price_per_person}/person.`;

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
  };
}

export default function SharedTourLayout({ children }: LayoutProps) {
  return children;
}
