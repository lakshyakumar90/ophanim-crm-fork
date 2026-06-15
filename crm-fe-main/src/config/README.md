# Config

Application-wide constants and sidebar navigation definitions.

Parent: [Frontend README](../../README.md)

## Files

| File / folder | Purpose |
|---------------|---------|
| `constants.ts` | Pagination, roles, lead statuses, task priorities — mirrors backend constants |
| `sidebar-nav/types.ts` | `NavItem` interface (href, icon, roles, permissions, badges) |
| `sidebar-nav/sales.ts` | Sales module sidebar links |
| `sidebar-nav/hr.ts` | HR module sidebar links |
| `sidebar-nav/finance.ts` | Finance module sidebar links |
| `sidebar-nav/projects.ts` | Projects module sidebar links |
| `sidebar-nav/global.ts` | Admin / global sidebar links |
| `sidebar-nav/shared.ts` | Shared cross-domain links (attendance, settings, etc.) |

## Sidebar navigation

Each route group layout (`src/app/(sales)/layout.tsx`, etc.) imports its nav config from `sidebar-nav/` and passes items to `components/layout/sidebar.tsx`.

`NavItem` fields:

- `title`, `href`, `icon` — label and route
- `roles` — optional role allow-list (`admin`, `manager`, `employee`)
- `anyPermission` — optional permission strings
- `showBadge`, `showReminderBadge`, etc. — tie into `useSidebarBadges`

When adding a new sidebar page:

1. Add the route under `src/app/(<group>)/`.
2. Append a `NavItem` to the matching `sidebar-nav/<domain>.ts` file.
3. Use an existing icon from `lucide-react` for consistency.

## Constants

`constants.ts` is the frontend source of truth for enums and limits shared with the backend (lead statuses, user roles, pagination defaults). Update backend `crm-be-Main/src/config/constants.ts` in tandem when changing shared business rules.

## Related

- [App routes](../app/README.md)
- [Layout components](../components/layout/)
