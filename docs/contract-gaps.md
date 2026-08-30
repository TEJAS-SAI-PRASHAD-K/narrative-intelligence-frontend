# Contract gaps and observations

Phase 5 does not change the backend. Anything the UI needed and could not get from a
documented route, and anything where the live response differed from what the notes
implied, is written down here instead of being worked around silently.

Each entry says what was observed, what the UI does now, and what Phase 4 would need
to change for the workaround to go away.

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

---

## Gaps — data a screen wanted and no route provides

### 3. No route resolves a cohort id to a name outside a list response

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

### 4. `GET /drivers/*` returns no pagination cursor

**Wanted.** The drivers tables are the densest lists in the product and an analyst
will want more than one page of them.

**Available.** `DriversResponse` is `{definition, entity_type, items}` — no
`next_cursor` and no `total`, even though the route accepts `cursor` and `limit`.

**UI behaviour.** The drivers tables request a single page at `limit=200` (the contract
maximum) and say so in the table footer rather than implying the list is complete.
No client-side paging is faked.

**Phase 4 action.** Return the standard `PageResponse` envelope from
`/drivers/authors|hashtags|urls`.

### 5. No route lists an author's cohorts or narratives by id

**Wanted.** The author slide-over shows cohort chips and the narratives an author
touched.

**Available.** `AuthorOut` carries `cohorts[]` (as `CohortMembership`, which includes
the name) and `narratives_touched[]` (ids only).

**UI behaviour.** Cohort chips render from the embedded `CohortMembership.name`.
Narrative ids render as links to the narrative detail route, labelled by id, because
resolving each to a title would take one request per narrative.

**Phase 4 action.** Include narrative titles alongside ids, as `ComparisonOut` already
does with `narrative_titles`.

### 6. `GET /media/checks` is not project-scoped

**Observed.** Every other list route requires `project_id`. `/media/checks` accepts
only `cursor` and `limit`, so the media history is global rather than per project.

**UI behaviour.** The media page states that the history is account-wide, so an
analyst does not read another project's checks as belonging to this one.

**Phase 4 action.** Add an optional `project_id` filter.
