# Backend tests (Vitest)

Vitest covers three layers. Unit and integration tests run without a live database by default.

## Commands

| Script | What it runs |
|--------|----------------|
| `pnpm test` | All test files |
| `pnpm test:unit` | Middleware, validators, pure logic |
| `pnpm test:integration` | HTTP routes via supertest (mocked services) |
| `pnpm test:db` | Live Supabase checks (requires `.env` + `RUN_DB_TESTS=true`) |
| `pnpm test:watch` | Vitest watch mode |

## Layout

```
tests/
  helpers/          Shared mocks, test users, app factory
  setup/            Global Vitest setup (test env vars)
  unit/             Fast tests — no HTTP, no DB
  integration/      Route + RBAC + validation via supertest
  db/               Optional real Supabase connectivity tests
```

## Integration tests

Integration tests mount selected route modules on a minimal Express app and inject users via the `x-test-user` header (see `tests/helpers/test-users.ts`).

Domain services and Supabase are mocked so tests focus on:

- Permission middleware (`requirePermission`, `requireAnyPermission`)
- Request validation (Zod schemas)
- Controller wiring and status codes

## Database tests

DB tests are **opt-in**. They read credentials from your local `.env`:

```bash
# Windows (PowerShell)
$env:RUN_DB_TESTS="true"; pnpm test:db

# bash
RUN_DB_TESTS=true pnpm test:db
```

Required env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

Use DB tests in CI only when a test Supabase project is available. Do not run destructive tests against production.

## Adding tests

1. **Validator change** — add cases under `tests/unit/validators/`
2. **New permission gate** — add integration case under `tests/integration/`
3. **Service logic** — prefer unit tests with mocked Supabase using `tests/helpers/mock-supabase.ts`
