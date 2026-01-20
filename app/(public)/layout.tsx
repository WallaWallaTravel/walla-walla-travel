import { PublicHeader } from '@/components/PublicHeader';
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
      <WineryFinderWidget />
    </>
  );
}
