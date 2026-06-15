# System module

Infrastructure endpoints: health checks, scheduled cron triggers, and internal service hooks.

Parent: [Modules README](../README.md)

## Subfolders

| Folder | Purpose |
|--------|---------|
| `health/` | Liveness and readiness checks |
| `cron/` | HTTP-triggered cron jobs (gated by env) |
| `internal/` | Internal-only service endpoints |

## Key entry files

| File | Role |
|------|------|
| `health/health.routes.ts` | `GET /health` (no API prefix) |
| `health/health.controller.ts` | Health status response |
| `cron/cron.routes.ts` | `/api/v1/cron` scheduled tasks |
| `cron/cron.controller.ts` | Cron job handlers |
| `internal/internal.routes.ts` | `/api/v1/internal` |
| `internal/internal.controller.ts` | Internal maintenance handlers |

## Environment flags

| Variable | Effect |
|----------|--------|
| `ENABLE_HTTP_CRON` | Allow HTTP cron route invocation |
| `ENABLE_REMINDER_WORKER` | Run in-process reminder worker (see `operations/workers/`) |
| `ENABLE_LAZY_AUTO_LOGOUT` | In-process attendance auto-logout |

## Related

- Entry point: [`src/index.ts`](../../index.ts)
- [Modules README](../README.md)
