'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface AdminSidebarProps {
  userName: string
  userRole: string
}

interface NavItem {
  label: string
  href: string
  external?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'SWITCH PORTAL',
    items: [
      { label: 'Driver Portal', href: '/driver-portal' },
      { label: 'Main Website', href: '/', external: true },
      { label: "Auditor's Dream", href: '/auditors-dream', external: true },
    ],
  },
  {
    title: 'OVERVIEW',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard' },
      { label: "Today's Priorities", href: '/admin/today' },
      { label: 'Calendar', href: '/admin/calendar' },
    ],
  },
  {
    title: 'SALES PIPELINE',
    items: [
      { label: 'Leads', href: '/admin/leads' },
      { label: 'Proposals', href: '/admin/trip-proposals' },
      { label: 'Pending/Drafts', href: '/admin/drafts' },
      { label: 'Tasks', href: '/admin/crm/tasks' },
      { label: 'Trips', href: '/admin/bookings' },
      { label: 'Shared Tours', href: '/admin/shared-tours' },
    ],
  },
  {
    title: 'CRM',
    items: [
      { label: 'CRM', href: '/admin/crm' },
      { label: 'Contacts', href: '/admin/crm/contacts' },
      { label: 'Pipeline', href: '/admin/crm/pipeline' },
    ],
  },
  {
    title: 'FINANCIAL',
    items: [
      { label: 'Invoices', href: '/admin/invoices' },
      { label: 'Pricing', href: '/admin/pricing' },
    ],
  },
  {
    title: 'COMPLIANCE',
    items: [
      { label: 'Drivers', href: '/admin/drivers' },
      { label: 'Vehicles', href: '/admin/vehicles' },
    ],
  },
  {
    title: 'CONTENT',
    items: [
      { label: 'Page Content', href: '/admin/content' },
      { label: 'Business Portal', href: '/admin/business-portal' },
    ],
  },
]

function SidebarContent({
  userName,
  userRole,
  onNavClick,
}: AdminSidebarProps & { onNavClick?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-slate-200">
        <h1 className="text-lg font-bold text-slate-900">Walla Walla Travel</h1>
        <p className="text-sm text-slate-600 mt-0.5">Admin Portal</p>
      </div>

      {/* User Info */}
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
        <p className="text-sm font-medium text-slate-900">{userName}</p>
        <p className="text-xs text-slate-600 capitalize">{userRole.replace('_', ' ')}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 px-3">
              {section.title}
            </h2>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href + '/'))

                if (item.external) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onNavClick}
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                      <span>{item.label}</span>
                      <svg
                        className="w-3.5 h-3.5 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </Link>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavClick}
                    className={cn(
                      'block px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors text-left"
        >
          Log out
        </button>
      </div>
    </div>
  )
}

export function AdminSidebar({ userName, userRole }: AdminSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-white border border-slate-200 shadow-sm"
        aria-label="Open navigation menu"
      >
        <svg
          className="w-5 h-5 text-slate-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Desktop sidebar — fixed */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-56 bg-white border-r border-slate-200">
        <SidebarContent userName={userName} userRole={userRole} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar panel */}
          <aside className="absolute inset-y-0 left-0 w-56 bg-white shadow-xl">
            <SidebarContent
              userName={userName}
              userRole={userRole}
              onNavClick={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  )
}
