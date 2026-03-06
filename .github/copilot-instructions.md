# Ophanim CRM — Copilot Instructions

## Architecture Overview

Monorepo with two independent apps sharing a Supabase (PostgreSQL) database:

| Layer | Directory | Stack |
|-------|-----------|-------|
| **Backend API** | `crm-be-Main/` | Express 5 + TypeScript, deployed as Vercel serverless (`vercel.json`) |
| **Frontend** | `crm-fe-main/` | Next.js 16 (App Router) + TypeScript + shadcn/ui + Tailwind CSS |
| **Database** | Supabase | Migrations in `crm-be-Main/supabase/migrations/` (sequential numbered `.sql` files) |

The frontend uses a **hybrid data strategy**: mutations go through the Express API (`lib/api.ts` Axios client), while read-heavy queries can go **directly to Supabase** via `lib/supabase-queries.ts` with RLS enforcement. Both paths coexist—check which is used before adding new data fetching.

## Backend Patterns (`crm-be-Main/`)

### Request lifecycle
```
Route → authenticate → authorize (requireRole/checkResourceAccess) → validate(zodSchema) → service → response helper
```

- **Two route styles coexist**: Most routes define inline `asyncHandler` lambdas calling service functions directly (see `leads.routes.ts`). Projects uses a separate controller layer (`controllers/projects.controller.ts`). Follow the existing pattern for the module you're editing.
- **Validation**: Zod schemas live in `validators/*.validator.ts`. The `validate(schema, target)` middleware validates body/query/params and populates `req.validatedQuery`/`req.validatedParams` for Express 5 read-only query objects.
- **Responses**: Always use helpers from `utils/responses.ts` (`sendSuccess`, `sendCreated`, `sendPaginated`, `sendNoContent`). Throw `ApiError` (from same file) for errors—the global `errorMiddleware` catches them.
- **Error codes**: Structured codes in `utils/error-codes.ts` (e.g. `AUTH_001`, `BUS_006`). Use `ERROR_CODES` constants—never hardcode strings.
- **Authorization**: Role-based via `requireAdmin`, `requireManager`, `requireRole(...)` plus resource-level via `checkResourceAccess('lead')` and department blocking via `excludeDepartment(...)`.
- **Supabase clients**: `supabaseAdmin` (service-role, bypasses RLS) for server mutations; `supabase` (anon key) for user-scoped reads. Choose deliberately.
- **DB column names are snake_case**; services map to camelCase for API responses. When writing services, transform field names at the boundary.
- **Constants**: Enums for roles, lead statuses, sources, task priorities etc. in `config/constants.ts`. Frontend mirrors these in `crm-fe-main/src/config/constants.ts`—keep both in sync.

### Adding a new backend feature
1. Create Zod schemas in `validators/<feature>.validator.ts`
2. Create service functions in `services/<feature>.service.ts` (query via `supabaseAdmin`)
3. Create routes in `routes/<feature>.routes.ts` — use `authenticate`, authorization middleware, `validate()`, and `asyncHandler`
4. Register the router in `src/index.ts` under `API_PREFIX` (`/api/v1`)
5. Add migration SQL in `supabase/migrations/` with next sequential number prefix

### Dev commands (backend)
```bash
cd crm-be-Main
pnpm install
pnpm dev     # tsc && node dist/index.js  (no watch mode — rebuild manually)
pnpm build   # TypeScript compile only
```
Environment variables: copy `.env` template from `README.md`. Key vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `FRONTEND_URL`.

## Frontend Patterns (`crm-fe-main/`)

### App Router structure
Route groups organize by domain: `(auth)/`, `(sales)/`, `(global)/`, `(finance)/`, `(hr)/`, `(projects)/`, `(shared)/`. Each group with a `layout.tsx` wraps children in `<AppShell>` (sidebar + header).

### Data fetching
- **SWR** for all client-side data: `useSWR(key, fetcher)` with polling disabled by default (`swr-provider.tsx`). Use `mutate()` to revalidate after mutations.
- **Axios** API client (`lib/api.ts`): auto-attaches JWT, handles 401 → refresh token flow with queued retry. Exports domain-specific API objects (e.g. `authApi`, `leadsApi`).
- **Direct Supabase reads** (`lib/supabase-queries.ts`): use for simple reads where RLS is sufficient. The `mapToCamelCase()` utility converts snake_case DB responses.

### Providers (wrap order in `layout.tsx`)
`ThemeProvider` → `AuthProvider` → `DepartmentProvider` → `SWRProvider`

### UI conventions
- Components: shadcn/ui primitives in `components/ui/`, domain components in `components/<domain>/`
- Forms: React Hook Form + Zod resolvers (`@hookform/resolvers`)
- Toasts: Sonner (`toast.success()`, `toast.error()`)
- Icons: `lucide-react`
- All `@/` imports resolve to `src/`

### Dev commands (frontend)
```bash
cd crm-fe-main
pnpm install
pnpm dev     # next dev (port 3000)
pnpm lint    # eslint
```
Env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Key Conventions
- **Package manager**: pnpm (both apps)
- **Module system**: Backend uses ESM (`"type": "module"`) — all local imports require `.js` extension
- **3 roles permeate everything**: `admin`, `manager`, `employee` — check `config/constants.ts` USER_ROLES
- **Timestamps**: Backend uses IST helpers from `utils/date-utils.ts` / `getTimestampIST()`
- **Logging**: Pino logger (`utils/logger.ts`) — never `console.log` in backend
- **API prefix**: All backend routes mount under `/api/v1` (`API_PREFIX` constant)
- **Finance services**: Decomposed into sub-services under `services/finance/` (expense, invoice, payment, approval, etc.)
