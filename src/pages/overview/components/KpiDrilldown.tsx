import { useKpiBreakdown } from '@/api/queries/overview';
import type {
  AuthorsBreakdown,
  EmotionsBreakdown,
  EngagementsBreakdown,
  Metric,
  PostsBreakdown,
  SentimentBreakdown,
} from '@/api/types';
import { NotMeasured } from '@/components/risk/NotMeasured';
import { ErrorState, SkeletonText } from '@/components/states';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { InfoTip } from '@/components/ui/tooltip';
import type { KpiSliceName } from '@/components/kpi/KpiStrip';
import type { FilterSpec } from '@/lib/filters';
import { formatCount, formatMetricValue, formatPct, humanizeEnum, isMeasured } from '@/lib/format';
import { HierarchyBars } from './HierarchyBars';

/**
 * The five KPI drilldowns, each backed by its own `/overview/kpis/{slice}` endpoint.
 *
 * Narrative-scoped mode only: with a narrative selected, each card expands into the
 * breakdown that answers "what is this number made of". Nothing is recomputed from a
 * post list -- if a figure is on screen, an endpoint served it.
 */
export function KpiDrilldown({
  slice,
  onOpenChange,
  filters,
  onOpenCohorts,
}: {
  slice: KpiSliceName | null;
  onOpenChange: (open: boolean) => void;
  filters: FilterSpec;
  onOpenCohorts: () => void;
}) {
  return (
    <Sheet open={slice !== null} onOpenChange={onOpenChange}>
      <SheetContent width="wide" aria-describedby="kpi-drilldown-desc">
        <SheetHeader>
          <SheetTitle>{slice ? `${humanizeEnum(slice)} breakdown` : 'Breakdown'}</SheetTitle>
          <SheetDescription id="kpi-drilldown-desc">
            Served by <code>/overview/kpis/{slice}</code> under the current filters.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          {slice && <Content slice={slice} filters={filters} onOpenCohorts={onOpenCohorts} />}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function Content({
  slice,
  filters,
  onOpenCohorts,
}: {
  slice: KpiSliceName;
  filters: FilterSpec;
  onOpenCohorts: () => void;
}) {
  const { data, isLoading, error, refetch } = useKpiBreakdown(slice, filters);

  if (isLoading) return <SkeletonText lines={10} />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!data) return null;

  switch (slice) {
    case 'posts':
      return <Posts data={data as PostsBreakdown} />;
    case 'engagements':
      return <Engagements data={data as EngagementsBreakdown} />;
    case 'authors':
      return <Authors data={data as AuthorsBreakdown} onOpenCohorts={onOpenCohorts} />;
    case 'emotions':
      return <Emotions data={data as EmotionsBreakdown} />;
    case 'sentiment':
      return <Sentiment data={data as SentimentBreakdown} />;
  }
}

function Posts({ data }: { data: PostsBreakdown }) {
  return (
    <>
      <MetricGrid
        metrics={[
          data.total,
          data.original,
          data.local_shared,
          data.anonymous,
          data.anomalous,
          data.toxic,
        ]}
      />
      {data.by_domain && data.by_domain.length > 0 && (
        <Section title="By domain and channel" hint="Domains expand into the channels that carried them.">
          <HierarchyBars nodes={data.by_domain} />
        </Section>
      )}
      {data.by_channel && data.by_channel.length > 0 && (
        <Section title="By channel">
          <HierarchyBars nodes={data.by_channel} />
        </Section>
      )}
    </>
  );
}

function Engagements({ data }: { data: EngagementsBreakdown }) {
  return (
    <MetricGrid
      metrics={[
        data.total,
        data.reactions,
        data.likes,
        data.views,
        data.global_shares,
        data.on_high_risk,
      ]}
    />
  );
}

function Authors({ data, onOpenCohorts }: { data: AuthorsBreakdown; onOpenCohorts: () => void }) {
  return (
    <>
      <MetricGrid metrics={[data.total, data.bot_like, data.author_groups]} />
      {data.top_cohorts && data.top_cohorts.length > 0 && (
        <Section title="Top cohorts">
          <HierarchyBars nodes={data.top_cohorts} />
          {isMeasured(data.total_cohort_count) &&
            data.total_cohort_count > data.top_cohorts.length && (
              <Button variant="link" size="sm" className="mt-1 px-0" onClick={onOpenCohorts}>
                +{data.total_cohort_count - data.top_cohorts.length} more cohorts
              </Button>
            )}
        </Section>
      )}
    </>
  );
}

/**
 * All seven emotions, always, with count and percentage — plus the `unscored` count
 * rendered explicitly. Omitting unscored posts would make the seven shares look like
 * they describe the whole corpus when they describe only the scored part of it.
 */
function Emotions({ data }: { data: EmotionsBreakdown }) {
  const max = Math.max(...data.items.map((i) => i.count), 1);
  return (
    <>
      <p className="text-2xs text-muted-foreground">{data.definition}</p>
      <ul className="space-y-1.5">
        {data.items.map((item) => (
          <li key={item.emotion}>
            <div className="flex items-baseline gap-2 text-xs">
              <span className="w-20 shrink-0">{humanizeEnum(item.emotion)}</span>
              <span className="tabular">{formatCount(item.count)}</span>
              <span className="ml-auto tabular text-muted-foreground">{formatPct(item.pct)}</span>
            </div>
            <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <Totals scored={data.total_scored} unscored={data.unscored ?? 0} noun="posts" />
    </>
  );
}

function Sentiment({ data }: { data: SentimentBreakdown }) {
  return (
    <>
      <p className="text-2xs text-muted-foreground">{data.definition}</p>
      <ul className="space-y-1.5">
        {data.items.map((item) => (
          <li key={item.sentiment} className="flex items-baseline gap-2 text-xs">
            <span className="w-20 shrink-0">{humanizeEnum(item.sentiment)}</span>
            <span className="tabular">{formatCount(item.count)}</span>
            <span className="tabular text-muted-foreground">{formatPct(item.pct)}</span>
            <span className="ml-auto tabular text-muted-foreground">
              mean{' '}
              {isMeasured(item.mean_score) ? item.mean_score.toFixed(3) : <NotMeasured />}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs">
        Net sentiment{' '}
        <span className="tabular font-medium">
          {isMeasured(data.net_sentiment) ? data.net_sentiment.toFixed(3) : <NotMeasured />}
        </span>
      </p>
      <Totals scored={data.total_scored} unscored={data.unscored ?? 0} noun="posts" />
    </>
  );
}

function Totals({ scored, unscored, noun }: { scored: number; unscored: number; noun: string }) {
  return (
    <p className="rounded-md border border-border bg-surface-sunken px-2.5 py-2 text-2xs text-muted-foreground">
      <span className="tabular font-medium text-foreground">{formatCount(scored)}</span> {noun}{' '}
      scored ·{' '}
      <span className="tabular font-medium text-foreground">{formatCount(unscored)}</span> unscored.
      Unscored {noun} are excluded from every share above — they are not counted as
      &ldquo;neutral&rdquo;.
    </p>
  );
}

function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-md border border-border bg-card p-2.5">
          <dt className="flex items-center gap-1 text-2xs uppercase tracking-wide text-muted-foreground">
            <span className="truncate">{m.label}</span>
            <InfoTip label={`What does ${m.label} count?`}>
              <div className="space-y-1.5">
                <p>{m.definition}</p>
                {m.nullable_fields && m.nullable_fields.length > 0 && (
                  <p className="text-muted-foreground">
                    May be unmeasured: <span className="font-mono">{m.nullable_fields.join(', ')}</span>
                  </p>
                )}
              </div>
            </InfoTip>
          </dt>
          <dd className="mt-1 text-lg font-semibold tabular">
            {isMeasured(m.value) ? formatMetricValue(m.value, m.unit) : <NotMeasured />}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {hint && <p className="text-2xs text-muted-foreground">{hint}</p>}
      {children}
    </section>
  );
}
