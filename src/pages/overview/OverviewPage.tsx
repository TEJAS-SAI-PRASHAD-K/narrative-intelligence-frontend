import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKpis, useTimeseries, type TimeseriesOptions } from '@/api/queries/overview';
import type { TimeseriesAgg, TimeseriesGroupBy, TimeseriesInterval } from '@/api/types';
import { TimeseriesChart } from '@/components/charts/TimeseriesChart';
import { CohortsPanel } from '@/components/cohorts/CohortsPanel';
import { FilterBar } from '@/components/filters/FilterBar';
import { PageShell } from '@/components/page';
import { KpiStrip, type KpiSliceName } from '@/components/kpi/KpiStrip';
import { ErrorState, SkeletonKpiStrip } from '@/components/states';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjectContext } from '@/layout/useProjectContext';
import { useFilters } from '@/lib/useFilters';
import { ConceptsPanel } from './components/ConceptsPanel';
import { HighRiskRail } from './components/HighRiskRail';
import { KpiDrilldown } from './components/KpiDrilldown';

const INTERVALS: TimeseriesInterval[] = ['1h', '6h', '1d', '7d'];
const GROUP_BYS: TimeseriesGroupBy[] = ['none', 'platform', 'narrative', 'cohort', 'source_detail'];
const AGGS: TimeseriesAgg[] = ['total', 'average', 'peak'];

/**
 * 4.1 Project Overview.
 *
 * Two stacked charts share a `syncId`, so brushing one brushes the other and the
 * x-axis reads as a single timeline rather than two charts that happen to be near
 * each other.
 *
 * With a narrative selected in the top bar, the page enters narrative-scoped mode and
 * every KPI card becomes an entry point into its `/overview/kpis/{slice}` breakdown.
 */
export default function OverviewPage() {
  const { projectId, slug } = useProjectContext();
  const navigate = useNavigate();
  const { filters, patchFilters, resetFilters, pageParams, setPageParam } = useFilters(projectId);

  const [drilldown, setDrilldown] = useState<KpiSliceName | null>(null);
  const [cohortsOpen, setCohortsOpen] = useState(false);

  // Chart controls are page state in the URL, so a shared link keeps the shape of the
  // chart as well as the data behind it.
  const interval = (pageParams.get('interval') ?? '1d') as TimeseriesInterval;
  const groupBy = (pageParams.get('group_by') ?? 'platform') as TimeseriesGroupBy;
  const agg = (pageParams.get('agg') ?? 'total') as TimeseriesAgg;
  const stacked = pageParams.get('stacked') !== 'false';
  const normalize = pageParams.get('normalize') === 'true';
  const tab = pageParams.get('tab') ?? 'overview';

  const kpis = useKpis(filters);

  const shared: Omit<TimeseriesOptions, 'metric'> = {
    group_by: groupBy,
    interval,
    agg,
    normalize,
  };
  const engagements = useTimeseries(filters, { ...shared, metric: 'engagements' });
  const posts = useTimeseries(filters, { ...shared, metric: 'posts' });

  // Narrative-scoped mode: the top-bar narrative filter is what turns the KPI cards
  // into drilldown entry points.
  const narrativeScoped = (filters.narrative_id?.length ?? 0) > 0;

  return (
    <PageShell
      title="Overview"
      description={
        narrativeScoped
          ? 'Scoped to the narratives you selected: how much was posted, by how many accounts, and how it felt.'
          : 'The shape of this corpus: how much was posted, by how many accounts, how it felt, and which posts carry the most risk.'
      }
      filterBar={<FilterBar filters={filters} onChange={patchFilters} onReset={resetFilters} />}
    >
      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          {kpis.isLoading && <SkeletonKpiStrip />}
          {Boolean(kpis.error) && !kpis.isLoading && (
            <ErrorState
              error={kpis.error}
              title="Could not load key metrics"
              onRetry={() => void kpis.refetch()}
            />
          )}
          {kpis.data && (
            <KpiStrip
              bundle={kpis.data}
              onDrilldown={narrativeScoped ? (slice) => setDrilldown(slice) : undefined}
            />
          )}

          {narrativeScoped && (
            <p className="rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-2xs text-muted-foreground">
              Narrative-scoped mode — every metric above is filtered to the selected narrative
              {(filters.narrative_id?.length ?? 0) > 1 ? 's' : ''}, and each card opens its
              breakdown.
            </p>
          )}

          <Tabs value={tab} onValueChange={(v) => setPageParam('tab', v)}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="concepts">Concepts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-3 space-y-3">
              <div className="card-surface flex flex-wrap items-end gap-4 px-4 py-3">
                <ControlSelect
                  id="group-by"
                  label="Split by"
                  value={groupBy}
                  options={GROUP_BYS}
                  onChange={(v) => setPageParam('group_by', v)}
                />
                <ControlSelect
                  id="interval"
                  label="Interval"
                  value={interval}
                  options={INTERVALS}
                  onChange={(v) => setPageParam('interval', v)}
                />
                <ControlSelect
                  id="agg"
                  label="Aggregation"
                  value={agg}
                  options={AGGS}
                  onChange={(v) => setPageParam('agg', v)}
                />
                <ControlSwitch
                  id="stacked"
                  label="Stacked"
                  checked={stacked}
                  onChange={(v) => setPageParam('stacked', String(v))}
                />
                <ControlSwitch
                  id="normalize"
                  label="Normalize"
                  checked={normalize}
                  onChange={(v) => setPageParam('normalize', String(v))}
                />
                <p className="ml-auto max-w-xs text-2xs text-muted-foreground">
                  Both charts share one brush and one x-axis — drag either to scope both.
                </p>
              </div>

              <TimeseriesChart
                title="Engagements over time"
                syncId="overview-timeline"
                response={engagements.data}
                stacked={stacked}
                isLoading={engagements.isLoading}
                error={engagements.error}
                onRetry={() => void engagements.refetch()}
              />
              <TimeseriesChart
                title="Posts over time"
                syncId="overview-timeline"
                response={posts.data}
                stacked={stacked}
                isLoading={posts.isLoading}
                error={posts.error}
                onRetry={() => void posts.refetch()}
              />
            </TabsContent>

            <TabsContent value="concepts" className="mt-3">
              <div className="card-surface p-4">
                <ConceptsPanel
                  filters={filters}
                  onSelectTerm={(term) => patchFilters({ q: term })}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="min-w-0">
          <HighRiskRail
            filters={filters}
            onOpenAuthor={(authorId) => navigate(`/p/${slug}/authors/${authorId}`)}
          />
        </aside>
      </div>

      <KpiDrilldown
        slice={drilldown}
        onOpenChange={(open) => !open && setDrilldown(null)}
        filters={filters}
        onOpenCohorts={() => {
          setDrilldown(null);
          setCohortsOpen(true);
        }}
      />

      <CohortsPanel
        open={cohortsOpen}
        onOpenChange={setCohortsOpen}
        filters={filters}
        onSelectCohort={(cohort) => {
          patchFilters({ cohort_id: [...(filters.cohort_id ?? []), cohort.id] });
          setCohortsOpen(false);
        }}
      />
    </PageShell>
  );
}

function ControlSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger id={id} className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ControlSwitch({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 pb-1.5">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="cursor-pointer normal-case tracking-normal">
        {label}
      </Label>
    </div>
  );
}
