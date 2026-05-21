# TypeScript Fixes

## Fix 1: app/admin/page.tsx - missing nodeHealth assignment

After line 115 (`reconciliationSummary = summary;`), add:
```typescript
nodeHealth = health;
```

## Fix 2: app/admin/reports/page.tsx - duplicate formatMoney

Remove lines 85-92 (the second `const formatMoney` declaration)

## Fix 3: app/admin/reports/page.tsx - Date type mismatch

In the map call (around lines 107-108), change:
```typescript
createdAt: statement.createdAt.toISOString(),
updatedAt: statement.updatedAt.toISOString(),
```
to:
```typescript
createdAt: statement.createdAt,
updatedAt: statement.updatedAt,
```

And update AdminReportRecordsPanel.tsx StatementRow type to expect Date instead of string:
```typescript
createdAt: Date;
updatedAt: Date;
```