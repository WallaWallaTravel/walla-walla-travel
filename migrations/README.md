# Database Migrations

## Current State

As of December 25, 2025, the database has been consolidated to a known-good state.

### Migration Tracking

All migrations are now tracked in the `_migrations` table:

```sql
SELECT * FROM _migrations ORDER BY applied_at DESC;
```

### Migration Files

| File | Description | Status |
|------|-------------|--------|
| `040-master-consolidation.sql` | Master consolidation of all tables | ✅ Applied |

### Archived Migrations

The `archive/` folder contains 75 historical migration files that were applied incrementally during development. These are preserved for reference but should not be run again.

## Creating New Migrations

1. **Naming**: Use sequential numbering: `041-description.sql`, `042-description.sql`, etc.

2. **Template**:
```sql
-- Migration: 041-your-description
-- Created: YYYY-MM-DD
-- Author: [name]

BEGIN;

-- Record this migration
INSERT INTO _migrations (migration_name, notes)
VALUES ('041-your-description', 'Brief description of what this does')
ON CONFLICT (migration_name) DO NOTHING;

-- Your SQL here
-- Use IF NOT EXISTS for tables
-- Use DO $$ blocks for conditional column additions

COMMIT;
```

3. **Testing**: Always test on a development database first.

4. **Idempotency**: Migrations should be safe to run multiple times (use `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, etc.)

## Key Tables Added in Master Consolidation

### Monitoring
- `error_logs` - Application error tracking
- `system_health_checks` - Health check results
- `performance_metrics` - Performance tracking
- `financial_audit_log` - Immutable financial audit trail

### Shared Tours
- `shared_tours` - Scheduled public tours
- `shared_tours_availability` - Tour availability windows
- `shared_tours_tickets` - Individual bookings on shared tours

### Multi-Entity Billing
- `service_entities` - NW Touring, WWT, etc.
- `service_types` - Types of services offered
- `booking_sources` - Where bookings come from
- `commission_rates` - Commission rate overrides
- `booking_line_items` - Multi-entity line items
- `commission_ledger` - Commission tracking
- `vehicle_incidents` - Damage/cleaning incidents
- `incident_fee_schedule` - Standard fee schedule

### Business Portal
- `business_portal` - Partner business access management

## Checking Migration Status

```sql
-- See what's been applied
SELECT migration_name, applied_at, notes
FROM _migrations
ORDER BY applied_at DESC;

-- Check if a specific migration was run
SELECT EXISTS(
  SELECT 1 FROM _migrations
  WHERE migration_name = '040-master-consolidation'
);
```

## Rolling Back

For critical issues, rollback scripts should be created BEFORE applying migrations. The master consolidation uses `DROP ... IF EXISTS` patterns to make re-running safe.

## Database Connection

```
Host: cduf3or326qj7m.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com
Database: dcb898ojc53b18
User: u5eq260aalmaff
```

Connection string is in `.env.local` as `DATABASE_URL`.
