# Backend modules

Domain-driven Express modules under `src/modules/`. Each feature area owns its routes, controllers, services, and validators.

Parent: [Backend README](../../README.md)

## Route registration

[`register-routes.ts`](register-routes.ts) mounts all domain routers on the Express app. Called from [`src/index.ts`](../index.ts) after global middleware.

```typescript
import { registerRoutes } from "./modules/register-routes.js";
registerRoutes(app);
```

All API routes use the prefix `/api/v1` (`API_PREFIX` from `config/constants.ts`), except `/health`.

## Controller → service pattern

Each subdomain follows the same layering:

| Layer | File suffix | Responsibility |
|-------|-------------|----------------|
| Routes | `*.routes.ts` | HTTP paths, middleware (auth, validate), binds handlers |
| Controller | `*.controller.ts` | Parse request, call service, send JSON response |
| Service | `*.service.ts` | Business logic, Supabase queries, side effects |
| Validator | `*.validator.ts` | Zod schemas for request bodies and query params |

Large domains split services further (e.g. `leads-crud.service.ts`, `leads-bulk.service.ts`).

## Top-level modules

| Module | Mount prefix | README |
|--------|--------------|--------|
| `auth/` | `/api/v1/auth` | [auth/README.md](auth/README.md) |
| `core/` | `/api/v1/users`, `/teams`, `/departments`, `/roles`, `/admin` | [core/README.md](core/README.md) |
| `sales/` | `/api/v1/leads`, `/tasks` | [sales/README.md](sales/README.md) |
| `hr/` | `/api/v1/hr`, `/payroll`, `/performance` | [hr/README.md](hr/README.md) |
| `finance/` | `/api/v1/finance` | [finance/README.md](finance/README.md) |
| `operations/` | `/api/v1/attendance`, `/dashboard`, `/email`, etc. | [operations/README.md](operations/README.md) |
| `projects/` | `/api/v1/projects` | [projects/README.md](projects/README.md) |
| `system/` | `/health`, `/api/v1/cron`, `/internal` | [system/README.md](system/README.md) |
| `shared/` | (not mounted — imported by other modules) | [shared/README.md](shared/README.md) |

## Adding a new endpoint

1. Add handler logic in a `*.service.ts` file within the correct domain folder.
2. Expose it from `*.controller.ts`.
3. Register the route in `*.routes.ts` with appropriate auth middleware.
4. If new domain: create folder under `modules/`, then import and mount in `register-routes.ts`.

## Related

- [API endpoint tables](../../README.md#api-endpoints)
- [API_DOCUMENTATION.md](../../API_DOCUMENTATION.md)
