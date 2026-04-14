# Backend (crm-be-Main/src) - Folder Wise File Documentation

Source root: `crm-be-Main/src`

Total TypeScript files documented: **101**

## Folder Index

### (root)

Contains 1 file(s).

| File | Role |
|---|---|
| crm-be-Main/src/index.ts | Module implementation |

### config

Contains 3 file(s).

| File | Role |
|---|---|
| crm-be-Main/src/config/constants.ts | Configuration constants and environment contracts |
| crm-be-Main/src/config/env.ts | Configuration constants and environment contracts |
| crm-be-Main/src/config/supabase.ts | Configuration constants and environment contracts |

### controllers

Contains 1 file(s).

| File | Role |
|---|---|
| crm-be-Main/src/controllers/projects.controller.ts | Controller layer for request orchestration |

### lib

Contains 1 file(s).

| File | Role |
|---|---|
| crm-be-Main/src/lib/permissions.ts | Shared utility/API integration layer |

### middleware

Contains 6 file(s).

| File | Role |
|---|---|
| crm-be-Main/src/middleware/auth.middleware.ts | Express middleware for auth/validation/errors |
| crm-be-Main/src/middleware/authorization.middleware.ts | Express middleware for auth/validation/errors |
| crm-be-Main/src/middleware/error.middleware.ts | Express middleware for auth/validation/errors |
| crm-be-Main/src/middleware/rate-limiter.middleware.ts | Express middleware for auth/validation/errors |
| crm-be-Main/src/middleware/request-id.middleware.ts | Express middleware for auth/validation/errors |
| crm-be-Main/src/middleware/validation.middleware.ts | Express middleware for auth/validation/errors |

### routes

Contains 24 file(s).

| File | Role |
|---|---|
| crm-be-Main/src/routes/activity.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/admin.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/attendance.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/auth.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/cron.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/csv.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/dashboard.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/departments.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/email.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/finance.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/health.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/hr.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/internal.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/leads.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/notifications.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/payroll.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/performance.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/projects.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/roles.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/search.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/tasks.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/team-notes.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/teams.routes.ts | API route registration and endpoint wiring |
| crm-be-Main/src/routes/users.routes.ts | API route registration and endpoint wiring |

### scripts

Contains 2 file(s).

| File | Role |
|---|---|
| crm-be-Main/src/scripts/run_migration_placeholder.ts | Operational/seed/migration scripts |
| crm-be-Main/src/scripts/seed-admin.ts | Operational/seed/migration scripts |

### services

Contains 29 file(s).

| File | Role |
|---|---|
| crm-be-Main/src/services/activity-events.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/activity.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/attendance.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/auth.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/cache.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/csv.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/dashboard.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/departments.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/document-types.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/documents.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/email.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/files.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/hr-analytics.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/hr.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/leads.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/leave.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/notes.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/notifications.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/otp.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/payroll.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/performance.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/projects.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/reminder.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/search.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/tasks.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/team-notes.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/teams.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/user-email.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/users.service.ts | Domain/business logic and data access |

### services/finance

Contains 8 file(s).

| File | Role |
|---|---|
| crm-be-Main/src/services/finance/approval.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/finance/email-request.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/finance/expense.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/finance/finance-dashboard.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/finance/invoice.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/finance/payment.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/finance/recurring.service.ts | Domain/business logic and data access |
| crm-be-Main/src/services/finance/scheduled-email.service.ts | Domain/business logic and data access |

### types

Contains 2 file(s).

| File | Role |
|---|---|
| crm-be-Main/src/types/api.types.ts | Type definitions and contracts |
| crm-be-Main/src/types/database.types.ts | Type definitions and contracts |

### utils

Contains 8 file(s).

| File | Role |
|---|---|
| crm-be-Main/src/utils/2fa.utils.ts | Module implementation |
| crm-be-Main/src/utils/date-utils.ts | Module implementation |
| crm-be-Main/src/utils/error-codes.ts | Module implementation |
| crm-be-Main/src/utils/helpers.ts | Module implementation |
| crm-be-Main/src/utils/job-title.utils.ts | Module implementation |
| crm-be-Main/src/utils/logger.ts | Module implementation |
| crm-be-Main/src/utils/pagination.ts | Module implementation |
| crm-be-Main/src/utils/responses.ts | Module implementation |

### validators

Contains 16 file(s).

| File | Role |
|---|---|
| crm-be-Main/src/validators/attendance.validator.ts | Zod schema validation definitions |
| crm-be-Main/src/validators/auth.validator.ts | Zod schema validation definitions |
| crm-be-Main/src/validators/departments.validator.ts | Zod schema validation definitions |
| crm-be-Main/src/validators/documents.validator.ts | Zod schema validation definitions |
| crm-be-Main/src/validators/finance.validator.ts | Zod schema validation definitions |
| crm-be-Main/src/validators/hr.validator.ts | Zod schema validation definitions |
| crm-be-Main/src/validators/leads.validator.ts | Zod schema validation definitions |
| crm-be-Main/src/validators/notes.validator.ts | Zod schema validation definitions |
| crm-be-Main/src/validators/notifications.validator.ts | Zod schema validation definitions |
| crm-be-Main/src/validators/payroll.validator.ts | Zod schema validation definitions |
| crm-be-Main/src/validators/performance.validator.ts | Zod schema validation definitions |
| crm-be-Main/src/validators/projects.validator.ts | Zod schema validation definitions |
| crm-be-Main/src/validators/tasks.validator.ts | Zod schema validation definitions |
| crm-be-Main/src/validators/team-notes.validator.ts | Zod schema validation definitions |
| crm-be-Main/src/validators/teams.validator.ts | Zod schema validation definitions |
| crm-be-Main/src/validators/users.validator.ts | Zod schema validation definitions |
