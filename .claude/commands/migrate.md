# Database Migration Helper

Create and apply database migrations safely.

## Instructions

When creating migrations:
1. Generate a numbered migration file (e.g., 041-feature-name.sql)
2. Include both UP and DOWN sections where possible
3. Add appropriate indexes for query performance
4. Include comments explaining the purpose
5. Test the migration locally before applying to production

## Migration Template

```sql
-- Migration: [NUMBER]-[feature-name].sql
-- Purpose: [Brief description]
-- Author: Claude Code
-- Date: [Current date]

-- ============================================
-- UP MIGRATION
-- ============================================

-- [SQL statements here]

-- ============================================
-- DOWN MIGRATION (if reversible)
-- ============================================

-- [Rollback SQL here]
```

## Current Migration Sequence

Check /Users/temp/walla-walla-final/migrations/ for the latest migration number.

## Database Connection

Use the DATABASE_URL from .env.local:
```
postgres://u5eq260aalmaff:pe7531a627c8b4fcccfe9d643266e3f1c1e7a8446926e469883569321509eb8a3@cduf3or326qj7m.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/dcb898ojc53b18
```

## Safety Checks

Before applying:
1. Backup critical tables if modifying existing data
2. Test on local/staging first if available
3. Apply during low-traffic periods for production
