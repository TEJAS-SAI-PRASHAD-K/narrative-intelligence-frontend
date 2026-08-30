# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-08-30

Phase 5: the analyst dashboard. Every one of the 69 Phase 4 routes now has a screen or
a component behind it, and the five-pillar framework is legible without reading JSON.
Built and verified end to end against a `DEMO_MODE=1` backend.

### Added

- **The URL as the state.** `src/lib/filters.ts` is the single `FilterSpec` ⇄ URL ⇄
  query-key serializer, shared by every list endpoint. 17 tests pin the round trip,
  including the cases that silently corrupt a pasted link: `is_anomalous=false` is not
  an absence, `min_toxicity=0` is not an absence, and removing one value of a
  multi-value filter keeps the rest. Copying any address bar reproduces the view
  exactly, chips included.
- **Generated contract types.** `pnpm gen:api` produces `src/api/schema.d.ts` from
  `openapi.json`; `pnpm gen:api:check` fails CI on drift. Every request and response
  type derives from it, and `src/api/types.ts` re-exports without adding a field.
- **The shared component system**, tagged `v0.2-ui-shell`: `KpiStrip`/`KpiCard`,
  `RiskScorecard`, `RiskDot`/`ScoreCell`, `NotMeasured`, `AiPill`/`AiBlock`,
  `ScoreExplainer`, `CompassModule`, `FreshnessBar`, `OriginalPost`, `FilterBar`,
  `EntityTable`, `CohortsPanel`, `JobTray`, `TruncationBanner`, and the
  empty/error/skeleton triad.
- **Fifteen routes**: overview (with all five KPI drilldowns), narrative feed, narrative
  detail with Compass Context, curate, drivers, cohorts, domains and domain detail,
  author profile and slide-over, network entry and full-screen graph, media, reports,
  alerts, sources, keys, jobs.
- **`/kitchen-sink`** — every primitive in every state from typed fixtures, with no
  backend running.
- **Docs**: `docs/frontend.md` (state ownership, the URL contract, query keys, the job
  lifecycle), `docs/components.md`, `docs/demo.md` (a six-minute script that runs
  entirely on `DEMO_MODE=1`), `docs/contract-gaps.md`, and `docs/screenshots/`.

### Contract discipline

- **`null` is never rendered as `0`.** `Metric.value`, `Engagement.views`,
  `PostScores.*` and anything in `NarrativeScorecard.missing[]` render an em dash with
  the reason attached. Chart series drop unmeasured points rather than plotting them at
  zero — a gap means "we do not know", a dip to zero means "nothing happened".
- **Definitions come from the backend.** Every KPI's `(?)` renders `metric.definition`
  verbatim; no definition text exists in frontend source.
- **Nothing that returns `202` is treated as done.** Seven enqueueing routes hand their
  `JobAccepted` to a global tray that polls `/jobs/{id}` at 1s backing off to 5s and, on
  success, invalidates only the query families that job kind actually touched.
- **Compass citations render inline at their character spans**, not as a flat
  bibliography, and `insufficient_evidence` gets an explicit "could not source this
  claim" state rather than an empty box.
- **`enrichment_status: "unavailable"` reads as "not enriched"**, never as low risk.
- **Ingest rejection reasons are expanded**, never collapsed behind a total.
- **No client-side scoring or aggregation.** `ScoreExplainer` renders the served
  `contribution`; nothing is recomputed.

### Fixed

Six defects found by running against a live backend rather than by reading the spec.

- **Score scales.** `AuthorOut.risk_score`, `DomainOut.risk_score`,
  `HighRiskPost.risk_score` and `fusion_score` are `0..100` while every other score is
  `0..1`, and the value alone cannot tell them apart — `risk_score: 33.2` was rendering
  as `3320%`. `ScoreCell` now takes a required `scale` prop so a call site has to look
  the field up, with `riskLevelFrom100` kept separate from `riskLevelFromScore`.
- **A dead backend showed nothing at all** — no data, no spinner, no error. Two causes:
  `notFound` was derived from `!isLoading && !error`, which is true before the first
  fetch is dispatched; and TanStack parks retrying queries as `fetchStatus: "paused"`
  while the tab is hidden, and a paused query never errors. `notFound` now requires the
  query to have succeeded, `network_error` is not retried, and `networkMode` is
  `always`.
- **The graph drew a black disc.** Sigma parses colours itself and cannot read the
  `hsl(H S% L% / A)` form the design tokens use, so it rendered everything as black.
  `src/lib/tokens.ts` resolves tokens to `rgba()` with a visible grey fallback.
- **The graph drew a perfect circle.** `layout: "client"` means the `x`/`y` in the
  response are a seed ring, not a result; ForceAtlas2 now runs in the browser below
  2,000 nodes and `POST /network/layout` is enqueued above it, with no silent fallback.
- **A missing WebGL context crashed the page** into the error boundary with
  `Cannot read properties of null (reading 'blendFunc')`. Support is checked before
  construction and the page now explains the problem and points at Inspect → Table.
- **An analyst rename could vanish.** `DEMO_MODE` accepts `PATCH` and returns the
  original row, so a refetch legitimately carried the old title and the edit disappeared
  with no error. `reconcileNarrative` keeps the local title until the incoming
  `updated_at` is strictly newer, which is the same rule the real race needs when a
  recluster invalidation lands between the write and its visibility.

Also fixed: a nested `<button>` inside the drilldown KPI card, `Badge` not forwarding
refs to Radix `asChild` triggers, doubled `#` on hashtags the API already prefixes, and
the scrubber printing a bucket's own activity beside a cumulative canvas.

### Verified

- `pnpm verify` (gen:api:check + typecheck + lint + test) passes; 58 tests, zero `any`,
  zero lint warnings.
- Every route renders against `DEMO_MODE=1` with no console errors.
- Changing one filter creates only the query keys that read it and refetches **zero**
  existing queries.
- Backend killed mid-session → `ErrorState` with `code: network_error`; restarted →
  recovery without a reload.
- Initial JS **149 KB gzipped** against a 400 KB budget, with the Sigma/graphology stack
  code-split behind the graph route.
- Risk indicators stay unambiguous in grayscale: colour plus glyph plus text.

### Not done

- The ≥30fps-at-20,000-nodes target is unverified: the demo corpus has 155 nodes, and no
  fixture at that scale exists. Server-precomputed positions and in-place Sigma refresh
  are implemented for it, but the number itself has not been measured.
- No deployment, no auth system, no websockets, no light theme, no i18n — all Phase 6 or
  explicitly out of scope.

### Known constraint

`VITE_API_KEY` is inlined into the bundle by Vite. This is documented in the README as a
**local-only, capstone-scoped** decision; the production path is a reverse proxy
injecting `X-API-Key` server-side, which is Phase 6's.
