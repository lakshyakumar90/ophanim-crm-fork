# App Router routes

Next.js App Router pages under `src/app/`. Parenthesized folders are [route groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups): they share layouts but do not appear in the URL.

Parent: [Frontend README](../../README.md)

## Route groups

| Group | Layout | Purpose | Example URLs |
|-------|--------|---------|--------------|
| `(auth)` | Minimal auth shell | Login and unauthenticated flows | `/login` |
| `(sales)` | Sales sidebar | Leads, tasks, teams, sales analytics | `/sales`, `/sales/leads`, `/sales/leads/[id]`, `/sales/tasks` |
| `(hr)` | HR sidebar | Employees, payroll, leave, documents, performance | `/hr`, `/hr/employees`, `/hr/payroll`, `/hr/leaves` |
| `(finance)` | Finance sidebar | Invoices, expenses, payments, emails, recurring | `/finance`, `/finance/invoices`, `/finance/expenses/new` |
| `(projects)` | Projects sidebar | Project list, detail tabs, project tasks | `/projects`, `/projects/[id]/overview`, `/projects/my-tasks` |
| `(global)` | Admin/global sidebar | Org-wide users, teams, roles, admin dashboard | `/global`, `/global/users`, `/global/teams` |
| `(shared)` | Shared sidebar | Cross-domain tools: attendance, calendar, settings | `/attendance`, `/calendar`, `/notifications`, `/settings` |

## Root entry

| File | URL | Behavior |
|------|-----|----------|
| `page.tsx` | `/` | Redirects by role: admin → `/global`, PM → `/projects`, others → department home |

## URL mapping notes

- Group prefix is omitted: `(sales)/sales/leads/page.tsx` → `/sales/leads`
- Dynamic routes: `(projects)/projects/[id]/notes/page.tsx` → `/projects/:id/notes`
- `(shared)` routes sit at the root path: `(shared)/attendance/page.tsx` → `/attendance`

## Key routes by domain

### Auth

- `/login` — sign in

### Sales

- `/sales` — sales dashboard
- `/sales/leads`, `/sales/leads/new`, `/sales/leads/[id]`, `/sales/leads/[id]/edit`
- `/sales/tasks`, `/sales/tasks/new`, `/sales/tasks/[id]`
- `/sales/teams`, `/sales/analytics`, `/sales/duplicate-leads`

### HR

- `/hr` — HR dashboard
- `/hr/employees`, `/hr/leaves`, `/hr/documents`, `/hr/holidays`
- `/hr/payroll`, `/hr/payroll/[id]`, `/hr/payroll/my-payslips`, `/hr/payroll/salary-bands`
- `/hr/performance`, `/hr/performance/new`, `/hr/performance/[id]`
- `/hr/analytics`, `/hr/attendance`

### Finance

- `/finance` — finance dashboard
- `/finance/invoices`, `/finance/invoices/new`, `/finance/invoices/[id]`
- `/finance/expenses`, `/finance/payments`, `/finance/approvals`
- `/finance/emails`, `/finance/recurring`, `/finance/analytics`

### Projects

- `/projects`, `/projects/my-projects`, `/projects/my-tasks`
- `/projects/[id]/overview`, `/projects/[id]/tasks`, `/projects/[id]/files`, `/projects/[id]/notes`
- `/projects/[id]/members`, `/projects/[id]/activity`, `/projects/[id]/settings`

### Global (admin)

- `/global` — admin dashboard
- `/global/users`, `/global/users/[id]`, `/global/users/[id]/edit`, `/global/new`
- `/global/teams`, `/global/roles`, `/global/activity`

### Shared

- `/attendance`, `/attendance/[userId]`
- `/activity`, `/calendar`, `/reminders`, `/tasks`, `/tasks/[id]`
- `/notifications`, `/email`, `/settings`, `/settings/password`
- `/documents/my-documents`
- `/performance/my-review`, `/performance/peer-feedback`

## Adding a page

1. Place `page.tsx` under the correct route group and URL segment folder.
2. Add a nav entry in [`src/config/sidebar-nav/`](../config/sidebar-nav/) if the page should appear in the sidebar.
3. Implement data logic in `src/hooks/<domain>/` and UI in `src/components/<domain>/`.

## Related

- [Sidebar config](../config/README.md)
- [Hooks](../hooks/README.md)
- [Components](../components/README.md)
