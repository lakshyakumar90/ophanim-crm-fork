# Components

Reusable UI organized by business domain. Pages in `src/app/` compose these components; heavy logic stays in hooks and `src/lib/`.

Parent: [Frontend README](../../README.md)

## Domain folders

| Folder | Purpose | Typical consumers |
|--------|---------|-------------------|
| `activity/` | Activity feed filters, list items | `/activity`, `/global/activity` |
| `attendance/` | Clock-in, charts, history, team views | `/attendance`, HR attendance |
| `auth/` | Login and auth UI | `/login` |
| `calendar/` | Calendar views | `/calendar` |
| `dashboard/` | Generic dashboard cards and stats | Domain dashboards |
| `finance/` | Invoices, expenses, emails, recurring forms and tables | `/finance/*` |
| `global/` | Admin users, teams, roles UI | `/global/*` |
| `hr/` | Employees, payroll, leaves, documents, analytics, performance | `/hr/*`, `/performance/*` |
| `layout/` | Sidebar, header, nav links | All authenticated layouts |
| `sales/` | Sales dashboard, analytics, and leads UI | `/sales`, `/sales/leads/*` |
| `projects/` | Project cards, tabs, member management | `/projects/*` |
| `notifications/` | Notification list, startup alerts | `/notifications` |
| `reminders/` | Reminder filters and sections | `/reminders` |
| `settings/` | Profile, password, notification settings | `/settings/*` |
| `shared/` | Cross-domain selectors and small widgets | Multiple domains |
| `ui/` | shadcn/Radix primitives (Button, Dialog, etc.) | All domains |

## Conventions

- One primary component per file; co-locate small helpers in the same folder.
- Use `components/ui/` for generic primitives; do not put domain logic there.
- Prefer barrel `index.ts` exports only when a folder has many related exports (e.g. `hr/dashboard/`).
- Gate privileged UI with `components/ui/permission-gate.tsx` or role checks from `useAuth`.

## Related

- [App routes](../app/README.md)
- [Hooks](../hooks/README.md)
- [Lib](../lib/README.md)
