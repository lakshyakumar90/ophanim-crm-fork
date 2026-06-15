# Operations module

Cross-cutting operational features: attendance, dashboards, notifications, email, CSV, search, and background workers.

Parent: [Modules README](../README.md)

## Subfolders

| Folder | Purpose |
|--------|---------|
| `attendance/` | Clock in/out, rules, holidays, reports, auto-logout |
| `dashboard/` | Role-based dashboard analytics |
| `notifications/` | In-app notifications and preferences |
| `email/` | SMTP settings, send, history |
| `csv/` | Lead import/export templates |
| `activity/` | Activity log queries |
| `search/` | Global search |
| `workers/` | In-process background jobs (reminders) |

## Key entry files

| File | Role |
|------|------|
| `attendance/attendance.routes.ts` | `/api/v1/attendance` |
| `attendance/attendance.service.ts` | Core attendance logic |
| `attendance/attendance-clock.service.ts` | Clock in/out |
| `dashboard/dashboard.routes.ts` | `/api/v1/dashboard` |
| `notifications/notifications.routes.ts` | `/api/v1/notifications` |
| `email/email.routes.ts` | `/api/v1/email` |
| `csv/csv.routes.ts` | `/api/v1/csv` |
| `activity/activity.routes.ts` | `/api/v1/activities` |
| `search/search.routes.ts` | `/api/v1/search` |
| `workers/reminder.service.ts` | Reminder scheduler (optional via env) |

## Related

- [Backend README](../../../README.md#attendance)
- Frontend: `crm-fe-main/src/app/(shared)/attendance`, `src/lib/api/modules/operations.ts`
