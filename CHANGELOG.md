# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Telegram as a platform.** `openapi.json` and `src/api/schema.d.ts` now include the
  `telegram` source. A Telegram post shows views and forwards as engagement (reactions
  and forwards are labelled as Telegram names them), and a counter the channel does not
  expose, such as hidden reactions, renders as not measured. `/kitchen-sink` has Telegram
  posts.

### Changed

- **The misinfo model comes from `model_versions`.** Contract sync adds
  `PostScores.model_versions`, a map of module name to version stamp. `misinfoModelOf` reads
  it first. A `laya` key on a Hindi post means Laya. A `misinfo` key means the English model.
  The code compares keys and never parses the stamp values. The old `laya=` parse of
  `scoring_version` runs only when `model_versions` is null or absent. A map that exists
  without a `laya` key means Laya did not run, so the code does not read the stamp then.
  A post with neither key keeps the English default. `hasLayaStamp` now takes the scores
  object. The `OriginalPost` fixture carries a `model_versions` map.

- **Platform lists follow the contract.** `pnpm gen:api` also writes `src/api/sources.ts`
  from the `source` enum in `openapi.json`. The advanced filters and the network entry
  page read that list instead of keeping their own copies, so a new source needs no edit.
- **Write controls follow the key's scopes.** The app reads `GET /keys/me` once per
  session and disables **Update Now**, **Regenerate** and **Export** for a key without the
  `write` scope, with a tooltip naming the missing scope. While the lookup loads or if it
  fails the controls stay enabled and the server decides. Closes contract gap 10.
- **Contract sync for `GET /keys/me`.** `openapi.json` and `src/api/schema.d.ts` carry the
  new route and the `ApiKeySelf` schema.
- **The author slide-over and page list the author's cohorts and narratives.** Both
  load from `GET /authors/{author_id}/cohorts` and `/narratives`, page with "Load more",
  and have empty and error states. Narratives link to their detail page by title.
  Closes contract gap 9. `AuthorPanel` now takes a `projectId` prop.
- **CI workflow.** `.github/workflows/ci.yml` runs install (frozen lockfile), lint, test,
  build and `gen:api:check` on pull requests and on `main`, so contract drift fails the
  check. Node is pinned in `.nvmrc` (22) and pnpm through `packageManager`.

### Changed

- **The scorecard and the authors KPI show the coordination input to fusion.** Contract
  sync adds `NarrativeScorecard.coordinated_author_ratio` and
  `AuthorsBreakdown.coordinated_author_ratio`. `RiskScorecard` gains a Coordinated Authors
  field and the authors drilldown gains a Coordinated authors metric (unit `ratio` renders
  as a percentage). A null value renders `NotMeasured`. Bot-Like stays, with a note that
  fusion does not use it.
- **Drivers tables page through `next_cursor`.** `useDrivers` is an infinite query and
  `EntityTable` takes a `pagination` prop that renders a "Load more" footer with the row
  count and, when the backend counted, the total. The cursor stays out of the URL, so a
  shared link starts at page one. Closes contract-gaps #8; `openapi.json` and
  `src/api/schema.d.ts` carry `next_cursor`, `total` and `filters_applied` on
  `DriversResponse`.
- **Filter chips show names.** `cohort_id`, `narrative_id` and `author_group_id` chips
  resolve through `GET /cohorts/{id}`, `GET /narratives/{id}` and
  `GET /author-groups/{id}`, cached per id, in both the filter bar and the top bar. While
  loading, on a 404 or on any other failure the chip shows the short id and its title says
  why. `FilterBar` no longer takes `resolveChipLabel` (contract-gaps #7 is closed).
- **Contract sync for name lookups.** `openapi.json` and `src/api/schema.d.ts` add
  `GET /cohorts/{cohort_id}`, `GET /author-groups/{group_id}` and the `NamedRef` schema.

- **Contract sync for score ranges.** `HighRiskPost.risk_score` and
  `AuthorScoreExplanation.risk_score` now declare `0..100`, and `GraphNode.bot_score`
  and `DomainOut.sharing_author_bot_ratio` declare `0..1`, in `openapi.json`.
- **`ScoreCell` scales are checked against the schema.** `scoreScale.contract.test.ts`
  maps every call site to the field it renders and fails when `"hundred"` is not on a
  `0..100` field or `"unit"` on a `0..1` one, or when a new call site is not listed.
- **Hindi misinfo values name the model.** The post chip reads "Misinfo (Laya, title only)" for a
  Hindi post whose `model_versions` map has a `laya` key, with a tooltip saying the value is a
  separate model's rank within Hindi and not comparable with English. The language coverage panel
  notes that the misinfo figures combine two models when Hindi and English both have scored
  values.
- **Skipped scores read as sentences.** The "signals skipped" tooltip on a post maps
  `module:reason` codes to short sentences (`src/lib/skipReasons.ts`), including
  `fact_check_publisher`, which explains why a fact-checker's article has no misinfo
  score. A code with no entry is shown as itself.
- **Contract sync for unmeasured engagement.** The backend now sends `null` where no
  platform measured engagement, not `0`. `openapi.json` and `src/api/schema.d.ts` carry
  the new nullable fields: `TimeseriesPoint.value`, the `TimeseriesPoint.series` values,
  `AuthorTimelinePoint.engagement`, `TimelinePoint.engagement` and
  `NarrativeSummary.engagement_total`.
- **Unmeasured engagement is a gap, never zero.** Timeseries and narrative timeline
  charts leave a null point as a gap. In grouped mode a missing series key and a null
  value are both gaps. A chart where every engagement point is null shows "No platform in
  this view measures engagement." and draws no line.
- **Counts that can be null show an em dash.** The narrative card, the narrative detail
  stats, the drivers table and the author timeline use `MeasuredCount`. Its hover and
  screen-reader text read "Not measured".
- **Isolated points keep a dot.** A measured point between two gaps draws a small dot,
  so real data does not look absent.
- **`NotMeasured` is reachable by keyboard.** The dash is hidden from screen readers and
  the reason is read as text.

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

### Known gap

- **Scopes are not reflected in disabled controls**, which Phase 5's brief asks for. The
  contract exposes no way for a client to read its own key's scopes — there is no
  introspection route and `GET /keys` itself needs `admin` — so a missing scope surfaces
  on use instead, as an `ErrorState` quoting the backend's message naming the scopes held
  and the scope required. Recorded as `docs/contract-gaps.md` #10.

### Known constraint

`VITE_API_KEY` is inlined into the bundle by Vite. This is documented in the README as a
**local-only, capstone-scoped** decision; the production path is a reverse proxy
injecting `X-API-Key` server-side, which is Phase 6's.
