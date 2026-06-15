# Projects module

Project lifecycle, members, notes, and file attachments.

Parent: [Modules README](../README.md)

## Subfolders

| Folder | Purpose |
|--------|---------|
| `projects/` | Project CRUD, members, settings, analytics |
| `notes/` | Project notes |
| `files/` | Project file metadata and storage |

## Key entry files

| File | Role |
|------|------|
| `projects/projects.routes.ts` | `/api/v1/projects` routes |
| `projects/projects.controller.ts` | HTTP handlers |
| `projects/projects.service.ts` | Project business logic and access control |
| `projects/projects.validator.ts` | Request validation |
| `notes/notes.service.ts` | Project notes CRUD |
| `notes/notes.validator.ts` | Note payload validation |
| `files/files.service.ts` | File upload metadata and listing |

## Related

- Frontend: `crm-fe-main/src/app/(projects)/`
- Frontend lib: `crm-fe-main/src/lib/projects-api.ts`, `src/lib/api/modules/projects.ts`
