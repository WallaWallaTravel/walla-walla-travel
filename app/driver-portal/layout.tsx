import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'

export default async function DriverPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session || session.user.role !== 'driver') {
    redirect('/driver')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="pb-16">
        {children}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-20 h-16">
        <div className="flex items-center justify-around h-full max-w-lg mx-auto px-4">
          <Link
            href="/driver-portal/dashboard"
            className="flex flex-col items-center justify-center gap-0.5 text-slate-600 hover:text-[#1E3A5F] transition-colors min-w-[3rem]"
          >
            <span className="text-xl leading-none">🏠</span>
            <span className="text-[10px] font-medium">Home</span>
          </Link>

          <Link
            href="/driver-portal/schedule"
            className="flex flex-col items-center justify-center gap-0.5 text-slate-600 hover:text-[#1E3A5F] transition-colors min-w-[3rem]"
          >
            <span className="text-xl leading-none">📅</span>
            <span className="text-[10px] font-medium">Schedule</span>
          </Link>

          <Link
            href="/driver-portal/offers"
            className="flex flex-col items-center justify-center gap-0.5 text-slate-600 hover:text-[#1E3A5F] transition-colors min-w-[3rem]"
          >
            <span className="text-xl leading-none">🚗</span>
            <span className="text-[10px] font-medium">Offers</span>
          </Link>

          <Link
            href="/driver-portal/documents"
            className="flex flex-col items-center justify-center gap-0.5 text-slate-600 hover:text-[#1E3A5F] transition-colors min-w-[3rem]"
          >
            <span className="text-xl leading-none">📄</span>
            <span className="text-[10px] font-medium">Docs</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
