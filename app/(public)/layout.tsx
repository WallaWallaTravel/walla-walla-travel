import { headers } from 'next/headers';
import { PublicHeader } from '@/components/PublicHeader';
import { EventsHeader } from '@/components/events/EventsHeader';
import Footer from '@/components/Footer';
import { WineryFinderWidget } from '@/components/ai/WineryFinderWidget';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const isEventsDomain = headersList.get('x-events-domain') === 'true';

  return (
    <>
      {isEventsDomain ? <EventsHeader /> : <PublicHeader />}
      {children}
      <Footer />
      {!isEventsDomain && <WineryFinderWidget />}
    </>
  );
}
