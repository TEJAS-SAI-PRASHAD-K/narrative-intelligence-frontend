# Frontend architecture

One page. The four decisions that shape everything else, and where each is enforced.

---

## 1. State ownership

Decided once. Every screen follows it; nothing owns a copy of anything.

| Kind of state | Owner | Enforced by | Never |
|---|---|---|---|
| Filters, project, sort, cursor, selected narrative, chart shape | **URL search params** | `src/lib/useFilters.ts` is the only read/write path | React context, localStorage |
| Server data, cache, polling | **TanStack Query** | `src/api/queries/*` — every read is a hook | `useEffect` + `useState` fetching |
| Ephemeral UI (open panel, hovered node, lasso mode) | local `useState` | — | the URL |
| Column visibility, collapsed KPI strip, last project | `localStorage` | `src/lib/storage.ts`, `useLocalState` | the URL, the server |
| In-flight jobs | **Query cache + `JobStore`** | `src/jobs/JobStore.tsx` | scattered per-page polling |

`AppLayout` instantiates `useFilters` once so the top bar's platform and narrative
pickers write to the same query string the page below reads. The top bar owns nothing:
it is handed a `FilterSpec` and an `onChange`.

There is no filter context. A context may mirror the URL; it may never own it.

---

## 2. The `FilterSpec` ⇄ URL contract

`src/lib/filters.ts` is the single serializer. Nearly every Phase 4 list endpoint
accepts the same parameter set, so it is defined once and every query key derives from
it. Duplicating this per page is how the codebase rots.

```
project_id (from the route, not the query string)
date_from · date_to · tz=UTC
platform[] · narrative_id[] · cohort_id[] · author_group_id[]
sentiment[] · emotion[] · content_type[] · lang[]
min_toxicity · min_risk · is_anomalous · is_bot_like
q · include_shared=true
```

Paging and ordering (`sort`, `cursor`, `limit`) ride alongside as a separate
`ListSpec`: `/overview/kpis` rejects `cursor`, and the `sort` vocabulary differs per
route, so they are not part of the shared set.

**Invariants**, all covered by `filters.test.ts` (17 tests):

- `parseFilterSpec(toSearchParams(spec)) ≡ spec`. Paste a URL into a report; a
  colleague opens it and sees the identical view, chips included.
- Arrays and params are sorted, so two equal specs serialise byte-identically. This is
  what makes the query key stable.
- `is_anomalous=false` is a filter, not an absence. `min_toxicity=0` is a floor, not an
  absence. Both survive the round trip and both change the query key.
- Removing one value of a multi-value filter keeps the rest; removing the last clears
  the key entirely rather than leaving `[]`.
- Defaults (`tz=UTC`, `include_shared=true`) are written explicitly, so a pasted link
  stays unambiguous even if a default later changes.
- `tz` never renders as a removable chip — it belongs to the date control, which shows
  it next to the range at all times.

`toQueryParams` produces the object handed to `api.get`. Unset entries are dropped so
the backend sees an absent parameter rather than an empty one; arrays serialise as
repeated keys (`?platform=a&platform=b`), never CSV.

---

## 3. Query keys and invalidation

`src/api/keys.ts` is the one key factory. Keys are
`[domain, scope, filterIdentity, extras]`, where `filterIdentity` is
`filterKey(spec)` — the canonical, order-independent serialisation above.

Consequences that matter:

- `invalidateQueries({ queryKey: qk.narratives.all })` reaches every narrative query
  and nothing else.
- Changing one filter produces a new leaf key, so only the queries that actually read
  that filter refetch. Provable in the Query devtools; `window.__queryClient` is
  exposed in dev for the same purpose.
- `useGraph` strips the shared `narrative_id` filter and passes `/network/graph`'s own
  `narrative_id` parameter instead, so a top-bar narrative selection cannot silently
  re-scope the graph.

**Client defaults** (`src/api/queryClient.ts`):

- `staleTime: 30s`, `refetchOnWindowFocus: false`. Analyst sessions are long and the
  corpus only changes when a job runs, so job-driven invalidation beats polling.
- `networkMode: 'always'`. The default (`'online'`) parks queries as
  `fetchStatus: "paused"` when the browser reports offline, and a paused query never
  errors. For a localhost API that signal is meaningless in both directions.
- `network_error` is never retried. A backend that is not listening will not start
  within two seconds, and TanStack pauses retrying queries while the tab is hidden —
  which showed up as a blank screen with no error at all. Failing fast puts "cannot
  reach the API" on screen immediately.
- `401`/`403`/`404`/`contract_violation` are not retried either: none of them fix
  themselves, and retrying only delays the `ErrorState` the analyst needs.

---

## 4. The job lifecycle

**Nothing that returns `202` is treated as done.** A button that fires a `202` and then
pretends the data refreshed is a lie to the analyst.

```
  mutation ──▶ 202 JobAccepted {job_id, status_url, kind}
                    │
                    ▼
           JobStore.track(accepted)          ── row appears in <JobsSheet>
                    │
                    ▼
        GET /api/v1/jobs/{id}  ── 1s → 2s → 5s backoff
                    │
       ┌────────────┼─────────────┐
       ▼            ▼             ▼
   succeeded      failed      cancelled
       │            │             │
       │            └─ toast with error + request_id, row stays for inspection
       │
       └─ invalidate only the query families JOB_KIND_INVALIDATIONS maps for
          this job kind, + toast with a "view" link
```

`JOB_KIND_INVALIDATIONS` in `src/api/keys.ts` maps each `JobOut.kind` to the query
families it touched. A clustering run must not discard the domains cache and a domain
enrichment must not discard the narrative feed. An unmapped kind logs a warning and
invalidates nothing, rather than clearing the cache on a guess.

Routes that enqueue: `/ingest`, `/narratives/recluster`,
`/narratives/{id}/compass/regenerate`, `/network/layout`, `/domains/{d}/enrich`,
`/reports`.

**Optimistic writes and job invalidation can race.** The narrative feed is the case
that matters: a recluster finishing invalidates the feed while an analyst is mid-rename.
`useUpdateNarrative` writes optimistically and reconciles from the PATCH response
rather than from a refetch, and the feed tracks in-flight renames in `pendingRenames`
so the card keeps showing the analyst's text until the server confirms it.

---

## 5. The HTTP boundary

`src/api/client.ts` is the only place that talks to Phase 4.

- Base URL and `X-API-Key` from `import.meta.env`.
- The shared error envelope `{"error": {code, message, detail, request_id}}` is
  *parsed*, not assumed, into `ApiError`. FastAPI's own 422 shape is handled separately.
  `request_id` reaches the screen because a bug report has to be able to quote it.
- A fetch that throws (backend down, DNS, CORS) becomes
  `ApiError { code: 'network_error', status: 0 }` rather than an unhandled rejection.
- Zod guards the handful of invariants the UI cannot recover from. It deliberately does
  not restate the whole contract: `schema.d.ts` **is** the contract, and a second
  hand-written copy of 111 schemas is exactly the drift the generated types exist to
  prevent.

Types come from `pnpm gen:api` (`openapi-typescript openapi.json -o
src/api/schema.d.ts`). `pnpm gen:api:check` fails CI when they drift from the committed
contract. `src/api/types.ts` re-exports them under shorter names and adds nothing.

### Two score scales

The contract mixes them and the value alone cannot tell them apart:

- `0..1` — every model score (`bot_score`, `toxicity_score`, `coordination_score`,
  `bot_like_share`, and the six `NarrativeScorecard` signals).
- `0..100` — `AuthorOut.risk_score`, `DomainOut.risk_score`,
  `HighRiskPost.risk_score`, `NarrativeScorecard.fusion_score`.

`<ScoreCell>` takes a **required** `scale` prop so a new call site has to look the field
up rather than guess, and `riskLevel.ts` keeps `riskLevelFromScore` and
`riskLevelFrom100` separate. Pinned by `riskLevel.test.ts`. This was caught against
real data, where `risk_score: 33.2` rendered as `3320%`.

### `null` is not zero

`Metric.value`, `PostScores.toxicity`, `Engagement.views` and anything in
`NarrativeScorecard.missing[]` mean *not measured*. `src/lib/format.ts` returns the em
dash for all of them, `<NotMeasured>` attaches the reason, and chart series drop
unmeasured points (`connectNulls={false}`) rather than plotting them at zero. A gap
means "we do not know"; a dip to zero means "nothing happened", and only one of those
is honest.

---

## 6. The shell and the page frame

Every screen renders inside one frame, and the frame is defined once.

**Navigation** lives in `src/layout/navItems.ts`, not in the sidebar's JSX. The rail it
replaced linked 8 of the app's 18 routes -- cohorts, domains, alerts and the key
manager were reachable only by typing a URL, and nothing failed because nothing was
checking. `navItems.test.ts` is that check: a route in `App.tsx` must appear in
`NAV_SECTIONS` or in `NON_NAV_ROUTES` with a written reason, and neither list may name a
route that no longer exists.

The grouping follows the five questions in `docs/demo.md`: **Investigate** (narratives,
drivers, cohorts, domains, network), **Produce** (curate, reports, alerts),
**System** (sources, jobs, keys), with Overview above them as the landing screen.

`<Sidebar>` is 224px labelled or 56px icon-only, toggled by an explicit control and
remembered in `localStorage`. **Width never changes on hover.** The old rail widened on
`:hover`, and because it was a flex child the entire page slid sideways under the
pointer. Below `lg` the same nav renders in a sheet.

**`<PageShell>`** (`src/components/page/`) fixes the header order for every route:

```
breadcrumb → title + meta → description → actions
─────────────────────────────────────────────────
filter bar   (sticky, optional)
body
```

`description` is required. It is the one sentence saying what question the screen
answers, and it is why a stranger can open any route and know where they are. Before it
existed, `h1` was `text-sm` -- the same size and weight as body text -- and sat above the
filter bar on five routes and below it on six.

**Spacing and type.** One gutter (`PAGE_GUTTER`, `px-4 lg:px-6`), so headings, filters
and content share a left edge with the sidebar. Vertical rhythm on 8px: `space-y-6`
between sections, `space-y-3` inside a card. Three type levels and no more: page title
`text-xl/600`, section heading `text-2xs` uppercase muted, body `text-xs`.

**Filters have one home.** Platform and narrative used to be dropdowns in the top bar,
which put a Platform picker on the API keys page where it filtered nothing. They now sit
in `<AdvancedFilters>` with every other filter; the top bar shows what is *in force*, as
removable chips derived from `activeChips(spec)`.

**Nothing floats over content.** The job tray was fixed to the bottom-right corner and
covered the network legend and table footers. It is now a sheet opened from the
sidebar's Jobs item, which carries a live count of running jobs.

**Failures are addressed to the analyst.** `explainError()` translates the API's
`error.code` into what happened, what it means and what to do; the backend's own message
and the `code`/`status`/`request_id` line move into `<TechnicalDetails>`, still
selectable. A code with no translation falls through to the backend's message, because a
generic sentence would be less informative than the real one. Pinned by
`explainError.test.ts`.
