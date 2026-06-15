# HR module

Employee records, leave, documents, payroll, performance reviews, and HR analytics.

Parent: [Modules README](../README.md)

## Subfolders

| Folder | Purpose |
|--------|---------|
| `employees/` | HR employee CRUD, routes at `/api/v1/hr` |
| `leave/` | Leave requests and balances |
| `documents/` | Employee documents and document types |
| `payroll/` | Payroll runs, salary bands, increments |
| `performance/` | Performance review cycles |
| `analytics/` | HR dashboard and analytics aggregations |

## Key entry files

| File | Role |
|------|------|
| `employees/hr.routes.ts` | Main HR API routes |
| `employees/hr.controller.ts` | Employee HTTP handlers |
| `employees/hr.service.ts` | Employee business logic |
| `payroll/payroll.routes.ts` | `/api/v1/payroll` routes |
| `payroll/payroll.service.ts` | Payroll processing |
| `performance/performance.routes.ts` | `/api/v1/performance` routes |
| `documents/documents.service.ts` | Document storage and metadata |
| `leave/leave.service.ts` | Leave workflow |

## Related

- Frontend: `crm-fe-main/src/app/(hr)/`, `src/components/hr/`
- Frontend lib: `crm-fe-main/src/lib/hr-*-api.ts`, `src/lib/api/modules/hr.ts`
