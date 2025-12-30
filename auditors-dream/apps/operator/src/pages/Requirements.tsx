import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ComplianceRequirement } from '@/lib/database.types';

export default function Requirements() {
  const { data: requirements, isLoading, error } = useQuery<ComplianceRequirement[]>({
    queryKey: ['requirements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_requirements')
        .select('*')
        .eq('is_active', true)
        .order('applies_to', { ascending: true })
        .order('requirement_name', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load requirements: {error.message}
      </div>
    );
  }

  // Group by entity type
  const driverRequirements = requirements?.filter((r) => r.applies_to === 'driver') || [];
  const vehicleRequirements = requirements?.filter((r) => r.applies_to === 'vehicle') || [];
  const operatorRequirements = requirements?.filter((r) => r.applies_to === 'operator') || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Compliance Requirements</h2>
        <p className="text-gray-600 mt-1">
          FMCSA and state regulatory requirements tracked by the system
        </p>
      </div>

      {/* Driver Requirements */}
      <RequirementSection
        title="Driver Requirements"
        icon="👤"
        requirements={driverRequirements}
      />

      {/* Vehicle Requirements */}
      <RequirementSection
        title="Vehicle Requirements"
        icon="🚐"
        requirements={vehicleRequirements}
      />

      {/* Operator Requirements */}
      <RequirementSection
        title="Operator Requirements"
        icon="🏢"
        requirements={operatorRequirements}
      />
    </div>
  );
}

function RequirementSection({
  title,
  icon,
  requirements,
}: {
  title: string;
  icon: string;
  requirements: ComplianceRequirement[];
}) {
  if (requirements.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-500">({requirements.length})</span>
      </div>
      <div className="divide-y">
        {requirements.map((req) => (
          <div key={req.id} className="px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900">{req.requirement_name}</h4>
                  <SeverityBadge severity={req.severity_if_missing} />
                  {req.out_of_service_if_missing && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      OOS if Missing
                    </span>
                  )}
                </div>
                {req.description && (
                  <p className="text-sm text-gray-600 mt-1">{req.description}</p>
                )}
                {req.regulation_reference && (
                  <p className="text-xs text-gray-400 mt-2">
                    {req.regulation_authority}: {req.regulation_reference}
                  </p>
                )}
              </div>
              <div className="ml-4 text-right text-sm text-gray-500">
                {req.is_recurring && (
                  <div>
                    Renews: {req.recurrence_interval}
                  </div>
                )}
                <div>
                  Warning: {req.warning_days_before} days before
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors = {
    critical: 'bg-red-100 text-red-800',
    major: 'bg-orange-100 text-orange-800',
    minor: 'bg-yellow-100 text-yellow-800',
    warning: 'bg-blue-100 text-blue-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {severity}
    </span>
  );
}
