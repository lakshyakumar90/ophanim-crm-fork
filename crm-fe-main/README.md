# CRM Frontend

Next.js App Router frontend for Ophanim CRM. Pages are grouped by business domain; data access lives in `src/lib/` and `src/hooks/`.

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4, shadcn/ui (Radix)
- Axios + SWR for API data
- React Hook Form + Zod for forms
- Supabase client for selected read-only queries (RLS)

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev` | Development server |
| `build` | `next build` | Production build |
| `start` | `next start` | Serve production build |
| `lint` | `eslint` | Lint source |

## Environment variables

Create `.env.local` in this directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Production | Backend API base (includes `/api/v1`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Supabase project URL for direct reads |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Supabase anon key (RLS enforced) |

In development, `NEXT_PUBLIC_API_URL` defaults to `http://localhost:5000/api/v1` when unset.

## Project structure

```
src/
├── app/           # Route groups — see src/app/README.md
├── components/    # Domain UI — see src/components/README.md
├── config/        # Sidebar nav, constants — see src/config/README.md
├── hooks/         # Page/form hooks — see src/hooks/README.md
├── lib/           # API, Supabase, schemas — see src/lib/README.md
├── providers/     # Auth and theme providers
└── types/         # Shared TypeScript types
```

## Conventions

### App Router route groups

Parentheses in folder names (e.g. `(sales)`) define layout groups without affecting the URL. Each domain group has its own `layout.tsx` and sidebar context.

See [src/app/README.md](src/app/README.md) for route groups and URL examples.

### Pages

- Keep `page.tsx` files thin: compose components and call hooks.
- Use `"use client"` only when the page needs hooks, browser APIs, or interactivity.
- Dynamic segments use `[id]` folders (e.g. `sales/leads/[id]/page.tsx`).

### Hooks

| Pattern | Example | Use for |
|---------|---------|---------|
| `useXxxPage` | `useSalesDashboard` | Page data, filters, refresh |
| `useXxxForm` | `useCreateInvoiceForm` | Form state, validation, submit |
| `useXxx` | `useEmployees` | Reusable domain data |

Domain hooks live under `src/hooks/<domain>/`. Root-level shims re-export from domain folders for backward compatibility.

### Components

- Domain folders mirror app domains (`sales/`, `hr/`, `finance/`, etc.).
- Shared primitives live in `components/ui/`.
- Layout chrome lives in `components/layout/`.

See [src/components/README.md](src/components/README.md).

## Related

- [App routes](src/app/README.md)
- [Components](src/components/README.md)
- [Lib](src/lib/README.md)
- [Config](src/config/README.md)
- [Hooks](src/hooks/README.md)
- [Backend README](../crm-be-Main/README.md)
