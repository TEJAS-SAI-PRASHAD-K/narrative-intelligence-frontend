import { filterKey, type FilterSpec, type ListSpec } from '@/lib/filters';

/**
 * One query-key factory. Keys are `[domain, scope, filterIdentity, extras]`, so
 * `invalidateQueries({ queryKey: qk.narratives.all })` reaches every narrative query
 * and nothing else, while a filter change produces a new leaf key and refetches only
 * the queries that actually read that filter.
 */

function listPart(list?: ListSpec): Record<string, unknown> {
  return { sort: list?.sort, limit: list?.limit };
}

export const qk = {
  health: ['health'] as const,
  readiness: ['readiness'] as const,

  projects: {
    all: ['projects'] as const,
    list: () => ['projects', 'list'] as const,
    detail: (projectId: string) => ['projects', 'detail', projectId] as const,
    sources: (projectId: string) => ['projects', 'sources', projectId] as const,
  },

  overview: {
    all: ['overview'] as const,
    kpis: (f: FilterSpec) => ['overview', 'kpis', filterKey(f)] as const,
    kpiDrilldown: (slice: string, f: FilterSpec) =>
      ['overview', 'kpis', slice, filterKey(f)] as const,
    timeseries: (f: FilterSpec, opts: Record<string, unknown>) =>
      ['overview', 'timeseries', filterKey(f), opts] as const,
    concepts: (f: FilterSpec) => ['overview', 'concepts', filterKey(f)] as const,
    highRiskPosts: (f: FilterSpec, list?: ListSpec) =>
      ['overview', 'high-risk-posts', filterKey(f), listPart(list)] as const,
  },

  narratives: {
    all: ['narratives'] as const,
    list: (f: FilterSpec, list?: ListSpec) =>
      ['narratives', 'list', filterKey(f), listPart(list)] as const,
    detail: (id: string) => ['narratives', 'detail', id] as const,
    score: (id: string) => ['narratives', 'score', id] as const,
    timeline: (id: string, opts: Record<string, unknown>) =>
      ['narratives', 'timeline', id, opts] as const,
    cohorts: (id: string) => ['narratives', 'cohorts', id] as const,
    posts: (id: string, f: FilterSpec, list?: ListSpec) =>
      ['narratives', 'posts', id, filterKey(f), listPart(list)] as const,
    authors: (id: string, f: FilterSpec, list?: ListSpec) =>
      ['narratives', 'authors', id, filterKey(f), listPart(list)] as const,
    freshness: (projectId: string) => ['narratives', 'freshness', projectId] as const,
    compass: (id: string) => ['narratives', 'compass', id] as const,
  },

  posts: {
    all: ['posts'] as const,
    list: (f: FilterSpec, list?: ListSpec) =>
      ['posts', 'list', filterKey(f), listPart(list)] as const,
    detail: (id: string) => ['posts', 'detail', id] as const,
    thread: (id: string) => ['posts', 'thread', id] as const,
    similar: (body: Record<string, unknown>) => ['posts', 'similar', body] as const,
  },

  authors: {
    all: ['authors'] as const,
    list: (f: FilterSpec, list?: ListSpec) =>
      ['authors', 'list', filterKey(f), listPart(list)] as const,
    detail: (id: string) => ['authors', 'detail', id] as const,
    score: (id: string) => ['authors', 'score', id] as const,
    timeline: (id: string, opts: Record<string, unknown>) =>
      ['authors', 'timeline', id, opts] as const,
    posts: (id: string, list?: ListSpec) => ['authors', 'posts', id, listPart(list)] as const,
    groups: (projectId: string) => ['authors', 'groups', projectId] as const,
  },

  cohorts: {
    all: ['cohorts'] as const,
    list: (f: FilterSpec, list?: ListSpec) =>
      ['cohorts', 'list', filterKey(f), listPart(list)] as const,
    authors: (cohortId: string, list?: ListSpec) =>
      ['cohorts', 'authors', cohortId, listPart(list)] as const,
  },

  drivers: {
    all: ['drivers'] as const,
    list: (kind: 'authors' | 'hashtags' | 'urls', f: FilterSpec, list?: ListSpec) =>
      ['drivers', kind, filterKey(f), listPart(list)] as const,
  },

  domains: {
    all: ['domains'] as const,
    list: (f: FilterSpec, list?: ListSpec) =>
      ['domains', 'list', filterKey(f), listPart(list)] as const,
    detail: (domain: string, projectId: string) =>
      ['domains', 'detail', domain, projectId] as const,
    narratives: (domain: string, projectId: string) =>
      ['domains', 'narratives', domain, projectId] as const,
  },

  network: {
    all: ['network'] as const,
    graph: (f: FilterSpec, opts: Record<string, unknown>) =>
      ['network', 'graph', filterKey(f), opts] as const,
    comparisons: (projectId: string, list?: ListSpec) =>
      ['network', 'comparisons', projectId, listPart(list)] as const,
    comparison: (id: string) => ['network', 'comparison', id] as const,
  },

  jobs: {
    all: ['jobs'] as const,
    list: (params: Record<string, unknown>) => ['jobs', 'list', params] as const,
    detail: (id: string) => ['jobs', 'detail', id] as const,
  },

  media: {
    all: ['media'] as const,
    list: (list?: ListSpec) => ['media', 'list', listPart(list)] as const,
    check: (jobId: string) => ['media', 'check', jobId] as const,
  },

  reports: {
    all: ['reports'] as const,
    list: (projectId: string, list?: ListSpec) =>
      ['reports', 'list', projectId, listPart(list)] as const,
  },

  alerts: {
    all: ['alerts'] as const,
    list: (projectId: string, acknowledged: boolean | undefined, list?: ListSpec) =>
      ['alerts', 'list', projectId, acknowledged, listPart(list)] as const,
    rules: (projectId: string, list?: ListSpec) =>
      ['alerts', 'rules', projectId, listPart(list)] as const,
  },

  ingest: {
    all: ['ingest'] as const,
    runs: (projectId: string | undefined, list?: ListSpec) =>
      ['ingest', 'runs', projectId, listPart(list)] as const,
    run: (runId: string) => ['ingest', 'run', runId] as const,
  },

  keys: {
    all: ['keys'] as const,
    list: () => ['keys', 'list'] as const,
  },
} as const;

/**
 * Which query families a finished job invalidates. Keyed by `JobOut.kind` so the tray
 * refreshes exactly what the job touched -- a clustering run must not blow away the
 * domains cache, and a domain enrichment must not discard the narrative feed.
 */
export const JOB_KIND_INVALIDATIONS: Record<string, readonly (readonly string[])[]> = {
  'ingest.fetch': [qk.ingest.all, qk.projects.all],
  'ingest.load': [qk.ingest.all, qk.projects.all, qk.posts.all, qk.overview.all],
  'nlp.embed': [qk.posts.all],
  'nlp.cluster': [qk.narratives.all, qk.overview.all],
  'nlp.summarize': [qk.narratives.all],
  'score.posts': [qk.posts.all, qk.overview.all],
  'score.authors': [qk.authors.all, qk.drivers.all],
  'score.fusion': [qk.narratives.all, qk.overview.all],
  'graph.build_edges': [qk.network.all],
  'graph.communities': [qk.network.all, qk.authors.all],
  'graph.layout': [qk.network.all],
  'compass.generate': [qk.narratives.all],
  'domain.enrich': [qk.domains.all],
  'media.deepfake': [qk.media.all],
  'alerts.evaluate': [qk.alerts.all],
  'reports.render': [qk.reports.all],
  'maint.purge_uploads': [qk.media.all],
};
