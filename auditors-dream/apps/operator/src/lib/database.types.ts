/**
 * Supabase Database Types
 *
 * These types represent the database schema for Auditor's Dream.
 * Note: Using 'any' in some places for Supabase queries that return
 * dynamic data structures. In production, generate types from the schema.
 */

export interface Database {
  public: {
    Tables: {
      operators: {
        Row: {
          id: string;
          name: string;
          usdot_number: string | null;
          mc_number: string | null;
          carrier_type: string;
          carrier_operation: string[];
          operating_scope: string;
          physical_address: string | null;
          mailing_address: string | null;
          phone: string | null;
          email: string | null;
          is_active: boolean;
          walla_walla_service_entity_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['operators']['Row']> & {
          name: string;
        };
        Update: Partial<Database['public']['Tables']['operators']['Row']>;
      };
      profiles: {
        Row: {
          id: string;
          operator_id: string | null;
          email: string;
          full_name: string | null;
          role: 'admin' | 'manager' | 'staff' | 'driver';
          walla_walla_user_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          id: string;
          email: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      compliance_requirements: {
        Row: {
          id: string;
          requirement_code: string;
          requirement_name: string;
          description: string | null;
          regulation_reference: string | null;
          regulation_authority: string;
          applies_to: 'driver' | 'vehicle' | 'operator';
          category: string | null;
          is_recurring: boolean;
          recurrence_interval: string | null;
          warning_days_before: number;
          critical_days_before: number;
          severity_if_missing: 'critical' | 'major' | 'minor' | 'warning';
          out_of_service_if_missing: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['compliance_requirements']['Row']> & {
          requirement_code: string;
          requirement_name: string;
        };
        Update: Partial<Database['public']['Tables']['compliance_requirements']['Row']>;
      };
      compliance_status: {
        Row: {
          id: string;
          operator_id: string;
          entity_type: 'driver' | 'vehicle' | 'operator';
          entity_id: number;
          requirement_id: string;
          status: 'compliant' | 'warning' | 'expired' | 'missing' | 'not_applicable';
          effective_date: string | null;
          expiration_date: string | null;
          last_completed_date: string | null;
          days_until_expiry: number | null;
          warning_sent: boolean;
          warning_sent_at: string | null;
          notes: string | null;
          document_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['compliance_status']['Row']> & {
          operator_id: string;
          entity_type: 'driver' | 'vehicle' | 'operator';
          entity_id: number;
          requirement_id: string;
        };
        Update: Partial<Database['public']['Tables']['compliance_status']['Row']>;
      };
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
          violations: unknown | null;
          was_overridden: boolean;
          overridden_by: number | null;
          override_reason: string | null;
          tour_date: string | null;
          request_ip: string | null;
          user_agent: string | null;
          triggered_by: number | null;
          triggered_at: string;
        };
        Insert: Partial<Database['public']['Tables']['compliance_audit_log']['Row']> & {
          action_type: string;
        };
        Update: Partial<Database['public']['Tables']['compliance_audit_log']['Row']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Helper types for common queries
export type Operator = Database['public']['Tables']['operators']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ComplianceRequirement = Database['public']['Tables']['compliance_requirements']['Row'];
export type ComplianceStatus = Database['public']['Tables']['compliance_status']['Row'];
export type ComplianceAuditLog = Database['public']['Tables']['compliance_audit_log']['Row'];
