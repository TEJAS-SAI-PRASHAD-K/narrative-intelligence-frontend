# Demo script

Runs entirely against `DEMO_MODE=1`. No database, no Docker, no API key, no model
warm-up — so a live demo never depends on a network call succeeding on stage.

Total run time: about six minutes.

---

## Setup (do this before the room is watching)

Two terminals.

**1 — the backend, from the Phase 4 repo:**

```bash
DEMO_MODE=1 .venv/bin/uvicorn app.main:app --port 8001
```

Serves all 66 routes from fixtures. Ids are stable across restarts, so the links below
keep working.

**2 — the dashboard, from this repo:**

```bash
pnpm install && pnpm gen:api && pnpm dev
```

`.env.local` needs two lines:

```
VITE_API_BASE_URL=http://localhost:8001
VITE_API_KEY=demo-mode-needs-no-key
```

Check `http://localhost:8001/healthz` reports `"demo_mode": true` before you start.

---

## The seven-step analyst workflow

The demo project is **Election Integrity 2026 (demo)**, slug
`demo-election-integrity`. Every step below is one navigation.

### 1. Project → Overview

Open `/`. The picker shows API status, environment and `DEMO_MODE=1` as badges, then
redirects to the last-used project.

> "Every screen answers one of five questions: what is being said, who is saying it,
> who hosts it, how it spreads, and how it is being pushed artificially."

### 2. Overview — the shape of the corpus

`/p/demo-election-integrity/overview`

- Five KPIs in fixed order. **Click any `(?)`** — the definition is the backend's own
  string, not ours.
- Two stacked charts split by platform. **Drag the brush on either one**; both move.
  They share an x-axis on purpose.
- Right rail: high-risk posts, each with `reasons[]` chips saying *why* it was flagged.

> "Nothing on this page was computed in the browser. If a number is on screen, an
> endpoint served it."

### 3. Narrative-scoped mode

Pick a narrative in the top bar. KPIs rescope (1,400 posts → 149) and each card grows a
**Break down** button.

Click **Break down Posts** → the domain → channel hierarchy, expandable to
`r/Conservative`, `r/politics`, and so on.

Open the **Emotions** breakdown and point at the footer: *N scored, M unscored*.

> "Unscored posts are excluded from the shares, not counted as neutral. That footer is
> the difference between a measurement and a guess."

### 4. Narrative feed

`/p/demo-election-integrity/narratives`

- Freshness bar: *"Generated 48 days, 0 hrs ago"*, **Stale**, and **264 unclustered
  posts** — the number that makes staleness concrete.
- Each card: claim headline, `ID:`, AI pill, metadata, and the six-field scorecard.
- **Click the pencil and rename a narrative.** The pill flips to *Edited by analyst*.

> "Reclustering renumbers narratives. Update Now enqueues a job — it never refreshes
> the feed behind you, and an edit in flight survives the job landing."

### 5. Narrative detail + Compass Context

Open **#1001 — Voting machine vendor tied to foreign ownership**.

This is the centrepiece. In the Context paragraph, the citation markers sit **inline at
the sentences they support** — `…does not identify a county, and the[1] state election
office has not confirmed…`. Hover one for the publisher and snippet.

Then click **Why this score?** in the sticky sidebar: formula, normalisation, and each
component's `value × weight → contribution`.

> "Every number is one click from its decomposition. And where a signal was not
> measured, there is no bar at all — not a zero-length one."

*(In the kitchen sink there is a narrative with `missing: ["authenticity"]` showing the
renormalised-weights banner, if you want the stronger version of this point.)*

### 6. Drivers → cohorts → author

`/p/demo-election-integrity/drivers`

- 200 rows, virtualised. Risk values are a dot **plus a label**, never a bare float.
- **Click a row** → the author slide-over: scores, cohort chips marked *model* or
  *analyst*, and the **posting-hour histogram** — a flat 24-hour profile is the most
  human-readable coordination signal in the product.
- Right rail: emotion/sentiment donut with the dominant value called out.

### 7. Network graph

`/p/demo-election-integrity/network` → **Visualize**.

155 accounts, 2,600 edges, WebGL, coloured by community.

- **Legend** (bottom right) — each entry carries the backend's own definition. Open the
  one on *Co-posting similarity*: it says outright that it is not proof of coordination.
- **Click a bar in the timeline scrubber**, then press **play**. The graph accretes
  chronologically. The scrubber prints the bucket's own activity and the cumulative
  totals separately.

> "Play Mode filters a graph that is already loaded. It does not issue a request per
> frame."

### 8. Export

Back on the feed, **Export**. The dialog lists exactly which filters get baked into the
report before you queue it. Queue one and watch it appear in the job tray bottom-right,
poll, and finish.

---

## Two closing moves, if there is time

**Show the URL is the state.** Copy the address bar from any filtered view, open a new
tab, paste. Identical view, identical chips.

**Kill the backend.** `Ctrl-C` the uvicorn terminal and reload:

> *Could not load projects — Cannot reach the API at http://localhost:8001.
> code `network_error`.*

Restart it and press **Retry**. No white screen, no infinite spinner, and an error code
an analyst could put in a bug report.

---

## If something goes wrong on stage

| Symptom | Cause | Fix |
|---|---|---|
| Every panel shows `401 unauthorized` | `VITE_API_KEY` unset | Any non-empty value works in demo mode; restart `pnpm dev` |
| "No project with slug…" | Backend not in demo mode | `/healthz` should say `"demo_mode": true` |
| Graph draws a perfect circle | Stale build | Hard-reload; ForceAtlas2 runs on `layout: "client"` |
| Job tray never finishes a job | No Celery worker in demo mode | Expected — the tray shows the job as running; skip step 8 |

Fall back to `/kitchen-sink` for any component-level point: it needs no backend at all.
