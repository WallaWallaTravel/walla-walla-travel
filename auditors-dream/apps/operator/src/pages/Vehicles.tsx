import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { ComplianceStatus } from '@/lib/database.types';

interface Vehicle {
  id: number;
  vehicle_number: string;
  make: string;
  model: string;
  year: number;
  vin: string | null;
  license_plate: string | null;
  registration_expiry: string | null;
  insurance_expiry: string | null;
  dot_inspection_date: string | null;
  is_active: boolean;
}

export default function Vehicles() {
  const { operator } = useAuthStore();

  // For now, return placeholder data - will query unified vehicles table when migrated
  const { data: vehicles, isLoading, error } = useQuery<Vehicle[]>({
    queryKey: ['vehicles', operator?.id],
    queryFn: async () => {
      if (!operator?.id) throw new Error('No operator');

      // Placeholder data to demonstrate UI
      return [
        {
          id: 1,
          vehicle_number: 'VAN-01',
          make: 'Mercedes-Benz',
          model: 'Sprinter 2500',
          year: 2022,
          vin: '1FDWE3FL1JDC12345',
          license_plate: 'ABC1234',
          registration_expiry: '2025-08-15',
          insurance_expiry: '2025-04-30',
          dot_inspection_date: '2024-09-01',
          is_active: true,
        },
      ];
    },
    enabled: !!operator?.id,
  });

  // Fetch compliance status for vehicles
  const { data: complianceStatus } = useQuery({
    queryKey: ['vehicle-compliance', operator?.id],
    queryFn: async () => {
      if (!operator?.id) throw new Error('No operator');

      const { data, error } = await supabase
        .from('compliance_status')
        .select('*')
        .eq('operator_id', operator.id)
        .eq('entity_type', 'vehicle');

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
        Failed to load vehicles: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vehicles</h2>
          <p className="text-gray-600 mt-1">
            Manage fleet compliance and maintenance records
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Add Vehicle
        </button>
      </div>

      {/* Vehicle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles?.map((vehicle) => {
          const vehicleCompliance = complianceStatus?.filter(
            (cs) => cs.entity_id === vehicle.id
          );
          const hasIssues = vehicleCompliance?.some(
            (cs) => cs.status === 'expired' || cs.status === 'missing'
          );
          const hasWarnings = vehicleCompliance?.some(
            (cs) => cs.status === 'warning'
          );

          return (
            <div
              key={vehicle.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {vehicle.vehicle_number}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      hasIssues
                        ? 'bg-red-100 text-red-800'
                        : hasWarnings
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {hasIssues ? 'Issues' : hasWarnings ? 'Warnings' : 'OK'}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <ComplianceItem
                    label="Registration"
                    date={vehicle.registration_expiry}
                  />
                  <ComplianceItem
                    label="Insurance"
                    date={vehicle.insurance_expiry}
                  />
                  <ComplianceItem
                    label="DOT Inspection"
                    date={vehicle.dot_inspection_date}
                    isInspection
                  />
                </div>

                <div className="mt-4 pt-4 border-t">
                  <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium">
                    View Full Record
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(!vehicles || vehicles.length === 0) && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">
            No vehicles found. Add your first vehicle to get started.
          </p>
        </div>
      )}
    </div>
  );
}

function ComplianceItem({
  label,
  date,
  isInspection = false,
}: {
  label: string;
  date: string | null;
  isInspection?: boolean;
}) {
  if (!date) {
    return (
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-400">Not recorded</span>
      </div>
    );
  }

  const dateObj = new Date(date);
  const today = new Date();
  const daysUntil = Math.ceil((dateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // For inspections, check if it's more than 12 months old
  const isExpired = isInspection ? daysUntil < -365 : daysUntil < 0;
  const isWarning = isInspection ? daysUntil < -300 : daysUntil <= 30;

  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span
        className={
          isExpired
            ? 'text-red-600 font-medium'
            : isWarning
            ? 'text-yellow-600'
            : 'text-gray-900'
        }
      >
        {dateObj.toLocaleDateString()}
        {isExpired && ' (Expired)'}
      </span>
    </div>
  );
}
