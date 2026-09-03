import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useKpiBreakdown } from '@/api/queries/overview';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { seriesColour } from '@/components/charts/palette';
import { EmptyState, ErrorState, SkeletonText } from '@/components/states';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { FilterSpec } from '@/lib/filters';
import { formatCount, formatPct, humanizeEnum } from '@/lib/format';

/**
 * The Insights rail: emotion and sentiment distribution for the current filters, with
 * the dominant value called out in words ("Fear 16.5%").
 *
 * The unscored count sits under the donut. A donut that silently omits unscored posts
 * implies the slices cover everything; they cover only what a model actually looked at.
 */
export function InsightsDonut({ filters }: { filters: FilterSpec }) {
  return (
    <section className="space-y-2">
      <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        Insights
      </h2>
      <Tabs defaultValue="emotion">
        <TabsList>
          <TabsTrigger value="emotion">Emotion</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
        </TabsList>
        <TabsContent value="emotion" className="mt-3">
          <EmotionDonut filters={filters} />
        </TabsContent>
        <TabsContent value="sentiment" className="mt-3">
          <SentimentDonut filters={filters} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function EmotionDonut({ filters }: { filters: FilterSpec }) {
  const { data, isLoading, error, refetch } = useKpiBreakdown('emotions', filters);

  const slices = useMemo(
    () =>
      (data?.items ?? []).map((i) => ({
        key: i.emotion,
        label: humanizeEnum(i.emotion),
        value: i.count,
        pct: i.pct,
      })),
    [data],
  );

  return (
    <Donut
      slices={slices}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      scored={data?.total_scored ?? 0}
      unscored={data?.unscored ?? 0}
      definition={data?.definition}
    />
  );
}

function SentimentDonut({ filters }: { filters: FilterSpec }) {
  const { data, isLoading, error, refetch } = useKpiBreakdown('sentiment', filters);

  const slices = useMemo(
    () =>
      (data?.items ?? []).map((i) => ({
        key: i.sentiment,
        label: humanizeEnum(i.sentiment),
        value: i.count,
        pct: i.pct,
      })),
    [data],
  );

  return (
    <Donut
      slices={slices}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      scored={data?.total_scored ?? 0}
      unscored={data?.unscored ?? 0}
      definition={data?.definition}
    />
  );
}

interface Slice {
  key: string;
  label: string;
  value: number;
  pct: number;
}

function Donut({
  slices,
  isLoading,
  error,
  onRetry,
  scored,
  unscored,
  definition,
}: {
  slices: Slice[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  scored: number;
  unscored: number;
  definition: string | undefined;
}) {
  if (isLoading) return <SkeletonText lines={6} />;
  if (error) return <ErrorState error={error} compact onRetry={onRetry} />;
  if (slices.length === 0) {
    return <EmptyState title="Nothing scored in this window" />;
  }

  const dominant = slices.reduce((a, b) => (b.value > a.value ? b : a));

  return (
    <div className="space-y-2 card-surface p-4">
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            innerRadius="58%"
            outerRadius="88%"
            paddingAngle={1.5}
            stroke="none"
            isAnimationActive={false}
          >
            {slices.map((s) => (
              <Cell key={s.key} fill={seriesColour(s.key)} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* The headline the analyst actually reads. */}
      <p className="text-center text-sm font-semibold">
        {dominant.label} {formatPct(dominant.pct)}
      </p>

      <ul className="space-y-0.5">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-2xs">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ background: seriesColour(s.key) }}
            />
            <span className="min-w-0 flex-1 truncate">{s.label}</span>
            <span className="tabular text-muted-foreground">{formatCount(s.value)}</span>
            <span className="w-11 shrink-0 text-right tabular">{formatPct(s.pct)}</span>
          </li>
        ))}
      </ul>

      <p className="border-t border-border pt-1.5 text-2xs text-muted-foreground">
        <span className="tabular text-foreground">{formatCount(scored)}</span> scored ·{' '}
        <span className="tabular text-foreground">{formatCount(unscored)}</span> unscored.
        Unscored posts are excluded from the slices above, not counted as neutral.
      </p>

      {definition && <p className="text-2xs text-muted-foreground">{definition}</p>}
    </div>
  );
}
