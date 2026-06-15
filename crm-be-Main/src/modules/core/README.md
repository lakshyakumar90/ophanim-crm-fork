# Core module

Organization structure and user administration: users, teams, departments, roles, team notes, and admin utilities.

Parent: [Modules README](../README.md)

## Subfolders

| Folder | Purpose |
|--------|---------|
| `users/` | User CRUD, activation, multi-department support |
| `teams/` | Team CRUD and membership |
| `team-notes/` | Team discussion notes |
| `departments/` | Department management |
| `roles/` | Custom roles and permissions |
| `admin/` | Admin-only maintenance endpoints |

## Key entry files

| File | Role |
|------|------|
| `users/users.routes.ts` | `/api/v1/users` |
| `users/users.service.ts` | User persistence and department links |
| `teams/teams.routes.ts` | `/api/v1/teams` |
| `team-notes/team-notes.routes.ts` | Team notes (mounted under `/teams`) |
| `departments/departments.routes.ts` | `/api/v1/departments` |
| `roles/roles.routes.ts` | `/api/v1/roles` |
| `admin/admin.routes.ts` | `/api/v1/admin` |

## Related

- [Backend README](../../../README.md#users)
- [docs/API_AND_TESTING_GUIDE.md](../../../../docs/API_AND_TESTING_GUIDE.md) — multi-department users
- Frontend: `crm-fe-main/src/app/(global)/`, `src/lib/api/modules/core.ts`
