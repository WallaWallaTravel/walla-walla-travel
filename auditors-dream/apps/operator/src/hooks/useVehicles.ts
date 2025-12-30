import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { ComplianceStatus } from '@/lib/database.types';

export interface Vehicle {
  id: number;
  vehicle_number: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  license_plate?: string;
  state?: string;
  registration_expiry?: string;
  insurance_expiry?: string;
  dot_inspection_date?: string;
  is_active: boolean;
  walla_walla_vehicle_id?: number;
  created_at: string;
  updated_at: string;
}

export interface VehicleWithCompliance extends Vehicle {
  compliance_status?: {
    id: string;
    status: string;
    requirement_code: string;
    expiration_date?: string;
  }[];
}

/**
 * Fetch all vehicles for the current operator
 */
export function useVehicles() {
  const { operator } = useAuthStore();

  return useQuery<VehicleWithCompliance[]>({
    queryKey: ['vehicles', operator?.id],
    queryFn: async () => {
      if (!operator?.id) throw new Error('No operator');

      // Query vehicles via compliance_status table
      const { data: complianceData, error } = await supabase
        .from('compliance_status')
        .select('*')
        .eq('operator_id', operator.id)
        .eq('entity_type', 'vehicle');

      if (error) throw error;

      const typedData = complianceData as ComplianceStatus[] | null;

      // Group by entity_id to get unique vehicles
      const vehicleIds = [...new Set(typedData?.map((c) => c.entity_id) || [])];

      // Return placeholder vehicle data with real compliance status
      return vehicleIds.map((id) => ({
        id,
        vehicle_number: `VAN-${String(id).padStart(2, '0')}`,
        make: 'Mercedes-Benz',
        model: 'Sprinter',
        year: 2022,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        compliance_status: typedData?.filter((c) => c.entity_id === id).map((c) => ({
          id: c.id,
          status: c.status,
          requirement_code: c.requirement_id,
          expiration_date: c.expiration_date || undefined,
        })),
      }));
    },
    enabled: !!operator?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch a single vehicle by ID
 */
export function useVehicle(vehicleId: number) {
  const { operator } = useAuthStore();

  return useQuery<VehicleWithCompliance>({
    queryKey: ['vehicle', vehicleId],
    queryFn: async () => {
      if (!operator?.id) throw new Error('No operator');

      const { data: complianceData, error } = await supabase
        .from('compliance_status')
        .select('*')
        .eq('operator_id', operator.id)
        .eq('entity_type', 'vehicle')
        .eq('entity_id', vehicleId);

      if (error) throw error;

      const typedData = complianceData as ComplianceStatus[] | null;

      return {
        id: vehicleId,
        vehicle_number: `VAN-${String(vehicleId).padStart(2, '0')}`,
        make: 'Mercedes-Benz',
        model: 'Sprinter',
        year: 2022,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        compliance_status: typedData?.map((c) => ({
          id: c.id,
          status: c.status,
          requirement_code: c.requirement_id,
          expiration_date: c.expiration_date || undefined,
        })),
      };
    },
    enabled: !!operator?.id && !!vehicleId,
  });
}

/**
 * Check vehicle compliance status
 */
export function useVehicleCompliance(vehicleId: number) {
  const { operator } = useAuthStore();

  return useQuery({
    queryKey: ['vehicle-compliance', vehicleId],
    queryFn: async () => {
      if (!operator?.id) throw new Error('No operator');

      // Query compliance status for this vehicle
      const { data, error } = await supabase
        .from('compliance_status')
        .select('*')
        .eq('operator_id', operator.id)
        .eq('entity_type', 'vehicle')
        .eq('entity_id', vehicleId);

      if (error) throw error;

      const typedData = data as ComplianceStatus[] | null;
      const criticalViolations = typedData?.filter((c) => c.status === 'expired' || c.status === 'missing') || [];
      const warnings = typedData?.filter((c) => c.status === 'warning') || [];

      return {
        is_compliant: criticalViolations.length === 0,
        critical_violations: criticalViolations.map((c) => c.requirement_id),
        warnings: warnings.map((c) => c.requirement_id),
        can_operate: criticalViolations.length === 0,
      };
    },
    enabled: !!operator?.id && !!vehicleId,
  });
}
