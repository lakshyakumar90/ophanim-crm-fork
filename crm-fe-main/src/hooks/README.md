# Hooks

React hooks organized by domain. Pages should stay thin and delegate data, forms, and side effects to hooks.

## Naming conventions

| Pattern | Example | Use for |
|---------|---------|---------|
| `useXxxPage` | `useSalesDashboard` | Page-level data fetching, filters, refresh orchestration |
| `useXxxForm` | `useCreateInvoiceForm` | `react-hook-form`, validation, submit handlers |
| `useXxx` | `useEmployees` | Reusable domain data hooks shared across pages/components |

## Folder layout

| Folder | Domain |
|--------|--------|
| `auth/` | Login form, permission hooks |
| `hr/` | Documents, leaves, employees, payroll, performance |
| `sales/` | Leads list, kanban, lead detail |
| `finance/` | Invoices and finance forms |
| `attendance/` | Clock-in, team overview, date ranges |
| `activity/` | Activity feed |
| `layout/` | Sidebar badges, header refresh, layout helpers |
| `core/` | Global users page |
| `shared/` | Cross-domain page hooks (reminders) |

Import from domain folders directly (e.g. `@/hooks/hr/useEmployees`). The `hr/index.ts` barrel re-exports common HR hooks.

## Related

- [Components](../components/README.md)
- [Lib](../lib/README.md)
- [App routes](../app/README.md)
