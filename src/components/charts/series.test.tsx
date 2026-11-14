import { describe, expect, it } from 'vitest';
import type { TimeseriesResponse } from '@/api/types';
import { renderHtml } from '@/test/renderHtml';
import { ChartTooltip } from './ChartTooltip';
import type { NarrativeTimeline } from '@/api/types';
import {
  allUnmeasured,
  buildTimelineView,
  flattenTimeseries,
  isIsolated,
  NO_ENGAGEMENT_NOTE,
} from './series';
import { TimeseriesChart } from './TimeseriesChart';

function response(over: Partial<TimeseriesResponse>): TimeseriesResponse {
  return {
    metric: 'engagements',
    group_by: 'none',
    interval: '1d',
    agg: 'total',
    normalized: false,
    tz: 'UTC',
    definition: 'Sum of measured engagement.',
    points: [],
    ...over,
  } as TimeseriesResponse;
}

const day = (n: number) => `2026-01-0${n}T00:00:00Z`;

describe('flattenTimeseries with a null point', () => {
  it('keeps null as null, never 0', () => {
    const { rows } = flattenTimeseries(
      response({
        points: [
          { bucket_start: day(1), value: 5 },
          { bucket_start: day(2), value: null },
          { bucket_start: day(3), value: 0 },
        ] as TimeseriesResponse['points'],
      }),
    );
    expect(rows.map((r) => r.engagements)).toEqual([5, null, 0]);
  });

  it('treats a missing group key and a null group value as the same gap', () => {
    const { rows } = flattenTimeseries(
      response({
        group_by: 'platform',
        points: [
          { bucket_start: day(1), value: null, series: { a: 3, b: null } },
          { bucket_start: day(2), value: null, series: { a: 4 } },
        ] as TimeseriesResponse['points'],
      }),
    );
    expect(rows.map((r) => r.b)).toEqual([null, null]);
    expect(rows.map((r) => r.a)).toEqual([3, 4]);
  });

  it('is not an all-null chart when one point is measured', () => {
    const { rows } = flattenTimeseries(
      response({
        points: [
          { bucket_start: day(1), value: null },
          { bucket_start: day(2), value: 2 },
        ] as TimeseriesResponse['points'],
      }),
    );
    expect(allUnmeasured(rows, ['engagements'])).toBe(false);
  });
});

describe('an all-null engagement chart', () => {
  const html = renderHtml(
    <TimeseriesChart
      response={response({
        points: [
          { bucket_start: day(1), value: null },
          { bucket_start: day(2), value: null },
        ] as TimeseriesResponse['points'],
      })}
      title="Engagements"
      syncId="t"
      stacked={false}
      isLoading={false}
      error={null}
    />,
  );

  it('shows the empty-state note', () => {
    expect(html).toContain(NO_ENGAGEMENT_NOTE);
  });

  it('says nothing is measured', () => {
    expect(html).toContain('Every point is unmeasured');
  });
});

describe('a chart with measured points (control)', () => {
  it('does not show the empty-state note', () => {
    const html = renderHtml(
      <TimeseriesChart
        response={response({
          points: [
            { bucket_start: day(1), value: 1 },
            { bucket_start: day(2), value: null },
          ] as TimeseriesResponse['points'],
        })}
        title="Engagements"
        syncId="t"
        stacked={false}
        isLoading={false}
        error={null}
      />,
    );
    expect(html).not.toContain(NO_ENGAGEMENT_NOTE);
    expect(html).not.toContain('Every point is unmeasured');
  });
});

describe('allUnmeasured with no series', () => {
  it('is false, so a posts chart without series keys is not "nothing measured"', () => {
    expect(allUnmeasured([{ bucket: day(1) }], [])).toBe(false);
  });
});

describe('isIsolated', () => {
  const rows = [
    { bucket: 'a', v: 1 },
    { bucket: 'b', v: null },
    { bucket: 'c', v: 2 },
    { bucket: 'd', v: null },
    { bucket: 'e', v: 3 },
    { bucket: 'f', v: 4 },
  ];
  it('flags a point between two nulls and at an edge next to a null', () => {
    expect(isIsolated(rows, 0, 'v')).toBe(true);
    expect(isIsolated(rows, 2, 'v')).toBe(true);
  });
  it('does not flag connected points or nulls', () => {
    expect(isIsolated(rows, 4, 'v')).toBe(false);
    expect(isIsolated(rows, 5, 'v')).toBe(false);
    expect(isIsolated(rows, 1, 'v')).toBe(false);
  });
});

describe('buildTimelineView', () => {
  const tl = (engagement: Array<number | null>) =>
    ({
      interval: '1d',
      tz: 'UTC',
      points: engagement.map((e, i) => ({
        bucket_start: day(i + 1),
        post_count: 2,
        engagement: e,
      })),
    }) as unknown as NarrativeTimeline;

  it('drops the engagement series and asks for the note when all are null', () => {
    const v = buildTimelineView(tl([null, null]), false);
    expect(v.series.map((s) => s.key)).toEqual(['posts']);
    expect(v.showNote).toBe(true);
    expect(v.rows.map((r) => r.engagement)).toEqual([null, null]);
  });

  it('keeps the series and no note when some engagement is measured', () => {
    const v = buildTimelineView(tl([null, 5]), false);
    expect(v.series.map((s) => s.key)).toEqual(['posts', 'engagement']);
    expect(v.showNote).toBe(false);
  });
});

describe('ChartTooltip with a null point', () => {
  it('shows the dash', () => {
    const html = renderHtml(
      <ChartTooltip active label="x" payload={[{ dataKey: 'a', name: 'A', value: null }]} />,
    );
    expect(html).toContain('—');
    expect(html).not.toMatch(/>0</);
  });
});
