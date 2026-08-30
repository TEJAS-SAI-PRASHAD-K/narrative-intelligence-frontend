# Screenshots

Captured against a `DEMO_MODE=1` backend on port 8001, at 1600px wide, with headless
Chrome. Reproduce with the commands in `docs/demo.md`.

| File | Workflow step |
|---|---|
| `01-project-picker.png` | 1 — project picker, with API status and `DEMO_MODE` badges |
| `02-overview.png` | 2 — KPI strip, the two synced charts, high-risk rail |
| `03-narrative-feed.png` | 4 — feed with the freshness bar and six-field scorecards |
| `04-narrative-detail-compass.png` | 5 — **Compass Context with inline citations at their spans** |
| `05-drivers.png` | 6 — drivers table, insights donut |
| `06-cohorts.png` | 6 — cohorts directory with the methodology disclaimer |
| `07-network-graph.png` | 7 — WebGL graph, legend, timeline scrubber, stats footer |
| `08-domains.png` | domain risk, with `unavailable` rendered as "Not enriched" |
| `09-sources.png` | pipeline health and ingest runs |
| `10-kitchen-sink.png` | every primitive in every state, no backend involved |
| `11-graph-no-webgl-fallback.png` | the graph on a machine with no WebGL context |

`07` needs a WebGL context. Headless Chrome supplies one with
`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`; without it the
page renders `11` instead, which is the intended fallback rather than a crash.
