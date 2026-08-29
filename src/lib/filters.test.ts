import { describe, expect, it } from 'vitest';
import {
  activeChips,
  emptyFilterSpec,
  filterKey,
  parseFilterSpec,
  parseListSpec,
  removeChip,
  toQueryParams,
  toSearchParams,
  type FilterSpec,
} from './filters';

const PROJECT = 'proj-1';

function roundTrip(spec: FilterSpec): FilterSpec {
  return parseFilterSpec(toSearchParams(spec), spec.project_id);
}

/** Compare specs set-wise: `toSearchParams` canonicalises array order. */
function sortArrays(spec: FilterSpec): FilterSpec {
  const out = { ...spec } as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(out)) {
    if (Array.isArray(v)) out[k] = [...v].sort();
  }
  return out as unknown as FilterSpec;
}

describe('FilterSpec <-> URL round trip', () => {
  it('preserves an empty spec', () => {
    const spec = emptyFilterSpec(PROJECT);
    expect(roundTrip(spec)).toEqual(spec);
  });

  it('preserves a fully populated spec', () => {
    const spec: FilterSpec = {
      project_id: PROJECT,
      tz: 'America/New_York',
      include_shared: false,
      date_from: '2026-01-01',
      date_to: '2026-02-01',
      q: 'vaccine mandate',
      platform: ['reddit', 'mastodon'],
      narrative_id: ['n-2', 'n-1'],
      cohort_id: ['c-9'],
      author_group_id: ['ag-1'],
      sentiment: ['negative'],
      emotion: ['fear', 'anger'],
      content_type: ['post', 'comment'],
      lang: ['en'],
      min_toxicity: 0.6,
      min_risk: 0.35,
      is_anomalous: true,
      is_bot_like: false,
    };
    // Arrays are canonicalised to sorted order so that two equal specs serialise
    // byte-identically; compare set-wise.
    expect(sortArrays(roundTrip(spec))).toEqual(sortArrays(spec));
  });

  it('is order independent: two equal specs produce the same key', () => {
    const a: FilterSpec = { ...emptyFilterSpec(PROJECT), platform: ['reddit', 'youtube'] };
    const b: FilterSpec = { ...emptyFilterSpec(PROJECT), platform: ['youtube', 'reddit'] };
    expect(filterKey(a)).toEqual(filterKey(b));
  });

  it('produces a different key when any filter changes', () => {
    const base = emptyFilterSpec(PROJECT);
    expect(filterKey({ ...base, min_risk: 0.5 })).not.toEqual(filterKey(base));
    expect(filterKey({ ...base, is_bot_like: true })).not.toEqual(filterKey(base));
    expect(filterKey({ ...base, include_shared: false })).not.toEqual(filterKey(base));
  });

  it('distinguishes is_anomalous=false from unset -- false is a filter, not an absence', () => {
    const base = emptyFilterSpec(PROJECT);
    const explicitFalse: FilterSpec = { ...base, is_anomalous: false };
    expect(roundTrip(explicitFalse).is_anomalous).toBe(false);
    expect(roundTrip(base).is_anomalous).toBeUndefined();
    expect(filterKey(explicitFalse)).not.toEqual(filterKey(base));
  });

  it('distinguishes min_toxicity=0 from unset -- 0 is a floor, not an absence', () => {
    const spec: FilterSpec = { ...emptyFilterSpec(PROJECT), min_toxicity: 0 };
    expect(roundTrip(spec).min_toxicity).toBe(0);
    expect(filterKey(spec)).not.toEqual(filterKey(emptyFilterSpec(PROJECT)));
  });

  it('defaults include_shared to true and tz to UTC when absent from the URL', () => {
    const parsed = parseFilterSpec(new URLSearchParams(''), PROJECT);
    expect(parsed.include_shared).toBe(true);
    expect(parsed.tz).toBe('UTC');
  });

  it('drops empty array params rather than sending empty strings', () => {
    const parsed = parseFilterSpec(new URLSearchParams('platform=&platform='), PROJECT);
    expect(parsed.platform).toBeUndefined();
  });
});

describe('toQueryParams', () => {
  it('omits unset filters so the backend sees an absent param, not an empty one', () => {
    const params = toQueryParams(emptyFilterSpec(PROJECT));
    expect(params.project_id).toBe(PROJECT);
    expect(params.min_risk).toBeUndefined();
    expect(params.platform).toBeUndefined();
  });

  it('passes arrays through for repeated-key serialisation', () => {
    const params = toQueryParams({ ...emptyFilterSpec(PROJECT), platform: ['reddit', 'news'] });
    expect(params.platform).toEqual(['reddit', 'news']);
  });
});

describe('parseListSpec', () => {
  it('clamps limit to the contract maximum of 200', () => {
    expect(parseListSpec(new URLSearchParams('limit=5000')).limit).toBe(200);
  });

  it('falls back to per-page defaults', () => {
    expect(parseListSpec(new URLSearchParams(''), { sort: 'priority' }).sort).toBe('priority');
    expect(parseListSpec(new URLSearchParams('sort=date'), { sort: 'priority' }).sort).toBe('date');
  });
});

describe('chips', () => {
  it('renders one chip per value of a multi-value filter', () => {
    const spec: FilterSpec = { ...emptyFilterSpec(PROJECT), platform: ['reddit', 'news'] };
    const chips = activeChips(spec);
    expect(chips).toHaveLength(2);
    expect(chips.map((c) => c.value).sort()).toEqual(['news', 'reddit']);
  });

  it('removing one value of a multi-value filter keeps the others', () => {
    const spec: FilterSpec = { ...emptyFilterSpec(PROJECT), platform: ['reddit', 'news'] };
    const chip = activeChips(spec).find((c) => c.value === 'reddit')!;
    expect(removeChip(spec, chip).platform).toEqual(['news']);
  });

  it('removing the last value clears the filter entirely rather than leaving []', () => {
    const spec: FilterSpec = { ...emptyFilterSpec(PROJECT), platform: ['reddit'] };
    const chip = activeChips(spec)[0]!;
    expect(removeChip(spec, chip).platform).toBeUndefined();
  });

  it('does not render tz as a removable chip -- it belongs to the date control', () => {
    const spec: FilterSpec = { ...emptyFilterSpec(PROJECT), tz: 'Europe/London' };
    expect(activeChips(spec)).toHaveLength(0);
  });

  it('renders include_shared=false as a chip and restores it to true on removal', () => {
    const spec: FilterSpec = { ...emptyFilterSpec(PROJECT), include_shared: false };
    const chips = activeChips(spec);
    expect(chips).toHaveLength(1);
    expect(removeChip(spec, chips[0]!).include_shared).toBe(true);
  });
});
