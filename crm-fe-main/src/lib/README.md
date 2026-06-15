# Lib

Client-side data access, validation schemas, and shared utilities. Mutations and authenticated writes go through the REST API; selected reads use Supabase with RLS.

Parent: [Frontend README](../../README.md)

## Layout

```
lib/
├── api/                 # Axios client and domain API modules
├── supabase/            # Direct Supabase read modules
├── auth/                # Login schema and server actions
├── finance/             # Finance form schemas and server actions
├── hr/                  # HR helpers and barrel exports
├── sales/               # Sales-specific constants
└── *.ts                 # Root utilities and domain *-api.ts shims
```

## `api/` — REST client

| File / folder | Purpose |
|---------------|---------|
| `api/client.ts` | Axios instance, JWT token storage, interceptors |
| `api/unwrap.ts` | Normalizes `{ success, data }` API responses |
| `api/index.ts` | Re-exports all domain modules |
| `api/modules/auth.ts` | Login, logout, refresh, `/auth/me` |
| `api/modules/core.ts` | Users, teams, departments, roles |
| `api/modules/sales.ts` | Leads, tasks, pipeline |
| `api/modules/operations.ts` | Attendance, notifications, dashboard, CSV, email |
| `api/modules/projects.ts` | Projects CRUD and members |
| `api/modules/hr.ts` | HR employees, payroll, performance |

Base URL: `NEXT_PUBLIC_API_URL` or `http://localhost:5000/api/v1` in development.

## `supabase/` — read-optimized queries

| File / folder | Purpose |
|---------------|---------|
| `supabase.ts` | Supabase client singleton |
| `supabase/index.ts` | Re-exports domain read modules |
| `supabase/map-to-camel.ts` | snake_case → camelCase row mapping |
| `supabase/modules/core.ts` | Users, teams, departments reads |
| `supabase/modules/sales.ts` | Leads and pipeline reads |
| `supabase/modules/tasks.ts` | Task reads |
| `supabase/modules/operations.ts` | Attendance rules, holidays, notifications |
| `supabase/modules/projects.ts` | Projects, notes, activity reads |
| `supabase/modules/hr.ts` | HR-related reads |

Used by `smart-read.ts` patterns: try Supabase first in dev/non-production, fall back to API on failure.

## Domain `*-api.ts` files (root)

Legacy and specialized API wrappers that pages/hooks import directly:

| File | Domain |
|------|--------|
| `finance-api.ts` | Finance aggregates |
| `projects-api.ts` | Project-specific endpoints |
| `hr-employee-api.ts`, `hr-leave-api.ts`, `hr-document-api.ts` | HR subdomains |
| `performance-api.ts` | Performance reviews |
| `payroll-client.ts` | Payroll operations |

Prefer `api/modules/*` for new code unless a dedicated wrapper already exists.

## `auth/`

| File | Purpose |
|------|---------|
| `auth/login-schema.ts` | Zod schema for login form |
| `auth/login-actions.ts` | Login submit / token handling helpers |

## `finance/` — schemas and actions

| File | Purpose |
|------|---------|
| `finance/invoice-form-schema.ts` | Invoice create/edit validation |
| `finance/expense-form-schema.ts` | Expense form validation |
| `finance/email-form-schema.ts` | Finance email request validation |
| `finance/recurring-form-schema.ts` | Recurring schedule validation |
| `finance/invoice-actions.ts` | Invoice server actions |
| `finance/expense-actions.ts` | Expense server actions |
| `finance/email-actions.ts` | Email request actions |
| `finance/recurring-actions.ts` | Recurring schedule actions |

## Other utilities

| File | Purpose |
|------|---------|
| `permissions.ts` | Role and permission helpers |
| `activity-grouping.ts` | Groups activity events for display |
| `lead-status-config.ts` | Lead status labels and colors |
| `attendance-utils.ts`, `attendance-types.ts` | Attendance formatting |
| `date-utils.ts`, `utils.ts` | General helpers |
| `api-error.ts`, `hr-error-toast.ts` | Error presentation |

## Related

- [Hooks](../hooks/README.md)
- [Backend modules](../../../crm-be-Main/src/modules/README.md)
