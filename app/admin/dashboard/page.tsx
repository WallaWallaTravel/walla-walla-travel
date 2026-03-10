import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    confirmed: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-slate-100 text-slate-600',
  }
  const colorClass = colors[status] || 'bg-slate-100 text-slate-700'

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export default async function AdminDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Fetch all data in parallel
  const [
    totalBookings,
    activeProposals,
    upcomingTours,
    revenueResult,
    recentBookings,
    recentProposals,
    todaysTasks,
  ] = await Promise.all([
    // Total bookings
    prisma.bookings.count(),

    // Active proposals (draft or sent)
    prisma.trip_proposals.count({
      where: { status: { in: ['draft', 'sent'] } },
    }),

    // Upcoming tours
    prisma.bookings.count({
      where: { tour_date: { gte: now } },
    }),

    // Revenue this month (successful payments)
    prisma.payments.aggregate({
      _sum: { amount: true },
      where: {
        status: 'succeeded',
        created_at: { gte: monthStart },
      },
    }),

    // Recent bookings
    prisma.bookings.findMany({
      select: {
        id: true,
        customer_name: true,
        status: true,
        created_at: true,
        tour_date: true,
      },
      orderBy: { created_at: 'desc' },
      take: 6,
    }),

    // Recent proposals
    prisma.trip_proposals.findMany({
      select: {
        id: true,
        customer_name: true,
        status: true,
        created_at: true,
        start_date: true,
      },
      orderBy: { created_at: 'desc' },
      take: 6,
    }),

    // Today's tasks for this user
    prisma.crm_tasks.findMany({
      where: {
        assigned_to: session.user.id,
        status: { in: ['pending', 'in_progress'] },
      },
      select: {
        id: true,
        title: true,
        due_date: true,
        priority: true,
        status: true,
      },
      orderBy: { due_date: 'asc' },
      take: 10,
    }),
  ])

  const monthlyRevenue = Number(revenueResult._sum.amount ?? 0)

  // Merge recent bookings + proposals into a single activity feed, sorted by date
  const recentActivity = [
    ...recentBookings.map((b) => ({
      id: b.id,
      name: b.customer_name,
      type: 'booking' as const,
      status: b.status,
      date: b.created_at,
      href: `/admin/bookings/${b.id}`,
    })),
    ...recentProposals.map((p) => ({
      id: p.id,
      name: p.customer_name,
      type: 'proposal' as const,
      status: p.status ?? 'draft',
      date: p.created_at ?? new Date(),
      href: `/admin/trip-proposals/${p.id}`,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  const stats = [
    {
      label: 'Total Bookings',
      value: totalBookings.toLocaleString(),
      href: '/admin/bookings',
      iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
    {
      label: 'Active Proposals',
      value: activeProposals.toLocaleString(),
      href: '/admin/trip-proposals',
      iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    },
    {
      label: 'Upcoming Tours',
      value: upcomingTours.toLocaleString(),
      href: '/admin/calendar',
      iconPath: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    },
    {
      label: 'Revenue This Month',
      value: formatCurrency(monthlyRevenue),
      href: '/admin/invoices',
      iconPath: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="block bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-slate-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d={stat.iconPath}
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </Link>
        ))}
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentActivity.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-slate-600">No recent activity yet.</p>
              </div>
            ) : (
              recentActivity.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {item.type === 'booking' ? 'Booking' : 'Proposal'} &middot; {formatDate(item.date)}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Today&apos;s Tasks</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {todaysTasks.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-5 h-5 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-900">All caught up!</p>
                <p className="text-xs text-slate-600 mt-1">No open tasks assigned to you.</p>
              </div>
            ) : (
              todaysTasks.map((task) => {
                const isOverdue = new Date(task.due_date) < now
                return (
                  <Link
                    key={task.id}
                    href={`/admin/crm/tasks`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {task.title}
                      </p>
                      <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                        Due {formatDate(task.due_date)}
                        {isOverdue && ' (overdue)'}
                      </p>
                    </div>
                    {task.priority === 'high' && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        High
                      </span>
                    )}
                    {task.priority === 'urgent' && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-200 text-red-800">
                        Urgent
                      </span>
                    )}
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
