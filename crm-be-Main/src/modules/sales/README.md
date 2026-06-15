# Sales module

Lead pipeline, CRUD, bulk operations, comments, reminders, and sales tasks.

Parent: [Modules README](../README.md)

## Subfolders

| Folder | Purpose |
|--------|---------|
| `leads/` | Lead management, pipeline, bulk, comments, reminders |
| `tasks/` | Sales task CRUD and reassignment |

## Key entry files — leads

| File | Role |
|------|------|
| `leads/leads.routes.ts` | `/api/v1/leads` routes |
| `leads/leads.controller.ts` | HTTP handlers |
| `leads/leads.service.ts` | Main lead orchestration |
| `leads/leads-crud.service.ts` | Create, read, update, delete |
| `leads/leads-bulk.service.ts` | Bulk assign, update, delete |
| `leads/leads-pipeline.service.ts` | Pipeline and status transitions |
| `leads/leads-comments.service.ts` | Lead comments |
| `leads/leads-activities.service.ts` | Activity logging |
| `leads/leads-reminders.service.ts` | Lead reminders |
| `leads/leads.validator.ts` | Request validation |

## Key entry files — tasks

| File | Role |
|------|------|
| `tasks/tasks.routes.ts` | `/api/v1/tasks` routes |
| `tasks/tasks.controller.ts` | HTTP handlers |
| `tasks/tasks.service.ts` | Task business logic |
| `tasks/tasks.validator.ts` | Request validation |

## Related

- [Backend README](../../../README.md#leads)
- Frontend: `crm-fe-main/src/app/(sales)/`, `src/components/leads/`
