import type { TimeseriesResponse } from '@/api/types';
import { seriesColour } from './palette';

export interface SeriesDef {
  key: string;
  label: string;
  colour: string;
}

export type Row = Record<string, string | number | null>;

export function labelFor(metric: string): string {
  const map: Record<string, string> = {
    posts: 'Posts',
    engagements: 'Engagements',
    authors: 'Authors',
  };
  return map[metric] ?? metric;
}

/**
 * `TimeseriesResponse` gives either a scalar `value` per bucket (`group_by=none`) or a
 * `series` map keyed by series id. Both are flattened to one row per bucket so the
 * chart never has to branch. In grouped mode a missing key means no posts for that
 * group and `null` means posts with no measured engagement. Both become an explicit
 * `null`, which is a gap. Neither becomes 0.
 */
export function flattenTimeseries(response: TimeseriesResponse | undefined): {
  rows: Row[];
  series: SeriesDef[];
} {
  if (!response || response.points.length === 0) return { rows: [], series: [] };

  const labels = response.series_labels ?? {};

  if (response.group_by === 'none') {
    const key = response.metric;
    return {
      rows: response.points.map((p) => ({ bucket: p.bucket_start, [key]: p.value ?? null })),
      series: [{ key, label: labelFor(response.metric), colour: seriesColour(key) }],
    };
  }

  const keys = new Set<string>();
  for (const p of response.points) {
    for (const k of Object.keys(p.series ?? {})) keys.add(k);
  }

  const series = [...keys]
    .sort()
    .map((key) => ({ key, label: labels[key] ?? key, colour: seriesColour(key) }));

  const rows = response.points.map((p) => {
    const row: Row = { bucket: p.bucket_start };
    for (const s of series) {
      const v = p.series?.[s.key];
      row[s.key] = v === undefined || v === null ? null : v;
    }
    return row;
  });

  return { rows, series };
}

/** True when no row holds a number for any of the keys. */
export function allUnmeasured(rows: Row[], keys: string[]): boolean {
  return !rows.some((r) => keys.some((k) => typeof r[k] === 'number'));
}

export const NO_ENGAGEMENT_NOTE = 'No platform in this view measures engagement.';
