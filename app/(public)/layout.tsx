import { PublicHeader } from '@/components/PublicHeader';
import Footer from '@/components/Footer';
import { WineryFinderWidget } from '@/components/ai/WineryFinderWidget';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicHeader />
      {children}
      <Footer />
      <WineryFinderWidget />
    </>
  );
}
