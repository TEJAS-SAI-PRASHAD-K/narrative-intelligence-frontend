import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { NarrativeTimeline } from '@/api/types';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { CHART_COLOURS, seriesColour } from '@/components/charts/palette';
import { EmptyState, ErrorState, SkeletonChart } from '@/components/states';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatCount, formatDateTime, platformLabel } from '@/lib/format';

/**
 * The narrative's own timeline. With Cross-Platform on, `by_platform` splits into one
 * series per source; a platform missing from a bucket is `null`, not 0, so the series
 * breaks instead of claiming the platform went silent.
 *
 * `peak_at` is marked with a reference line because "when did this spike" is the first
 * question an analyst asks of a narrative.
 */
export function NarrativeTimelineChart({
  timeline,
  isLoading,
  error,
  onRetry,
  crossPlatform,
  onCrossPlatformChange,
}: {
  timeline: NarrativeTimeline | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  crossPlatform: boolean;
  onCrossPlatformChange: (value: boolean) => void;
}) {
  const header = (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <h3 className="text-xs font-semibold">Timeline</h3>
      {timeline && (
        <span className="text-2xs text-muted-foreground">
          {timeline.interval} buckets · <span className="font-mono">{timeline.tz}</span>
          {timeline.peak_at
            ? ` · peak ${formatDateTime(timeline.peak_at, timeline.tz)}`
            : ''}
        </span>
      )}
      <div className="flex-1" />
      <div className="flex items-center gap-1.5">
        <Switch
          id="cross-platform"
          checked={crossPlatform}
          onCheckedChange={onCrossPlatformChange}
        />
        <Label htmlFor="cross-platform" className="cursor-pointer normal-case tracking-normal">
          Cross-platform
        </Label>
      </div>
    </div>
  );

  if (isLoading) return <SkeletonChart />;
  if (error) return <ErrorState error={error} title="Could not load the timeline" onRetry={onRetry} />;
  if (!timeline || timeline.points.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        {header}
        <EmptyState title="No activity in this window" />
      </div>
    );
  }

  const platforms = crossPlatform
    ? [
        ...new Set(
          timeline.points.flatMap((p) => Object.keys(p.by_platform ?? {})),
        ),
      ].sort()
    : [];

  const rows = timeline.points.map((p) => {
    const row: Record<string, string | number | null> = {
      bucket: p.bucket_start,
      posts: p.post_count,
      engagement: p.engagement,
    };
    for (const platform of platforms) {
      const v = p.by_platform?.[platform];
      // Explicit null: this platform contributed nothing measurable to this bucket.
      row[platform] = v === undefined || v === null ? null : v;
    }
    return row;
  });

  const series =
    platforms.length > 0
      ? platforms.map((p) => ({ key: p, label: platformLabel(p), colour: seriesColour(p) }))
      : [
          { key: 'posts', label: 'Posts', colour: seriesColour('posts') },
          { key: 'engagement', label: 'Engagement', colour: seriesColour('engagement') },
        ];

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      {header}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHART_COLOURS.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="bucket"
            tick={{ fill: CHART_COLOURS.axis, fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: CHART_COLOURS.grid }}
            tickFormatter={(v: string) => formatDateTime(v, timeline.tz).slice(0, 12)}
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: CHART_COLOURS.axis, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v: number) => formatCount(v)}
          />
          <Tooltip
            content={
              <ChartTooltip labelFormatter={(v) => `${formatDateTime(v, timeline.tz)} ${timeline.tz}`} />
            }
            cursor={{ stroke: CHART_COLOURS.cursor, strokeDasharray: '3 3' }}
          />
          <Legend verticalAlign="bottom" height={24} iconType="square" wrapperStyle={{ fontSize: 10 }} />
          {timeline.peak_at && (
            <ReferenceLine
              x={timeline.peak_at}
              stroke={CHART_COLOURS.riskMed}
              strokeDasharray="4 3"
              label={{ value: 'peak', fill: CHART_COLOURS.riskMed, fontSize: 9, position: 'top' }}
            />
          )}
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stackId={crossPlatform ? 'stack' : undefined}
              stroke={s.colour}
              fill={s.colour}
              fillOpacity={crossPlatform ? 0.4 : 0.12}
              strokeWidth={1.5}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
