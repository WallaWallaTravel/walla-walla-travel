/**
 * Supabase Database Types
 *
 * These types can be generated from your Supabase schema using:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts
 *
 * For now, this is a minimal type definition for the unified schema.
 */

export interface Database {
  public: {
    Tables: {
      // Operators (Motor Carriers)
      operators: {
        Row: {
          id: string;
          usdot_number: string;
          mc_number: string | null;
          legal_name: string;
          dba_name: string | null;
          carrier_type: string;
          operation_scope: string;
          operation_classification: string;
          primary_email: string | null;
          primary_phone: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          insurance_provider: string | null;
          insurance_policy_number: string | null;
          insurance_expiration: string | null;
          insurance_coverage_amount: number | null;
          utc_permit_number: string | null;
          utc_permit_expiry: string | null;
          overall_compliance_score: number;
          driver_compliance_score: number;
          vehicle_compliance_score: number;
          last_compliance_check: string | null;
          walla_walla_service_entity_id: number | null;
          walla_walla_tenant_id: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['operators']['Row'],
          'id' | 'created_at' | 'updated_at' | 'overall_compliance_score' | 'driver_compliance_score' | 'vehicle_compliance_score'
        >;
        Update: Partial<Database['public']['Tables']['operators']['Insert']>;
      };

      // User Profiles (linked to Supabase Auth)
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          operator_id: string | null;
          wwt_role: string | null;
          ad_role: string | null;
          walla_walla_user_id: number | null;
          is_active: boolean;
          email_verified: boolean;
          preferences: Record<string, unknown>;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['profiles']['Row'],
          'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };

      // Compliance Requirements (reference data)
      compliance_requirements: {
        Row: {
          id: string;
          requirement_code: string;
          requirement_name: string;
          description: string | null;
          regulation_reference: string | null;
          regulation_authority: string | null;
          applies_to: 'driver' | 'vehicle' | 'operator';
          category: string | null;
          is_recurring: boolean;
          recurrence_interval: string | null;
          warning_days_before: number;
          critical_days_before: number;
          severity_if_missing: 'critical' | 'major' | 'minor';
          out_of_service_if_missing: boolean;
          validation_field: string | null;
          validation_type: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['compliance_requirements']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Database['public']['Tables']['compliance_requirements']['Insert']>;
      };

      // Compliance Status (per entity per requirement)
      compliance_status: {
        Row: {
          id: string;
          operator_id: string | null;
          entity_type: 'driver' | 'vehicle' | 'operator';
          entity_id: number;
          entity_uuid: string | null;
          requirement_id: string;
          status: 'compliant' | 'warning' | 'expired' | 'missing' | 'not_applicable';
          effective_date: string | null;
          expiration_date: string | null;
          last_completed_date: string | null;
          document_id: string | null;
          document_url: string | null;
          notes: string | null;
          warning_sent: boolean;
          warning_sent_at: string | null;
          critical_warning_sent: boolean;
          critical_warning_sent_at: string | null;
          days_until_expiry: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['compliance_status']['Row'],
          'id' | 'created_at' | 'updated_at' | 'days_until_expiry'
        >;
        Update: Partial<Database['public']['Tables']['compliance_status']['Insert']>;
      };

      // Compliance Audit Log
      compliance_audit_log: {
        Row: {
          id: string;
          operator_id: string | null;
          action_type: string;
          action_endpoint: string | null;
          driver_id: number | null;
          vehicle_id: number | null;
          booking_id: number | null;
          was_blocked: boolean;
          block_reason: string | null;
          violations: Record<string, unknown>[] | null;
          was_overridden: boolean;
          overridden_by: number | null;
          override_reason: string | null;
          tour_date: string | null;
          request_ip: string | null;
          user_agent: string | null;
          triggered_by: number | null;
          triggered_at: string;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['compliance_audit_log']['Row'],
          'id' | 'created_at' | 'triggered_at'
        >;
        Update: Partial<Database['public']['Tables']['compliance_audit_log']['Insert']>;
      };

      // Sync Log
      sync_log: {
        Row: {
          id: string;
          source_system: string;
          target_system: string;
          entity_type: string;
          source_id: string;
          target_id: string | null;
          action: 'create' | 'update' | 'delete';
          payload: Record<string, unknown> | null;
          status: 'pending' | 'synced' | 'failed' | 'skipped';
          error_message: string | null;
          created_at: string;
          synced_at: string | null;
          retry_count: number;
          sync_hash: string | null;
        };
        Insert: Omit<
          Database['public']['Tables']['sync_log']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<Database['public']['Tables']['sync_log']['Insert']>;
      };
    };

    Views: Record<string, never>;

    Functions: {
      check_driver_compliance_status: {
        Args: { p_driver_id: number };
        Returns: {
          is_compliant: boolean;
          can_be_assigned: boolean;
          violations: Record<string, unknown>[];
          warnings: Record<string, unknown>[];
        }[];
      };
      check_vehicle_compliance_status: {
        Args: { p_vehicle_id: number };
        Returns: {
          is_compliant: boolean;
          can_be_dispatched: boolean;
          violations: Record<string, unknown>[];
          warnings: Record<string, unknown>[];
        }[];
      };
    };

    Enums: Record<string, never>;
  };
}

// Convenience type aliases
export type Operator = Database['public']['Tables']['operators']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ComplianceRequirement = Database['public']['Tables']['compliance_requirements']['Row'];
export type ComplianceStatus = Database['public']['Tables']['compliance_status']['Row'];
export type ComplianceAuditLog = Database['public']['Tables']['compliance_audit_log']['Row'];
export type SyncLog = Database['public']['Tables']['sync_log']['Row'];
