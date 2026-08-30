# Narrative Intelligence — Analyst Dashboard (Phase 5)

React dashboard over the Phase 4 API. Makes the five-pillar framework legible to a human
analyst: **Narratives** (what) → **Actors** (who) → **Domains** (who hosts) →
**Networks** (how it spreads) → **Manipulation** (how it is pushed artificially). Every
screen answers exactly one of those questions.

Vite 5 · React 18 · TypeScript (strict) · TanStack Query v5 · Tailwind + Radix ·
Recharts · Sigma.js + graphology · Zod.

---

## Run it

Needs Node 20+ and pnpm. Nothing else — no database, no Docker.

**1. Start a Phase 4 backend in demo mode** (from the backend repo):

```bash
DEMO_MODE=1 .venv/bin/uvicorn app.main:app --port 8001
```

All 69 routes, served from fixtures, with stable ids and no API key required.

**2. Start the dashboard:**

```bash
pnpm install
cp .env.example .env.local
pnpm gen:api
pnpm dev
```

Then open <http://localhost:5173>.

Against a real (non-demo) backend, point `VITE_API_BASE_URL` at it and paste a key with
the `read` scope into `VITE_API_KEY`.

---

## Scripts

| | |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Typecheck + production build |
| `pnpm gen:api` | Regenerate `src/api/schema.d.ts` from `openapi.json` |
| `pnpm gen:api:check` | Fail if the generated types have drifted from the contract |
| `pnpm typecheck` | `tsc -b --noEmit`, strict |
| `pnpm lint` | ESLint, zero warnings tolerated |
| `pnpm test` | Vitest |
| `pnpm ci` | All four, in the order CI runs them |
| `pnpm sync:contract` | Copy `openapi.json` from the sibling backend repo and regenerate |

---

## API key handling

**This is a local-only, capstone-scoped decision.**

The dashboard reads `VITE_API_KEY` from `.env.local` and sends it as `X-API-Key`.
Anything prefixed `VITE_` is inlined into the built JavaScript by Vite, so **a
production build made this way would ship the key to every visitor**. That is acceptable
here and only here: this build runs on an analyst's own machine against a backend on
localhost, and Phase 5 explicitly has no auth system.

The production path, which is Phase 6's problem: a thin reverse proxy in front of the
API that injects `X-API-Key` server-side, with the browser sending a session cookie
instead. No frontend change is needed for that beyond dropping the header.

Rules that hold now:

- `.env.local` is gitignored. Never commit a key.
- `.env.example` carries a placeholder and nothing else.
- The key never appears in a `VITE_`-prefixed variable in any committed file.
- `/settings/keys` shows a newly minted key exactly once, in a dialog that says so —
  the backend stores a hash, not the key.

---

## What is where

```
src/
  api/          schema.d.ts (generated) · client.ts · keys.ts · queries/*
  lib/          filters.ts (the URL contract) · format.ts (the null contract) · tokens.ts
  components/   ui/ (Radix) · risk/ · ai/ · score/ · compass/ · kpi/ · table/ ·
                filters/ · cohorts/ · charts/ · states/ · __fixtures__/
  jobs/         JobStore.tsx · JobTray.tsx
  layout/       AppLayout · IconRail · TopBar · useProject
  pages/        one directory per route group
```

Four rules the code enforces, each documented where it lives:

1. **The URL is the state.** `src/lib/filters.ts` is the only serializer; `useFilters`
   the only read/write path. Copy any address bar and a colleague sees the same view.
2. **`null` is not zero.** Not-measured renders `—` with a reason, never `0`, never a
   zero-height bar. `src/lib/format.ts`.
3. **Nothing that returns `202` is done.** Every enqueue goes to the job tray, which
   polls and invalidates only what that job kind touched. `src/jobs/`.
4. **Types are generated.** `schema.d.ts` is the contract. A hand-written interface
   duplicating a backend schema is a bug; CI fails on drift.

---

## Documentation

- [`docs/frontend.md`](docs/frontend.md) — state ownership, the `FilterSpec` ⇄ URL
  contract, query keys, the job lifecycle.
- [`docs/components.md`](docs/components.md) — every shared primitive, its contract, and
  which pages consume it.
- [`docs/demo.md`](docs/demo.md) — a six-minute demo script that runs entirely on
  `DEMO_MODE=1`.
- [`docs/contract-gaps.md`](docs/contract-gaps.md) — where the live API differed from
  the notes, and what the UI does about it. **No backend changes were made.**
- `/kitchen-sink` — every primitive in every state, no backend required.

---

## Scope

Phase 5 is the dashboard only. Not here, deliberately: backend changes, client-side
scoring or aggregation, an auth system, SSR, deployment, websockets, a dashboard
builder, a light theme, i18n.
