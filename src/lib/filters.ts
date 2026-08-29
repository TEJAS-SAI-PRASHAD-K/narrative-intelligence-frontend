/**
 * The one filter serializer. The URL is the state: every list endpoint in Phase 4
 * accepts the same parameter set, so it is defined once here and every query key is
 * derived from it. Duplicating this per page is how the codebase rots.
 *
 * Round-trip contract, tested in `filters.test.ts`:
 *     parseFilterSpec(toSearchParams(spec)) deep-equals spec
 * An analyst pastes a URL into a report; a colleague opens it and lands on the
 * identical view, filter chips included.
 */

export const DEFAULT_TZ = 'UTC';
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

/** Mirrors the shared query params on `/narratives`, `/posts`, `/authors`, `/domains`,
 *  `/cohorts`, `/drivers/*`, `/overview/*` and `/network/graph`. */
export interface FilterSpec {
  project_id: string;
  date_from?: string | undefined;
  date_to?: string | undefined;
  tz: string;
  platform?: string[] | undefined;
  narrative_id?: string[] | undefined;
  cohort_id?: string[] | undefined;
  author_group_id?: string[] | undefined;
  sentiment?: string[] | undefined;
  emotion?: string[] | undefined;
  min_toxicity?: number | undefined;
  min_risk?: number | undefined;
  is_anomalous?: boolean | undefined;
  is_bot_like?: boolean | undefined;
  content_type?: string[] | undefined;
  lang?: string[] | undefined;
  q?: string | undefined;
  include_shared: boolean;
}

/** Paging + ordering ride alongside the filters but are not part of the shared set:
 *  `/overview/kpis` rejects `cursor`, and `sort` vocabularies differ per route. */
export interface ListSpec {
  sort?: string | undefined;
  cursor?: string | undefined;
  limit?: number | undefined;
}

const ARRAY_KEYS = [
  'platform',
  'narrative_id',
  'cohort_id',
  'author_group_id',
  'sentiment',
  'emotion',
  'content_type',
  'lang',
] as const satisfies readonly (keyof FilterSpec)[];

const NUMBER_KEYS = ['min_toxicity', 'min_risk'] as const satisfies readonly (keyof FilterSpec)[];

const BOOLEAN_KEYS = ['is_anomalous', 'is_bot_like'] as const satisfies readonly (keyof FilterSpec)[];

const STRING_KEYS = ['date_from', 'date_to', 'q'] as const satisfies readonly (keyof FilterSpec)[];

export type ArrayFilterKey = (typeof ARRAY_KEYS)[number];
export type FilterKey = keyof FilterSpec;

/** Every key this module owns in the query string. Anything else belongs to a page. */
export const FILTER_PARAM_KEYS: readonly string[] = [
  ...ARRAY_KEYS,
  ...NUMBER_KEYS,
  ...BOOLEAN_KEYS,
  ...STRING_KEYS,
  'tz',
  'include_shared',
];

export const LIST_PARAM_KEYS: readonly string[] = ['sort', 'cursor', 'limit'];

export function emptyFilterSpec(projectId: string): FilterSpec {
  return { project_id: projectId, tz: DEFAULT_TZ, include_shared: true };
}

function readArray(sp: URLSearchParams, key: string): string[] | undefined {
  const values = sp.getAll(key).filter((v) => v !== '');
  return values.length > 0 ? values : undefined;
}

function readNumber(sp: URLSearchParams, key: string): number | undefined {
  const raw = sp.get(key);
  if (raw === null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function readBoolean(sp: URLSearchParams, key: string): boolean | undefined {
  const raw = sp.get(key);
  if (raw === null || raw === '') return undefined;
  return raw === 'true' || raw === '1';
}

function readString(sp: URLSearchParams, key: string): string | undefined {
  const raw = sp.get(key);
  return raw === null || raw === '' ? undefined : raw;
}

/** URL -> FilterSpec. `project_id` comes from the route, not the query string. */
export function parseFilterSpec(sp: URLSearchParams, projectId: string): FilterSpec {
  const spec: FilterSpec = {
    project_id: projectId,
    tz: sp.get('tz') || DEFAULT_TZ,
    include_shared: sp.get('include_shared') === null ? true : readBoolean(sp, 'include_shared')!,
  };
  for (const key of STRING_KEYS) spec[key] = readString(sp, key);
  for (const key of ARRAY_KEYS) spec[key] = readArray(sp, key);
  for (const key of NUMBER_KEYS) spec[key] = readNumber(sp, key);
  for (const key of BOOLEAN_KEYS) spec[key] = readBoolean(sp, key);
  return spec;
}

export function parseListSpec(sp: URLSearchParams, defaults: ListSpec = {}): ListSpec {
  return {
    sort: readString(sp, 'sort') ?? defaults.sort,
    cursor: readString(sp, 'cursor') ?? defaults.cursor,
    limit: Math.min(readNumber(sp, 'limit') ?? defaults.limit ?? DEFAULT_LIMIT, MAX_LIMIT),
  };
}

/**
 * FilterSpec -> URLSearchParams. Defaults (`tz=UTC`, `include_shared=true`) are
 * written explicitly so a pasted link is unambiguous even if a default later changes.
 * Arrays are sorted and params are sorted so two equal specs always produce byte-equal
 * URLs -- which is what makes the query key stable.
 */
export function toSearchParams(spec: FilterSpec, list?: ListSpec): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set('tz', spec.tz);
  sp.set('include_shared', String(spec.include_shared));
  for (const key of STRING_KEYS) {
    const v = spec[key];
    if (v !== undefined && v !== '') sp.set(key, v);
  }
  for (const key of ARRAY_KEYS) {
    const v = spec[key];
    if (v && v.length > 0) for (const item of [...v].sort()) sp.append(key, item);
  }
  for (const key of NUMBER_KEYS) {
    const v = spec[key];
    if (v !== undefined) sp.set(key, String(v));
  }
  for (const key of BOOLEAN_KEYS) {
    const v = spec[key];
    if (v !== undefined) sp.set(key, String(v));
  }
  if (list?.sort) sp.set('sort', list.sort);
  if (list?.cursor) sp.set('cursor', list.cursor);
  if (list?.limit !== undefined) sp.set('limit', String(list.limit));
  sp.sort();
  return sp;
}

/** The exact object handed to `api.get`. Undefined entries are dropped by the client. */
export function toQueryParams(spec: FilterSpec): Record<string, string | number | boolean | string[] | undefined> {
  return {
    project_id: spec.project_id,
    tz: spec.tz,
    include_shared: spec.include_shared,
    date_from: spec.date_from,
    date_to: spec.date_to,
    q: spec.q,
    platform: spec.platform,
    narrative_id: spec.narrative_id,
    cohort_id: spec.cohort_id,
    author_group_id: spec.author_group_id,
    sentiment: spec.sentiment,
    emotion: spec.emotion,
    content_type: spec.content_type,
    lang: spec.lang,
    min_toxicity: spec.min_toxicity,
    min_risk: spec.min_risk,
    is_anomalous: spec.is_anomalous,
    is_bot_like: spec.is_bot_like,
  };
}

/**
 * The canonical, order-independent identity of a filter set. Query keys embed this
 * string, so changing one filter invalidates exactly the queries that depend on it.
 */
export function filterKey(spec: FilterSpec): string {
  return `${spec.project_id}|${toSearchParams(spec).toString()}`;
}

/**
 * Narrows a spec to the subset of filters a given endpoint actually reads, so a page
 * that ignores `min_toxicity` is not refetched when `min_toxicity` changes.
 * `/network/graph`, for instance, takes `narrative_id` as its own param and not as a
 * shared filter.
 */
export function pickFilters(spec: FilterSpec, keys: readonly FilterKey[]): Partial<FilterSpec> {
  const out: Partial<FilterSpec> = { project_id: spec.project_id };
  for (const key of keys) {
    const value = spec[key];
    if (value !== undefined) (out as unknown as Record<string, unknown>)[key] = value;
  }
  return out;
}

// --- chips -----------------------------------------------------------------

export interface FilterChip {
  key: FilterKey;
  /** Present when the chip removes one value out of a multi-value filter. */
  value?: string;
  label: string;
}

const CHIP_LABELS: Record<string, string> = {
  platform: 'Platform',
  narrative_id: 'Narrative',
  cohort_id: 'Cohort',
  author_group_id: 'Author group',
  sentiment: 'Sentiment',
  emotion: 'Emotion',
  content_type: 'Content type',
  lang: 'Language',
  min_toxicity: 'Min toxicity',
  min_risk: 'Min risk',
  is_anomalous: 'Anomalous',
  is_bot_like: 'Bot-like',
  q: 'Search',
  date_from: 'From',
  date_to: 'To',
  include_shared: 'Shared content',
};

export function filterLabel(key: FilterKey): string {
  return CHIP_LABELS[key] ?? key;
}

/**
 * Every active filter renders a removable chip. `tz` is excluded -- it is always
 * shown on the date control itself, never as a removable chip.
 */
export function activeChips(
  spec: FilterSpec,
  resolveLabel?: (key: FilterKey, value: string) => string | undefined,
): FilterChip[] {
  const chips: FilterChip[] = [];
  const label = (k: FilterKey, v: string) => resolveLabel?.(k, v) ?? v;

  for (const key of ARRAY_KEYS) {
    for (const value of spec[key] ?? []) {
      chips.push({ key, value, label: `${filterLabel(key)}: ${label(key, value)}` });
    }
  }
  if (spec.date_from) chips.push({ key: 'date_from', label: `From: ${spec.date_from}` });
  if (spec.date_to) chips.push({ key: 'date_to', label: `To: ${spec.date_to}` });
  if (spec.q) chips.push({ key: 'q', label: `Search: "${spec.q}"` });
  for (const key of NUMBER_KEYS) {
    const v = spec[key];
    if (v !== undefined) chips.push({ key, label: `${filterLabel(key)}: ${v}` });
  }
  for (const key of BOOLEAN_KEYS) {
    const v = spec[key];
    if (v !== undefined) chips.push({ key, label: `${filterLabel(key)}: ${v ? 'yes' : 'no'}` });
  }
  if (spec.include_shared === false) {
    chips.push({ key: 'include_shared', label: 'Shared content: excluded' });
  }
  return chips;
}

/** Chip dismissal. Removing one value of a multi-value filter keeps the rest. */
export function removeChip(spec: FilterSpec, chip: FilterChip): FilterSpec {
  const next: FilterSpec = { ...spec };
  const key = chip.key;

  if ((ARRAY_KEYS as readonly string[]).includes(key) && chip.value !== undefined) {
    const remaining = (next[key as ArrayFilterKey] ?? []).filter((v) => v !== chip.value);
    next[key as ArrayFilterKey] = remaining.length > 0 ? remaining : undefined;
    return next;
  }
  if (key === 'include_shared') {
    next.include_shared = true;
    return next;
  }
  (next as unknown as Record<string, unknown>)[key] = undefined;
  return next;
}

export function countActiveFilters(spec: FilterSpec): number {
  return activeChips(spec).length;
}
