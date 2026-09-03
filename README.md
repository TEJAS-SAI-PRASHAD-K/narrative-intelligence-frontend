# Narrative Intelligence — Analyst Dashboard (Phase 5)

React dashboard over the Phase 4 API. Makes the five-pillar framework legible to a human
analyst: **Narratives** (what) → **Actors** (who) → **Domains** (who hosts) →
**Networks** (how it spreads) → **Manipulation** (how it is pushed artificially). Every
screen answers exactly one of those questions.

Vite 5 · React 18 · TypeScript (strict) · TanStack Query v5 · Tailwind + Radix ·
Recharts · Sigma.js + graphology · Zod.

---

## Run it

Needs Node 20+ and pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm gen:api
pnpm dev
```

Then open <http://localhost:5173>. Which backend it talks to is set by `.env.local`.

### Choosing a backend

**A — `DEMO_MODE=1` fixtures.** No database, no Docker, no key. Every one of the 69
routes answers with schema-valid data and stable ids. This is what the dashboard was
built against and what `docs/demo.md` assumes.

```bash
cd ../narrative-intelligence
DEMO_MODE=1 .venv/bin/uvicorn app.main:app --port 8001
```

```
VITE_API_BASE_URL=http://localhost:8001
VITE_API_KEY=demo-mode-needs-no-key
```

Demo mode is **read-only**: writes return `200` with the row unchanged. The UI reports
that honestly rather than pretending — a rename is held on screen with an "accepted but
not yet visible" notice instead of silently reverting.

**B — the real backend.** Real corpus, real Celery jobs, real scores.

```bash
cd ../narrative-intelligence
make up          # api + worker + beat + db + redis, api on :8000
```

```
VITE_API_BASE_URL=http://localhost:8000
VITE_API_KEY=<a real key>
```

Mint a key if you do not already hold one — it is shown **once**, so copy it
immediately:

```bash
docker compose exec api python -m app.cli bootstrap-key
```

It refuses if an active key already exists; add `--force` to mint another. Scopes:
`read` for every screen, `write` for reclustering / reports / enrichment, `admin` for
`/settings/keys`.

Controls are **not** pre-disabled by scope: the contract exposes no way for a client to
read its own key's scopes (there is no introspection route, and `GET /keys` itself needs
`admin`). A missing scope therefore surfaces on use, as an `ErrorState` quoting the
backend's own message — e.g. *"This API key has scopes ['read', 'write'] and needs
'admin'"* — with the `code` and `request_id`. See `docs/contract-gaps.md` #10.

### What differs on the real backend

Read from `/readyz` at runtime; the Sources page renders it under **Model
capabilities**. On a stock local stack:

| | |
|---|---|
| Compass Context | **Unavailable** without `ANTHROPIC_API_KEY`. Narrative detail shows the explicit "no context generated yet" state, not an error. |
| Narrative titles | Fall back to centroid keywords, with provenance `heuristic` — the pill reads "Derived by a rule, not a model". |
| `/posts/similar` | Accepts `post_id` but not raw `text` without an embedding checkpoint mounted. |
| Jobs | **Actually run.** "Update Now" really reclusters and renumbers narratives; reports really render. |

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
| `pnpm verify` | All four, in the order CI runs them (`ci` is reserved by pnpm) |
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
