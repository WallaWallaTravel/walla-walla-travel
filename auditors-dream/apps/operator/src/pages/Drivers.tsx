import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { ComplianceStatus } from '@/lib/database.types';

interface Driver {
  id: number;
  name: string;
  email: string;
  license_number: string | null;
  license_expiry: string | null;
  medical_cert_expiry: string | null;
  hire_date: string | null;
  is_active: boolean;
}

export default function Drivers() {
  const { operator } = useAuthStore();

  // For now, we'll query from the WWT users table linked via operator
  // In production, this would query the unified drivers table
  const { data: drivers, isLoading, error } = useQuery<Driver[]>({
    queryKey: ['drivers', operator?.id],
    queryFn: async () => {
      if (!operator?.id) throw new Error('No operator');

      // This would query the unified drivers table once migrated
      // For now, return placeholder data to demonstrate the UI
      return [
        {
          id: 1,
          name: 'Sample Driver',
          email: 'driver@example.com',
          license_number: 'WA123456',
          license_expiry: '2025-06-15',
          medical_cert_expiry: '2025-03-20',
          hire_date: '2023-01-15',
          is_active: true,
        },
      ];
    },
    enabled: !!operator?.id,
  });

  // Fetch compliance status for drivers
  const { data: complianceStatus } = useQuery({
    queryKey: ['driver-compliance', operator?.id],
    queryFn: async () => {
      if (!operator?.id) throw new Error('No operator');

      const { data, error } = await supabase
        .from('compliance_status')
        .select('*')
        .eq('operator_id', operator.id)
        .eq('entity_type', 'driver');

      if (error) throw error;
      return data as ComplianceStatus[];
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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load drivers: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Drivers</h2>
          <p className="text-gray-600 mt-1">
            Manage driver qualification files and compliance
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Add Driver
        </button>
      </div>

      {/* Driver List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Driver
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                License
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Medical Cert
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Compliance
              </th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {drivers?.map((driver) => {
              const driverCompliance = complianceStatus?.filter(
                (cs) => cs.entity_id === driver.id
              );
              const hasIssues = driverCompliance?.some(
                (cs) => cs.status === 'expired' || cs.status === 'missing'
              );
              const hasWarnings = driverCompliance?.some(
                (cs) => cs.status === 'warning'
              );

              return (
                <tr key={driver.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-medium">
                          {driver.name.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {driver.name}
                        </div>
                        <div className="text-sm text-gray-500">{driver.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {driver.license_number || 'Not recorded'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Exp: {driver.license_expiry || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ExpiryBadge date={driver.medical_cert_expiry} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        driver.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {driver.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {hasIssues ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Issues Found
                      </span>
                    ) : hasWarnings ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Warnings
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Compliant
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">
                      View DQ File
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(!drivers || drivers.length === 0) && (
          <div className="px-6 py-12 text-center text-gray-500">
            No drivers found. Add your first driver to get started.
          </div>
        )}
      </div>
    </div>
  );
}

function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Not recorded
      </span>
    );
  }

  const expiry = new Date(date);
  const today = new Date();
  const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Expired {Math.abs(daysUntil)} days ago
      </span>
    );
  }

  if (daysUntil <= 30) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Expires in {daysUntil} days
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      Valid until {expiry.toLocaleDateString()}
    </span>
  );
}
