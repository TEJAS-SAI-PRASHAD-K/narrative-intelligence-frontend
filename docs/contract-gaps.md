# Contract gaps and observations

Phase 5 does not change the backend. Anything the UI needed and could not get from a
documented route, and anything where the live response differed from what the notes
implied, is written down here instead of being worked around silently.

Each entry says what was observed, what the UI does now, and what Phase 4 would need
to change for the workaround to go away.

Entries are numbered in one continuous sequence (observations 1-6, gaps 7-10); code
comments reference them as `contract-gaps #N`.

---

## Observations — live responses that differed from the written notes

### 1. Hashtags arrive already prefixed with `#`

**Observed.** `ConceptItem.term` for `kind: "hashtag"` and `PostOut.hashtags[]` both
return values that already begin with `#` (`"#stopthecount"`), and
`NarrativeSummary.top_hashtags[]` does the same.

**UI behaviour.** Components prepend `#` only when the value does not already start
with one. Rendering was showing `##stopthecount` before this was caught.

**Phase 4 action.** None required — this is a display concern. Worth documenting the
convention in the schema description so the next consumer does not guess.

### 2. Compass citation spans are not word-aligned

**Observed.** `Citation.char_start` / `char_end` are character-accurate but land
mid-word, e.g. a span ending at index 245 inside `"...as unverified"` cuts after
`unver`. This appears to be a character-budget truncation rather than a semantic
boundary.

**UI behaviour.** `segmentContext` widens each span outward to the enclosing word for
rendering only (`snapToWords` in `src/components/compass/citations.ts`). The
adjustment is at most one partial word at each end, cannot move a citation to a
different sentence, and never rewrites the underlying data. Without it the superscript
marker renders inside a word and reads as a bug.

**Phase 4 action.** Optional. If spans were snapped to token boundaries server-side,
the frontend adjustment could be deleted.

### 3. Two score scales, indistinguishable from the value

**Observed.** Most scores are `0..1` (`bot_score`, `anomalous_score`,
`toxicity_score`, `coordination_score`, `bot_like_share`, and the six
`NarrativeScorecard` signals). Three are `0..100`: `AuthorOut.risk_score`,
`DomainOut.risk_score` and `NarrativeScorecard.fusion_score`.
`HighRiskPost.risk_score` declares no range but returns `96.2`, so it is `0..100`
too. `AuthorScoreExplanation.risk_score` likewise declares no range and shares
`AuthorOut`'s scale.

**UI behaviour.** `ScoreCell` takes a required `scale` prop (`"unit"` or
`"hundred"`), so a new call site has to look the field up in the contract rather
than guess. `riskLevel.ts` exposes `riskLevelFromScore` and `riskLevelFrom100`
separately and never infers the scale from the value — on a `0..100` scale, `0.4`
is a very low risk, not a medium one. Guarded by `riskLevel.test.ts`.

This was caught only by running against real data: `risk_score: 33.2` rendered as
`3320%`.

**Phase 4 action.** Declare `minimum`/`maximum` on `HighRiskPost.risk_score` and
`AuthorScoreExplanation.risk_score` so the scale is discoverable from the schema
rather than from a sample response.

### 4. `GraphResponse.layout` decides who positions the nodes

**Observed.** `layout` is documented as "Layout algorithm, or `'client'` when small
enough to lay out live". With `layout: "client"` the response still carries `x`/`y`,
but they are a seed ring, not a result — rendering them as given draws a perfect
circle that looks like structure and encodes none.

**UI behaviour.** `buildGraph` treats `layout === "client"` as "needs layout" even
when coordinates are present, and runs ForceAtlas2 in the browser seeded from those
coordinates — but only below `CLIENT_LAYOUT_MAX_NODES` (2,000). Above that it enqueues
`POST /network/layout` and waits, with the job in the tray. There is no silent
fallback: a ForceAtlas2 pass over 20,000 nodes locks the main thread long enough to be
indistinguishable from a crash.

**Phase 4 action.** None required.

### 5. WebGL cannot read the app's colour tokens

**Observed.** Not a contract issue, recorded because it is the kind of failure that
looks like a data problem. Sigma parses colours with its own parser, which accepts hex
and `rgb()`/`rgba()` but not the space-separated `hsl(H S% L% / A)` form the design
tokens use. Anything it cannot parse renders black — the first working graph drew as
a solid dark disc.

**UI behaviour.** `src/lib/tokens.ts` resolves a token against the live computed style
and converts it to `rgba()`, cached per token and alpha, with a visible grey fallback
so a bad token name reads as "wrong colour" rather than "node missing". Pinned by
`tokens.test.ts`.

### 6. `DEMO_MODE=1` ignores write bodies

**Observed.** `PATCH /narratives/{id}` under `DEMO_MODE=1` returns `200` with the
original fixture row: the new title is not applied and `edited_by_user` stays `false`.
The same holds for the other mutations — demo mode is a read-only fixture layer that
answers every route with schema-valid data.

**UI behaviour.** The rename path treats "accepted but not reflected" as its own state
rather than as success. `reconcileNarrative` keeps the analyst's text whenever the
incoming row's `updated_at` is not strictly newer than the one the edit was based on,
the feed holds the pending title until the server actually serves it, and a toast says
the write is not yet visible. Against a real backend the write lands, the timestamp
advances, and the override releases on the next refetch.

This also covers the real-world version of the same race: a read replica, or a
recluster job's invalidation arriving between the `PATCH` and its visibility. Pinned by
`src/api/reconcile.test.ts`.

**Phase 4 action.** None required for demo mode. Worth stating in the demo-mode docs
that writes are accepted and discarded, so the next consumer does not read the revert
as a frontend bug.

---

## Gaps — data a screen wanted and no route provides

### 7. No route resolves a cohort id to a name outside a list response

**Wanted.** The filter bar renders a removable chip per active filter. For
`cohort_id`, `narrative_id` and `author_group_id` the chip should read
`Cohort: Verified journalists`, not `Cohort: 7f3a…`.

**Available.** `GET /cohorts`, `GET /narratives` and `GET /author-groups` return names
only as part of a filtered list; there is no `GET /cohorts/{id}` and no bulk
`?ids=` lookup.

**UI behaviour.** `FilterBar` accepts a `resolveChipLabel` callback, and pages that
already hold the relevant list pass a lookup into it. Pages that do not hold the list
render the raw id. No extra request is issued purely to decorate a chip.

**Phase 4 action.** A `GET /cohorts/{id}` (and equivalents), or an `ids` filter on the
existing list routes, would let every chip render a name on every page.

### 8. `GET /drivers/*` returns no pagination cursor

**Wanted.** The drivers tables are the densest lists in the product and an analyst
will want more than one page of them.

**Available.** `DriversResponse` is `{definition, entity_type, items}` — no
`next_cursor` and no `total`, even though the route accepts `cursor` and `limit`.

**UI behaviour.** The drivers tables request a single page at `limit=200` (the contract
maximum) and say so in the table footer rather than implying the list is complete.
No client-side paging is faked.

**Phase 4 action.** Return the standard `PageResponse` envelope from
`/drivers/authors|hashtags|urls`.

### 9. No route lists an author's cohorts or narratives by id

**Wanted.** The author slide-over shows cohort chips and the narratives an author
touched.

**Available.** `AuthorOut` carries `cohorts[]` (as `CohortMembership`, which includes
the name) and `narratives_touched[]` (ids only).

**UI behaviour.** Cohort chips render from the embedded `CohortMembership.name`.
Narrative ids render as links to the narrative detail route, labelled by id, because
resolving each to a title would take one request per narrative.

**Phase 4 action.** Include narrative titles alongside ids, as `ComparisonOut` already
does with `narrative_titles`.

### 10. No route reports the current key's scopes

**Wanted.** Phase 5's brief asks for "scopes reflected in disabled controls" — a
read-only key should see **Update Now**, **Regenerate** and **Export** greyed out rather
than discovering the limit by clicking.

**Available.** Nothing. There is no `/me`, `/whoami` or token-introspection route, and
`GET /keys` requires the `admin` scope, so a `read`-only key cannot enumerate its own
permissions. A client can only learn its scopes by attempting an action and reading the
`403`.

**UI behaviour.** Mutating controls stay enabled and a missing scope surfaces on use.
`ErrorState` renders the backend's own message verbatim — it already names the scopes
held and the scope required (*"This API key has scopes ['read', 'write'] and needs
'admin'"*) — alongside the `code` and `request_id`. Nothing is pre-disabled on a guess,
because guessing wrong in the permissive direction is confusing and guessing wrong in
the restrictive direction hides functionality the analyst actually has.

**Phase 4 action.** A `GET /keys/self` returning `{prefix, scopes}` for the presented
key would make the requirement implementable in about ten lines.
