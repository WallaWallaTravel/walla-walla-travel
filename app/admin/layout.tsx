import { AdminSidebar, AdminMobileNav } from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 pb-20 lg:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile Navigation */}
      <AdminMobileNav />
    </div>
  );
}

