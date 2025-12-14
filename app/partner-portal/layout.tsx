import { PartnerSidebar } from '@/components/partner/PartnerSidebar';

export default function PartnerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <PartnerSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}




