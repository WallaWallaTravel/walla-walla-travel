import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { ComplianceStatus, ComplianceAuditLog } from '@/lib/database.types';

interface ComplianceStats {
  total_requirements: number;
  compliant_count: number;
  warning_count: number;
  expired_count: number;
  missing_count: number;
}

export default function Dashboard() {
  const { operator } = useAuthStore();

  // Fetch compliance stats
  const { data: stats, isLoading } = useQuery<ComplianceStats>({
    queryKey: ['compliance-stats', operator?.id],
    queryFn: async () => {
      if (!operator?.id) throw new Error('No operator');

      const { data, error } = await supabase
        .from('compliance_status')
        .select('status')
        .eq('operator_id', operator.id);

      if (error) throw error;

      const typedData = data as Pick<ComplianceStatus, 'status'>[] | null;

      const counts = {
        total_requirements: typedData?.length || 0,
        compliant_count: typedData?.filter((d) => d.status === 'compliant').length || 0,
        warning_count: typedData?.filter((d) => d.status === 'warning').length || 0,
        expired_count: typedData?.filter((d) => d.status === 'expired').length || 0,
        missing_count: typedData?.filter((d) => d.status === 'missing').length || 0,
      };

      return counts;
    },
    enabled: !!operator?.id,
  });

  // Fetch recent audit events
  const { data: auditEvents } = useQuery<ComplianceAuditLog[]>({
    queryKey: ['audit-events', operator?.id],
    queryFn: async () => {
      if (!operator?.id) throw new Error('No operator');

      const { data, error } = await supabase
        .from('compliance_audit_log')
        .select('*')
        .eq('operator_id', operator.id)
        .order('triggered_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as ComplianceAuditLog[];
    },
    enabled: !!operator?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const complianceScore = stats
    ? Math.round((stats.compliant_count / Math.max(stats.total_requirements, 1)) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h2>
        <p className="text-gray-600 mt-1">
          Overview of your FMCSA/DOT compliance status
        </p>
      </div>

      {/* Compliance Score Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Overall Compliance Score
            </h3>
            <p className="text-sm text-gray-500">Based on tracked requirements</p>
          </div>
          <div
            className={`text-5xl font-bold ${
              complianceScore >= 90
                ? 'text-green-600'
                : complianceScore >= 70
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}
          >
            {complianceScore}%
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard
          label="Compliant"
          count={stats?.compliant_count || 0}
          color="green"
          icon="✅"
        />
        <StatusCard
          label="Warnings"
          count={stats?.warning_count || 0}
          color="yellow"
          icon="⚠️"
        />
        <StatusCard
          label="Expired"
          count={stats?.expired_count || 0}
          color="red"
          icon="❌"
        />
        <StatusCard
          label="Missing"
          count={stats?.missing_count || 0}
          color="gray"
          icon="❓"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Compliance Events
          </h3>
        </div>
        <div className="divide-y">
          {auditEvents && auditEvents.length > 0 ? (
            auditEvents.map((event) => (
              <div key={event.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {event.action_type}
                      {event.was_blocked && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Blocked
                        </span>
                      )}
                      {event.was_overridden && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Overridden
                        </span>
                      )}
                    </p>
                    {event.block_reason && (
                      <p className="text-sm text-gray-500 mt-1">
                        {event.block_reason}
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-gray-400">
                    {new Date(event.triggered_at).toLocaleString()}
                  </time>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              No recent compliance events
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  label,
  count,
  color,
  icon,
}: {
  label: string;
  count: number;
  color: 'green' | 'yellow' | 'red' | 'gray';
  icon: string;
}) {
  const bgColors = {
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
    gray: 'bg-gray-50 border-gray-200',
  };

  const textColors = {
    green: 'text-green-700',
    yellow: 'text-yellow-700',
    red: 'text-red-700',
    gray: 'text-gray-700',
  };

  return (
    <div className={`rounded-lg border p-4 ${bgColors[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className={`text-2xl font-bold ${textColors[color]}`}>{count}</span>
      </div>
      <p className={`mt-2 text-sm font-medium ${textColors[color]}`}>{label}</p>
    </div>
  );
}
