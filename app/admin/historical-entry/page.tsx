/**
 * Historical Data Entry Dashboard
 *
 * Main page for entering historical compliance data from paper records.
 * Displays import statistics and provides access to inspection/time card entry forms.
 */

import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

interface Stats {
  totalInspections: number;
  historicalInspections: number;
  totalTimeCards: number;
  historicalTimeCards: number;
  bookingsWithGaps: number;
  complianceScore: number;
}

async function getStats(): Promise<Stats> {
  try {
    const result = await query<{
      total_inspections: number;
      historical_inspections: number;
      total_time_cards: number;
      historical_time_cards: number;
      bookings_with_gaps: number;
    }>(`
      SELECT
        (SELECT COUNT(*)::int FROM inspections) as total_inspections,
        (SELECT COUNT(*)::int FROM inspections WHERE is_historical_entry = true) as historical_inspections,
        (SELECT COUNT(*)::int FROM time_cards) as total_time_cards,
        (SELECT COUNT(*)::int FROM time_cards WHERE is_historical_entry = true) as historical_time_cards,
        (
          SELECT COUNT(*)::int
          FROM bookings b
          WHERE b.status = 'completed'
            AND b.driver_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM inspections i
              WHERE i.driver_id = b.driver_id
                AND DATE(i.created_at) = b.tour_date
            )
        ) as bookings_with_gaps
    `);

    const stats = result.rows[0];
    const totalBookings = await query<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM bookings WHERE status = 'completed' AND driver_id IS NOT NULL`
    );

    const bookingsWithDocs = totalBookings.rows[0].count - stats.bookings_with_gaps;
    const complianceScore =
      totalBookings.rows[0].count > 0
        ? Math.round((bookingsWithDocs / totalBookings.rows[0].count) * 100)
        : 100;

    return {
      totalInspections: stats.total_inspections || 0,
      historicalInspections: stats.historical_inspections || 0,
      totalTimeCards: stats.total_time_cards || 0,
      historicalTimeCards: stats.historical_time_cards || 0,
      bookingsWithGaps: stats.bookings_with_gaps || 0,
      complianceScore,
    };
  } catch (error) {
    logger.error('[HistoricalEntry] Error fetching stats', { error });
    return {
      totalInspections: 0,
      historicalInspections: 0,
      totalTimeCards: 0,
      historicalTimeCards: 0,
      bookingsWithGaps: 0,
      complianceScore: 0,
    };
  }
}

interface RecentEntry {
  id: number;
  type: 'inspection' | 'time_card';
  original_date: string;
  driver_name: string;
  source: string;
  entered_at: string;
}

async function getRecentEntries(): Promise<RecentEntry[]> {
  try {
    const result = await query<RecentEntry>(`
      (
        SELECT
          i.id,
          'inspection'::text as type,
          i.original_document_date::text as original_date,
          u.name as driver_name,
          i.historical_source as source,
          i.entry_date::text as entered_at
        FROM inspections i
        LEFT JOIN users u ON i.driver_id = u.id
        WHERE i.is_historical_entry = true
        ORDER BY i.entry_date DESC
        LIMIT 5
      )
      UNION ALL
      (
        SELECT
          tc.id,
          'time_card'::text as type,
          tc.original_document_date::text as original_date,
          u.name as driver_name,
          tc.historical_source as source,
          tc.entry_date::text as entered_at
        FROM time_cards tc
        LEFT JOIN users u ON tc.driver_id = u.id
        WHERE tc.is_historical_entry = true
        ORDER BY tc.entry_date DESC
        LIMIT 5
      )
      ORDER BY entered_at DESC
      LIMIT 10
    `);
    return result.rows;
  } catch (error) {
    logger.error('[HistoricalEntry] Error fetching recent entries', { error });
    return [];
  }
}

export default async function HistoricalEntryPage() {
  const session = await getSession();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  const stats = await getStats();
  const recentEntries = await getRecentEntries();

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Historical Data Entry</h1>
        <p className="text-gray-600 mt-2">
          Digitize paper inspection forms and time records for compliance history
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Compliance Score</p>
          <p
            className={`text-3xl font-bold mt-2 ${
              stats.complianceScore >= 90
                ? 'text-green-600'
                : stats.complianceScore >= 70
                  ? 'text-yellow-600'
                  : 'text-red-600'
            }`}
          >
            {stats.complianceScore}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Bookings with documentation</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Total Inspections</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalInspections}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.historicalInspections} historical entries
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Total Time Cards</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalTimeCards}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.historicalTimeCards} historical entries
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600">Documentation Gaps</p>
          <p
            className={`text-3xl font-bold mt-2 ${
              stats.bookingsWithGaps === 0 ? 'text-green-600' : 'text-amber-600'
            }`}
          >
            {stats.bookingsWithGaps}
          </p>
          <p className="text-xs text-gray-500 mt-1">Bookings missing inspections</p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Inspection Entry Card */}
        <Link
          href="/admin/historical-entry/inspections"
          className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                Enter Inspection Record
              </h3>
              <p className="text-gray-600 mt-1">
                Digitize paper pre-trip/post-trip inspection forms and DVIRs
              </p>
              <div className="mt-4 flex items-center text-blue-600 font-medium">
                <span>Add inspection</span>
                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </Link>

        {/* Time Card Entry Card */}
        <Link
          href="/admin/historical-entry/time-cards"
          className="bg-white rounded-lg border border-gray-200 p-6 hover:border-green-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600">
                Enter Time Card Record
              </h3>
              <p className="text-gray-600 mt-1">
                Digitize paper time sheets and driver work records
              </p>
              <div className="mt-4 flex items-center text-green-600 font-medium">
                <span>Add time card</span>
                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Entries */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Recent Historical Entries</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Original Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entered
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No historical entries yet. Use the forms above to start digitizing paper records.
                  </td>
                </tr>
              ) : (
                recentEntries.map((entry) => (
                  <tr key={`${entry.type}-${entry.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          entry.type === 'inspection'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {entry.type === 'inspection' ? 'Inspection' : 'Time Card'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.original_date
                        ? new Date(entry.original_date).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {entry.driver_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {entry.source || 'paper_form'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {entry.entered_at
                        ? new Date(entry.entered_at).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-amber-800">Tips for Historical Data Entry</h3>
        <ul className="mt-3 text-amber-700 space-y-2">
          <li className="flex items-start">
            <svg
              className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Use the date on the original paper document, not today&apos;s date</span>
          </li>
          <li className="flex items-start">
            <svg
              className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Scan and upload the original paper form as a reference</span>
          </li>
          <li className="flex items-start">
            <svg
              className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Add notes for any illegible or uncertain fields</span>
          </li>
          <li className="flex items-start">
            <svg
              className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Work chronologically from oldest to newest for easier cross-referencing</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
