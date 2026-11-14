import { createElement, type Key, type ReactElement } from 'react';
import type { NarrativeTimeline, TimeseriesResponse } from '@/api/types';
import { platformLabel } from '@/lib/format';
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
  // No series at all is a different case (nothing to draw), not "nothing measured".
  if (keys.length === 0) return false;
  return !rows.some((r) => keys.some((k) => typeof r[k] === 'number'));
}

export const NO_ENGAGEMENT_NOTE = 'No platform in this view measures engagement.';

/**
 * A measured point whose neighbours are both unmeasured. With `connectNulls` off and
 * dots off, such a point draws nothing, so it needs a dot to stay visible.
 */
export function isIsolated(rows: Row[], index: number, key: string): boolean {
  const here = rows[index]?.[key];
  if (typeof here !== 'number') return false;
  const prev = index > 0 ? rows[index - 1]?.[key] : null;
  const next = index < rows.length - 1 ? rows[index + 1]?.[key] : null;
  return typeof prev !== 'number' && typeof next !== 'number';
}

/** Recharts `dot` renderer: a dot for isolated points only. */
export function isolatedDot(rows: Row[], key: string, colour: string) {
  return (props: { cx?: number; cy?: number; index?: number; key?: Key | null }): ReactElement => {
    const { cx, cy, index } = props;
    if (index !== undefined && cx !== undefined && cy !== undefined && isIsolated(rows, index, key)) {
      return createElement('circle', { key: props.key ?? undefined, cx, cy, r: 3, fill: colour, stroke: colour });
    }
    return createElement('g', { key: props.key ?? undefined });
  };
}

/**
 * Rows and series for the narrative timeline. When every engagement value is null the
 * engagement series is dropped and `showNote` asks for the "not measured" note.
 */
export function buildTimelineView(timeline: NarrativeTimeline, crossPlatform: boolean) {
  const platforms = crossPlatform
    ? [...new Set(timeline.points.flatMap((p) => Object.keys(p.by_platform ?? {})))].sort()
    : [];

  const rows = timeline.points.map((p) => {
    const row: Row = {
      bucket: p.bucket_start,
      posts: p.post_count,
      engagement: p.engagement ?? null,
    };
    for (const platform of platforms) {
      const v = p.by_platform?.[platform];
      row[platform] = v === undefined || v === null ? null : v;
    }
    return row;
  });

  const engagementUnmeasured = allUnmeasured(rows, ['engagement']);
  const series: SeriesDef[] =
    platforms.length > 0
      ? platforms.map((p) => ({ key: p, label: platformLabel(p), colour: seriesColour(p) }))
      : [
          { key: 'posts', label: 'Posts', colour: seriesColour('posts') },
          ...(engagementUnmeasured
            ? []
            : [{ key: 'engagement', label: 'Engagement', colour: seriesColour('engagement') }]),
        ];

  return { rows, series, showNote: platforms.length === 0 && engagementUnmeasured };
}
