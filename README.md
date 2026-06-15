# Ophanim CRM

Monorepo for the Ophanim CRM platform: a Next.js frontend and an Express/Supabase backend organized by business domain.

## Repository layout

| Path | Description |
|------|-------------|
| [`crm-fe-main/`](crm-fe-main/) | Next.js 16 App Router frontend (React 19, Tailwind, shadcn/ui) |
| [`crm-be-Main/`](crm-be-Main/) | Express API backend with domain modules under `src/modules/` |
| [`docs/`](docs/) | API contracts, testing guides, and quick-reference notes |

## Prerequisites

- Node.js 18+
- pnpm (recommended) or bun
- Supabase project (URL, anon key, service role key)

## Run locally

Run the backend and frontend in separate terminals.

### Backend

```bash
cd crm-be-Main
pnpm install
cp .env.example .env   # fill in Supabase and JWT values
pnpm dev
```

Default API base: `http://localhost:5000/api/v1` (set `PORT=5000` in `.env` to match the frontend dev default).

### Frontend

```bash
cd crm-fe-main
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Set `NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1` if your backend port differs.

## Documentation

| Document | Purpose |
|----------|---------|
| [Frontend README](crm-fe-main/README.md) | App Router structure, env vars, scripts |
| [Backend README](crm-be-Main/README.md) | API overview, env vars, endpoint tables |
| [Backend modules](crm-be-Main/src/modules/README.md) | Domain module layout and route registration |
| [Docs index](docs/README.md) | Links to API and testing guides |

## Architecture (high level)

```
ophanim-crm/
├── crm-fe-main/          # Next.js UI — route groups by domain
│   └── src/
│       ├── app/          # (auth), (sales), (hr), (finance), (projects), (global), (shared)
│       ├── components/   # Domain UI components
│       ├── hooks/        # Page and form hooks
│       ├── lib/          # API client, Supabase reads, schemas
│       └── config/       # Sidebar nav, shared constants
└── crm-be-Main/          # Express API
    └── src/modules/      # auth, sales, hr, finance, operations, projects, core, system, shared
```

The frontend uses the REST API for mutations and many reads; selected read paths use direct Supabase queries with RLS where configured.
