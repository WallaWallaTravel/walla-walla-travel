import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import type { ComplianceStatus } from '@/lib/database.types';

export interface Driver {
  id: number;
  name: string;
  email: string;
  phone?: string;
  license_number?: string;
  license_state?: string;
  license_class?: string;
  license_expiry?: string;
  medical_cert_expiry?: string;
  hire_date?: string;
  termination_date?: string;
  is_active: boolean;
  walla_walla_user_id?: number;
  created_at: string;
  updated_at: string;
}

export interface DriverWithCompliance extends Driver {
  compliance_status?: {
    id: string;
    status: string;
    requirement_code: string;
    expiration_date?: string;
  }[];
}

/**
 * Fetch all drivers for the current operator
 */
export function useDrivers() {
  const { operator } = useAuthStore();

  return useQuery<DriverWithCompliance[]>({
    queryKey: ['drivers', operator?.id],
    queryFn: async () => {
      if (!operator?.id) throw new Error('No operator');

      // Query drivers with their compliance status
      const { data: complianceData, error } = await supabase
        .from('compliance_status')
        .select('*')
        .eq('operator_id', operator.id)
        .eq('entity_type', 'driver');

      if (error) throw error;

      const typedData = complianceData as ComplianceStatus[] | null;

      // Group by entity_id to get unique drivers
      const driverIds = [...new Set(typedData?.map((c) => c.entity_id) || [])];

      // Return placeholder driver data with real compliance status
      return driverIds.map((id) => ({
        id,
        name: `Driver ${id}`,
        email: `driver${id}@example.com`,
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
 * Fetch a single driver by ID
 */
export function useDriver(driverId: number) {
  const { operator } = useAuthStore();

  return useQuery<DriverWithCompliance>({
    queryKey: ['driver', driverId],
    queryFn: async () => {
      if (!operator?.id) throw new Error('No operator');

      const { data: complianceData, error } = await supabase
        .from('compliance_status')
        .select('*')
        .eq('operator_id', operator.id)
        .eq('entity_type', 'driver')
        .eq('entity_id', driverId);

      if (error) throw error;

      const typedData = complianceData as ComplianceStatus[] | null;

      return {
        id: driverId,
        name: `Driver ${driverId}`,
        email: `driver${driverId}@example.com`,
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
    enabled: !!operator?.id && !!driverId,
  });
}

/**
 * Check driver compliance status
 */
export function useDriverCompliance(driverId: number) {
  const { operator } = useAuthStore();

  return useQuery({
    queryKey: ['driver-compliance', driverId],
    queryFn: async () => {
      if (!operator?.id) throw new Error('No operator');

      // Query compliance status for this driver
      const { data, error } = await supabase
        .from('compliance_status')
        .select('*')
        .eq('operator_id', operator.id)
        .eq('entity_type', 'driver')
        .eq('entity_id', driverId);

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
    enabled: !!operator?.id && !!driverId,
  });
}
