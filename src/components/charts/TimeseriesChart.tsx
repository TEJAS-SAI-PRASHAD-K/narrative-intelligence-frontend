import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TimeseriesResponse } from '@/api/types';
import { EmptyState, ErrorState, SkeletonChart } from '@/components/states';
import { InfoTip } from '@/components/ui/tooltip';
import { formatCount, formatDateTime, formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ChartTooltip } from './ChartTooltip';
import { CHART_COLOURS } from './palette';
import { allUnmeasured, flattenTimeseries, NO_ENGAGEMENT_NOTE } from './series';

/**
 * One time series. Two of these share a `syncId`, which is what gives the Overview
 * page a shared x-axis and a synced brush: brushing or hovering one highlights the
 * same window in the other.
 *
 * Unmeasured buckets are `null` in the data and `connectNulls` is off, so the line
 * breaks rather than dropping to zero. A gap reads as "we do not know"; a dip to zero
 * reads as "nothing happened", and only one of those is honest.
 */

export function TimeseriesChart({
  response,
  title,
  syncId,
  stacked,
  isLoading,
  error,
  onRetry,
  height = 220,
  className,
}: {
  response: TimeseriesResponse | undefined;
  title: string;
  syncId: string;
  stacked: boolean;
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  height?: number;
  className?: string;
}) {
  /** Legend isolation: clicking a legend item shows only that series. */
  const [isolated, setIsolated] = useState<string | null>(null);

  const { rows, series } = useMemo(() => flattenTimeseries(response), [response]);

  if (error && !isLoading) {
    return <ErrorState error={error} title={`Could not load ${title.toLowerCase()}`} onRetry={onRetry} />;
  }
  if (isLoading) return <SkeletonChart className={className} />;
  if (!response || rows.length === 0) {
    return (
      <div className={cn('card-surface p-4', className)}>
        <ChartHeader title={title} response={response} />
        <EmptyState
          title="No points in this window"
          description="The corpus has no matching activity for these filters and this interval."
          className="mt-3"
        />
      </div>
    );
  }

  if (allUnmeasured(rows, series.map((s) => s.key))) {
    return (
      <div className={cn('card-surface p-4', className)}>
        <ChartHeader title={title} response={response} />
        <EmptyState
          title={response.metric === 'engagements' ? NO_ENGAGEMENT_NOTE : 'Nothing measured in this window'}
          description="Every point is unmeasured, so the chart draws no line. It does not plot zero."
          className="mt-3"
        />
      </div>
    );
  }

  const visible = isolated ? series.filter((s) => s.key === isolated) : series;
  const tz = response.tz;

  return (
    <div className={cn('card-surface p-4', className)}>
      <ChartHeader title={title} response={response} />

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={rows} syncId={syncId} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART_COLOURS.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="bucket"
            tick={{ fill: CHART_COLOURS.axis, fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLOURS.grid }}
            tickFormatter={(v: string) => formatDateTime(v, tz).slice(0, 12)}
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: CHART_COLOURS.axis, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) =>
              response.normalized ? formatPct(v, 0) : formatCount(v)
            }
          />
          <Tooltip
            content={<ChartTooltip labelFormatter={(v) => `${formatDateTime(v, tz)} ${tz}`} />}
            cursor={{ stroke: CHART_COLOURS.cursor, strokeDasharray: '3 3' }}
          />
          <Legend
            verticalAlign="bottom"
            height={28}
            iconType="square"
            wrapperStyle={{ fontSize: 10, cursor: 'pointer' }}
            onClick={(entry) => {
              const key = String(entry.dataKey ?? '');
              setIsolated((prev) => (prev === key ? null : key));
            }}
          />
          {visible.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stackId={stacked ? 'stack' : undefined}
              stroke={s.colour}
              fill={s.colour}
              fillOpacity={stacked ? 0.45 : 0.12}
              strokeWidth={1.5}
              dot={false}
              // Off, deliberately: a gap is an unmeasured bucket, not a zero.
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
          {/* Shared brush: the sibling chart with the same syncId follows it. */}
          <Brush
            dataKey="bucket"
            height={20}
            travellerWidth={8}
            stroke={CHART_COLOURS.grid}
            fill="hsl(var(--surface-sunken))"
            tickFormatter={(v: string) => formatDateTime(v, tz).slice(0, 6)}
          />
        </AreaChart>
      </ResponsiveContainer>

      {isolated && (
        <button
          type="button"
          onClick={() => setIsolated(null)}
          className="mt-1 rounded-sm text-2xs text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          Showing one series — show all
        </button>
      )}
    </div>
  );
}

function ChartHeader({
  title,
  response,
}: {
  title: string;
  response: TimeseriesResponse | undefined;
}) {
  return (
    <div className="mb-2 flex items-start gap-1.5">
      <div className="min-w-0">
        <h3 className="flex items-center gap-1 text-xs font-semibold">
          {title}
          {response && (
            <InfoTip label={`How is ${title} computed?`}>
              {/* Verbatim from TimeseriesResponse.definition. */}
              <p>{response.definition}</p>
            </InfoTip>
          )}
        </h3>
        {response && (
          <p className="mt-0.5 text-2xs text-muted-foreground">
            {response.interval} buckets · {response.agg} · grouped by {response.group_by}
            {response.normalized ? ' · normalised to 100%' : ''} ·{' '}
            <span className="font-mono">{response.tz}</span>
          </p>
        )}
      </div>
    </div>
  );
}
