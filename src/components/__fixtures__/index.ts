/**
 * The only sanctioned literal data in `src/`.
 *
 * These exist for the kitchen sink so every primitive can be shown in states a live
 * backend rarely produces on demand -- a metric with `value: null`, a scorecard with
 * `missing: ["authenticity"]`, an AI block whose text an analyst has edited, a
 * truncated graph. They are typed off `schema.d.ts`, so the day Phase 4 renames a
 * field these stop compiling instead of drifting quietly.
 *
 * They are never imported by a page. Pages read the API; DEMO_MODE=1 is the mock layer.
 */
import type {
  AiProvenance,
  CompassContext,
  GraphStats,
  KpiBundle,
  LanguageCoverage,
  Metric,
  NarrativeFreshness,
  NarrativeScorecard,
  NarrativeScoreExplanation,
  PostOut,
} from '@/api/types';

export const metricMeasured: Metric = {
  value: 128_403,
  label: 'Posts',
  definition:
    'Count of posts in the corpus matching the active filters, deduplicated by native id.',
  unit: 'count',
  nullable_fields: [],
  sample_size: 128_403,
  delta_pct: 12.4,
};

/** The case the whole null contract exists for. */
export const metricNull: Metric = {
  value: null,
  label: 'Engagements',
  definition:
    'Sum of likes, shares and replies across matching posts. Views are excluded because not every platform reports them.',
  unit: 'count',
  nullable_fields: ['views', 'shares'],
  sample_size: null,
  delta_pct: null,
};

export const metricNoDelta: Metric = {
  value: 3_291,
  label: 'Authors',
  definition: 'Distinct authors who wrote at least one matching post.',
  unit: 'count',
  nullable_fields: [],
  sample_size: 3_291,
  delta_pct: null,
};

/**
 * A mixed corpus: English fully scored, Hindi scored only by the multilingual modules,
 * a language with no coverage at all, and records with no language.
 */
export const languageCoverage: LanguageCoverage[] = [
  {
    lang: 'en',
    total: 716,
    scored: { toxicity: 716, anomaly: 716, misinfo: 716, stance: 716, sentiment: 716, emotion: 716 },
  },
  {
    lang: 'hi',
    total: 233,
    scored: { toxicity: 0, anomaly: 233, misinfo: 233, stance: 0, sentiment: 0, emotion: 0 },
  },
  {
    lang: 'te',
    total: 4,
    scored: { toxicity: 0, anomaly: 4, misinfo: 0, stance: 0, sentiment: 0, emotion: 0 },
  },
  {
    lang: null,
    total: 1,
    scored: { toxicity: 0, anomaly: 1, misinfo: 0, stance: 0, sentiment: 0, emotion: 0 },
  },
];

export const kpiBundle: KpiBundle = {
  posts: metricMeasured,
  engagements: metricNull,
  authors: metricNoDelta,
  sentiment: {
    value: -0.42,
    label: 'Sentiment',
    definition: 'Mean sentiment score over scored posts, from -1 (negative) to +1 (positive).',
    unit: 'score',
    nullable_fields: ['sentiment_score'],
    sample_size: 96_120,
    delta_pct: -8.1,
  },
  emotions: {
    value: 16.5,
    label: 'Emotions',
    definition: 'Share of scored posts carrying the dominant emotion for this window.',
    unit: '%',
    nullable_fields: ['emotion'],
    sample_size: 96_120,
    delta_pct: 2.2,
  },
  window_start: '2026-06-01T00:00:00Z',
  window_end: '2026-08-30T00:00:00Z',
  tz: 'UTC',
  comparison_window: '2026-03-03 – 2026-06-01',
  language_coverage: languageCoverage,
};

export const scorecardComplete: NarrativeScorecard = {
  priority: 'high',
  bot_like: 0.71,
  anomalous: 0.63,
  toxicity: 0.48,
  compass_risk: 'high',
  negative_sentiment: 0.82,
  fusion_score: 78.4,
  scoring_version: 'fusion-v1.3',
  computed_at: '2026-08-29T09:12:00Z',
  missing: [],
};

/** Renders "—" for authenticity, never 0. */
export const scorecardMissing: NarrativeScorecard = {
  priority: 'medium',
  bot_like: null,
  anomalous: 0.31,
  toxicity: null,
  compass_risk: null,
  negative_sentiment: 0.55,
  fusion_score: 41.2,
  scoring_version: 'fusion-v1.3',
  computed_at: '2026-08-29T09:12:00Z',
  missing: ['authenticity', 'bot_like', 'toxicity'],
};

export const scoreExplanationRenormalized: NarrativeScoreExplanation = {
  narrative_id: 'nar-demo-1',
  fusion_score: 41.2,
  priority: 'medium',
  scoring_version: 'fusion-v1.3',
  formula:
    'fusion = 100 * Σ(wᵢ · normalise(sᵢ)) for every measured signal sᵢ, with weights renormalised over the measured subset',
  normalization: 'Each signal is min-max normalised to [0,1] over the project corpus before weighting.',
  components: [
    {
      name: 'negative_sentiment',
      value: 0.55,
      weight: 0.3,
      contribution: 0.165,
      definition: 'Share of the narrative’s posts scored negative, weighted by engagement.',
      inputs: { scored_posts: 812, negative_posts: 447 },
    },
    {
      name: 'anomalous',
      value: 0.31,
      weight: 0.25,
      contribution: 0.0775,
      definition: 'Mean anomaly score over posts, from the isolation-forest detector.',
      inputs: { scored_posts: 812 },
    },
    {
      name: 'bot_like',
      value: null,
      weight: 0.25,
      contribution: null,
      definition: 'Share of the narrative’s authors flagged bot-like by the XGBoost classifier.',
      inputs: { reason: 'no author scores available for this clustering run' },
    },
    {
      name: 'authenticity',
      value: null,
      weight: 0.2,
      contribution: null,
      definition: 'Inverse of the coordination signal derived from the co-post similarity graph.',
      inputs: { reason: 'graph edges not built for this window' },
    },
  ],
  missing: ['bot_like', 'authenticity'],
  weights_renormalized: true,
  computed_at: '2026-08-29T09:12:00Z',
};

export const provenanceAi: AiProvenance = {
  generated_by: 'ai',
  model: 'claude-opus-5',
  generated_at: '2026-08-28T14:02:00Z',
  prompt_version: 'narrative-summary-v4',
  edited_by_user: false,
};

export const provenanceEdited: AiProvenance = {
  ...provenanceAi,
  edited_by_user: true,
};

export const provenanceHeuristic: AiProvenance = {
  generated_by: 'heuristic',
  model: null,
  generated_at: '2026-08-28T14:02:00Z',
  prompt_version: null,
  edited_by_user: false,
};

export const freshnessStale: NarrativeFreshness = {
  project_id: 'proj-demo',
  status: 'stale',
  age_human: '48 days, 0 hrs ago',
  age_seconds: 4_147_200,
  last_run_at: '2026-07-13T06:00:00Z',
  last_run_id: 'run-8812',
  algorithm: 'hdbscan',
  embedding_model: 'all-MiniLM-L6-v2',
  narrative_count: 21,
  post_count: 4_128,
  unclustered_post_count: 917,
};

export const postWithNullViews: PostOut = {
  id: 'post-demo-1',
  project_id: 'proj-demo',
  native_id: 't3_1abcdef',
  source: 'reddit',
  source_detail: 'r/worldnews',
  author_id: 'auth-demo-1',
  author_handle: 'coastal_watch',
  content_type: 'post',
  text: 'Three separate accounts posted this identical claim within four minutes of each other, all linking the same newly registered domain.',
  timestamp: '2026-08-27T18:41:00Z',
  lang: 'en',
  hashtags: ['electionwatch', 'coordinated'],
  domains: ['news-daily-briefing.example'],
  urls: ['https://news-daily-briefing.example/story/8812'],
  mentions: [],
  media_urls: [],
  narrative_ids: ['nar-demo-1'],
  engagement: { likes: 1_204, shares: 388, replies: 96, views: null },
  scores: {
    toxicity: 0.22,
    misinfo_likelihood: 0.78,
    anomaly: 0.64,
    sentiment: 'negative',
    sentiment_score: -0.61,
    emotion: 'fear',
    stance: 'against',
    is_toxic: false,
    is_anomalous: true,
    scoring_version: 'post-scores-v2.1',
    scored_at: '2026-08-27T19:10:00Z',
    skip_reasons: ['emotion_scores: model checkpoint not mounted'],
  },
};

export const postUnscored: PostOut = {
  ...postWithNullViews,
  id: 'post-demo-2',
  author_handle: 'harbor_signal',
  text: 'Ingested after the last scoring pass, so no model has looked at it yet.',
  scores: null,
  engagement: { likes: null, shares: null, replies: null, views: null },
};

export const compassSubstantiated: CompassContext = {
  id: 'ctx-demo-1',
  narrative_id: 'nar-demo-1',
  claim: 'A newly registered domain seeded an identical election claim across three platforms.',
  context:
    'Registration records show the domain was created eleven days before the first post referencing it. Independent reporting confirms the same wording appeared on Reddit, Mastodon and two syndicated news aggregators within a six-hour window. The underlying election-administration claim it repeats was reviewed by state officials and found to misdescribe a routine reconciliation step.',
  verification_status: 'partially_substantiated',
  risk: 'high',
  caution_note:
    'Coordination is inferred from timing and text similarity. It is consistent with, but does not by itself prove, a single operator.',
  citations: [
    {
      id: 'cit-1',
      url: 'https://example.org/whois/news-daily-briefing',
      title: 'Domain registration record',
      publisher: 'Example Registry',
      domain: 'example.org',
      retrieved_at: '2026-08-28T13:50:00Z',
      snippet: 'Created 2026-08-16. Registrar privacy service enabled.',
      char_start: 0,
      char_end: 84,
    },
    {
      id: 'cit-2',
      url: 'https://example.net/reports/cross-platform-timing',
      title: 'Cross-platform timing analysis',
      publisher: 'Example Observatory',
      domain: 'example.net',
      retrieved_at: '2026-08-28T13:52:00Z',
      snippet: 'Identical phrasing observed across three platforms in under six hours.',
      char_start: 85,
      char_end: 243,
    },
    {
      id: 'cit-3',
      url: 'https://example.gov/elections/reconciliation-explainer',
      title: 'How ballot reconciliation works',
      publisher: 'State Elections Office',
      domain: 'example.gov',
      retrieved_at: '2026-08-28T13:55:00Z',
      snippet: 'Reconciliation is a standard post-count audit step.',
      char_start: 244,
      char_end: 401,
    },
  ],
  generated_by: 'ai',
  model: 'claude-opus-5',
  prompt_version: 'compass-v3',
  generated_at: '2026-08-28T13:58:00Z',
  superseded_by: null,
  attempts: 2,
  retrieved_document_count: 14,
};

/** The state that must never render as an empty box or an endless spinner. */
export const compassInsufficient: CompassContext = {
  id: 'ctx-demo-2',
  narrative_id: 'nar-demo-2',
  claim: 'A regional utility deliberately throttled supply during the August heatwave.',
  context: '',
  verification_status: 'insufficient_evidence',
  risk: 'medium',
  caution_note: null,
  citations: [],
  generated_by: 'ai',
  model: 'claude-opus-5',
  prompt_version: 'compass-v3',
  generated_at: '2026-08-29T07:20:00Z',
  superseded_by: null,
  attempts: 3,
  retrieved_document_count: 0,
};

export const graphStatsTruncated: GraphStats = {
  node_count: 20_000,
  edge_count: 84_119,
  truncated: true,
  truncation: {
    applied_limit: 20_000,
    total_nodes: 63_412,
    strategy: 'highest degree first',
  },
  density: 0.00042,
  component_count: 318,
  largest_component_size: 15_902,
  modularity: 0.71,
};
