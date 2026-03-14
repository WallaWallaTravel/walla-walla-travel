---
name: audit-logging
description: Audit trail patterns for admin operations. Use when adding DELETE, approve/reject, cancel, assign, or bulk operations.
---

## When to Log
- ALL DELETE operations
- ALL approve/reject/cancel/assign operations
- ALL bulk actions

## How to Log
```typescript
auditService.logFromRequest(request, userId, 'resource_deleted', {
  entityType: 'booking',
  entityId: id,
  details: { reason }
});
```

## Action Types
`resource_deleted` · `resource_updated` · `resource_created` · `booking_status_changed` · `booking_assigned` · `booking_cancelled` · `business_approved` · `business_rejected` · `bulk_action`

## Rules
- Include entity type, entity ID, and action performed
- Fire-and-forget pattern (don't block the response)
- Log IP address from request headers
