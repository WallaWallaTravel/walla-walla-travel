import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import clsx from 'clsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/drivers', label: 'Drivers', icon: '👤' },
  { to: '/vehicles', label: 'Vehicles', icon: '🚐' },
  { to: '/requirements', label: 'Requirements', icon: '📋' },
  { to: '/self-audit', label: 'Self-Audit', icon: '✅' },
];

export default function Layout() {
  const { operator, profile, signOut } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-blue-600">
                Auditor's Dream
              </h1>
              {operator && (
                <span className="text-sm text-gray-500">
                  {operator.name}
                  {operator.usdot_number && (
                    <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
                      USDOT {operator.usdot_number}
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              {profile && (
                <span className="text-sm text-gray-600">
                  {profile.full_name || profile.email}
                </span>
              )}
              <button
                onClick={signOut}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
