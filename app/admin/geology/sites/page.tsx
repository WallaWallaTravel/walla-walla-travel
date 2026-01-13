/**
 * Geology Sites List Page
 *
 * View and manage all geological sites/locations.
 */

import { getSession } from '@/lib/auth/session';
import { canAccessGeology } from '@/lib/auth/roles';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface Site {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  site_type: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  is_public_access: boolean;
  requires_appointment: boolean;
  is_published: boolean;
  created_at: string;
}

// ============================================================================
// Data Fetching
// ============================================================================

async function getSites(): Promise<Site[]> {
  try {
    const result = await query<Site>(`
      SELECT id, name, slug, description, site_type, latitude, longitude,
             address, is_public_access, requires_appointment, is_published, created_at
      FROM geology_sites
      ORDER BY name ASC
    `);
    return result.rows;
  } catch {
    return [];
  }
}

// ============================================================================
// Components
// ============================================================================

function SiteTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;

  const typeLabels: Record<string, { label: string; color: string }> = {
    viewpoint: { label: 'Viewpoint', color: 'bg-blue-100 text-blue-800' },
    formation: { label: 'Formation', color: 'bg-purple-100 text-purple-800' },
    vineyard_example: { label: 'Vineyard', color: 'bg-green-100 text-green-800' },
    educational_marker: { label: 'Marker', color: 'bg-amber-100 text-amber-800' },
  };

  const { label, color } = typeLabels[type] || { label: type, color: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

// ============================================================================
// Page Component
// ============================================================================

export default async function SitesListPage() {
  const session = await getSession();

  if (!session || !canAccessGeology(session.user.role)) {
    redirect('/login');
  }

  const sites = await getSites();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/geology" className="text-gray-500 hover:text-gray-700">
              Geology
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Physical locations to visit and explore geology
          </p>
        </div>
        <Link
          href="/admin/geology/sites/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-[#722F37] hover:bg-[#5a252c]"
        >
          + New Site
        </Link>
      </div>

      {/* Sites Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {sites.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-4xl mb-3">📍</p>
            <p className="text-lg font-medium text-gray-900">No sites yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Add geological sites that visitors can explore.
            </p>
            <Link
              href="/admin/geology/sites/new"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-[#722F37] hover:bg-[#5a252c]"
            >
              Create First Site
            </Link>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Access
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sites.map((site) => (
                <tr key={site.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{site.name}</p>
                      {site.description && (
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {site.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <SiteTypeBadge type={site.site_type} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {site.is_public_access ? (
                        <span className="text-xs text-green-600">Public</span>
                      ) : (
                        <span className="text-xs text-gray-500">Private</span>
                      )}
                      {site.requires_appointment && (
                        <span className="text-xs text-amber-600">Appt Required</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {site.is_published ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {site.latitude && site.longitude ? (
                      <span className="text-green-600">Has coordinates</span>
                    ) : site.address ? (
                      <span className="truncate max-w-[150px] block">{site.address}</span>
                    ) : (
                      <span className="text-gray-400">No location</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/geology/sites/${site.id}`}
                      className="text-[#722F37] hover:text-[#5a252c] text-sm font-medium"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
