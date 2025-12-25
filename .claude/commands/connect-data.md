# Connect to Real Data Command

Replace mock data in Auditor's Dream Operator Portal with live Supabase queries.

## Prerequisites
- Supabase setup complete (`/supabase-setup`)
- Migration run successfully
- Test user created and linked

## Files to Update

### 1. Auth Store - Replace Mock Operator

**File:** `auditors-dream/apps/operator/src/store/auth.ts`

Current mock data needs to fetch real operator from Supabase:

```typescript
// After login, fetch operator data
const fetchOperatorData = async (userId: string) => {
  // Get profile with operator_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, operators(*)')
    .eq('id', userId)
    .single();
    
  if (profileError) throw profileError;
  
  return {
    profile,
    operator: profile.operators,
  };
};
```

### 2. Dashboard - Real Compliance Stats

**File:** `auditors-dream/apps/operator/src/pages/Dashboard.tsx`

Replace mock stats with:
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useDashboardStats(operatorId: string) {
  return useQuery({
    queryKey: ['dashboard-stats', operatorId],
    queryFn: async () => {
      // Get driver count
      const { count: driverCount } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('operator_id', operatorId)
        .eq('is_active', true);
      
      // Get vehicle count
      const { count: vehicleCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('operator_id', operatorId)
        .eq('is_active', true);
      
      // Get compliance score
      const { data: compliance } = await supabase
        .from('operator_compliance_status')
        .select('overall_score')
        .eq('operator_id', operatorId)
        .single();
      
      return {
        driverCount: driverCount || 0,
        vehicleCount: vehicleCount || 0,
        complianceScore: compliance?.overall_score || 0,
      };
    },
  });
}
```

### 3. Compliance Page - Real Requirements

**File:** `auditors-dream/apps/operator/src/pages/Compliance.tsx`

```typescript
export function useRequirements(carrierType: string) {
  return useQuery({
    queryKey: ['requirements', carrierType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requirements')
        .select('*')
        .contains('carrier_types', [carrierType])
        .order('category', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
}
```

### 4. Driver Files Module

**File:** `auditors-dream/apps/operator/src/pages/modules/DriverFiles.tsx`

```typescript
export function useDrivers(operatorId: string) {
  return useQuery({
    queryKey: ['drivers', operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          *,
          driver_documents(*)
        `)
        .eq('operator_id', operatorId)
        .eq('is_active', true)
        .order('last_name', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
}
```

### 5. Vehicle Records Module

**File:** `auditors-dream/apps/operator/src/pages/modules/VehicleRecords.tsx`

```typescript
export function useVehicles(operatorId: string) {
  return useQuery({
    queryKey: ['vehicles', operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          vehicle_documents(*),
          driver_inspections(*)
        `)
        .eq('operator_id', operatorId)
        .eq('is_active', true)
        .order('unit_number', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
}
```

### 6. Self-Audit Module

**File:** `auditors-dream/apps/operator/src/pages/SelfAudit.tsx`

```typescript
// Create audit session
export async function createAuditSession(operatorId: string) {
  const { data, error } = await supabase
    .from('self_audit_sessions')
    .insert({
      operator_id: operatorId,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Save audit finding
export async function saveFinding(sessionId: string, finding: Finding) {
  const { data, error } = await supabase
    .from('self_audit_findings')
    .insert({
      session_id: sessionId,
      requirement_id: finding.requirementId,
      status: finding.status,
      notes: finding.notes,
      evidence_urls: finding.evidenceUrls,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

## Implementation Order

1. **Auth store** - Critical, blocks everything else
2. **Dashboard stats** - High visibility
3. **Driver list** - Core functionality
4. **Vehicle list** - Core functionality
5. **Requirements** - Already may be working
6. **Self-audit** - Advanced feature

## Verification

After each update:
```bash
cd auditors-dream/apps/operator
npm run dev
```

Test:
1. Login works
2. Data displays correctly
3. No console errors
4. Loading states work
5. Error handling works

## Progress Tracking

```markdown
## Data Connection Progress

- [ ] Auth store fetches real operator
- [ ] Dashboard shows real counts
- [ ] Driver list from database
- [ ] Vehicle list from database
- [ ] Requirements load correctly
- [ ] Self-audit saves to database
- [ ] Document upload works
```
