import { describe, expect, it } from 'vitest';
import type { TimeseriesResponse } from '@/api/types';
import { renderHtml } from '@/test/renderHtml';
import { ChartTooltip } from './ChartTooltip';
import { allUnmeasured, flattenTimeseries, NO_ENGAGEMENT_NOTE } from './series';
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

  it('draws no flat zero line', () => {
    expect(html).not.toContain('recharts');
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
