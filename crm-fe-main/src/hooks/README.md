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
| `hr/` | Documents, leaves, employees, payroll, performance |
| `sales/` | Leads list, kanban, lead detail |
| `finance/` | Invoices and finance forms |
| `attendance/` | Clock-in, team overview, date ranges |
| `activity/` | Activity feed |
| `layout/` | Sidebar badges and layout helpers |

Root-level shims (`useEmployees.ts`, etc.) re-export from `hr/` for backward compatibility. Prefer importing from `@/hooks/hr` in new code.

## Related

- [Components](../components/README.md)
- [Lib](../lib/README.md)
- [App routes](../app/README.md)
