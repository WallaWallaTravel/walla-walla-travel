import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AdminSidebar
        userName={session.user.name}
        userRole={session.user.role}
      />
      <main className="flex-1 overflow-y-auto ml-0 lg:ml-56">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
