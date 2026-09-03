import { Play, Radio } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '@/api/client';
import { useIngestRuns, useStartIngest } from '@/api/queries/ops';
import { useProjectSources, useReadiness, useTestSource } from '@/api/queries/projects';
import type { IngestRunOut, SourceHealth, SourceTestResult } from '@/api/types';
import { PageShell } from '@/components/page';
import { EmptyState, ErrorState, SkeletonCard, TechnicalDetails } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/components/ui/toast';
import { useJobs } from '@/jobs/JobStore';
import { useProjectContext } from '@/layout/useProjectContext';
import { formatCount, formatDateTime, humanizeEnum } from '@/lib/format';
import { useFilters } from '@/lib/useFilters';

const HEALTH_VARIANT: Record<
  SourceHealth['status'],
  'risk-low' | 'risk-med' | 'risk-high' | 'muted'
> = {
  ok: 'risk-low',
  never_run: 'muted',
  stale: 'risk-med',
  quota_exhausted: 'risk-med',
  error: 'risk-high',
  skipped: 'muted',
};

const RUN_VARIANT: Record<IngestRunOut['status'], 'risk-low' | 'risk-med' | 'risk-high' | 'muted'> =
  {
    succeeded: 'risk-low',
    running: 'muted',
    pending: 'muted',
    failed: 'risk-high',
    partial: 'risk-med',
    skipped: 'muted',
  };

/**
 * 4.10 Pipeline health.
 *
 * `records_rejected` is rendered with its `rejection_reasons` expanded, never
 * collapsed behind a total. Phase 1 and Phase 4 both treat silent data loss as the
 * cardinal sin; this screen is where it finally becomes visible to a person, and a
 * rejection count with no reason attached is only marginally better than no count.
 */
export default function SourcesPage() {
  const { projectId } = useProjectContext();
  const { filters } = useFilters(projectId);
  const { toast } = useToast();
  const { track } = useJobs();

  const sources = useProjectSources(projectId);
  const runs = useIngestRuns(projectId);
  const readiness = useReadiness();
  const testSource = useTestSource(projectId);
  const startIngest = useStartIngest();

  const [results, setResults] = useState<Record<string, SourceTestResult>>({});

  function test(source: string) {
    testSource.mutate(source, {
      onSuccess: (result) => setResults((prev) => ({ ...prev, [source]: result })),
      onError: (err) =>
        toast({
          title: `Could not test ${source}`,
          description: err instanceof ApiError ? err.message : String(err),
          variant: 'error',
        }),
    });
  }

  async function ingest(source: SourceHealth['source']) {
    try {
      const accepted = await startIngest.mutateAsync({
        project_id: projectId,
        sources: [source],
        mode: 'both',
        // The generated type marks fields with server-side defaults as required, so
        // every one is passed explicitly rather than relied on.
        force: false,
      });
      track(accepted, { label: `Ingest ${source}` });
      toast({ title: `Ingest queued for ${source}` });
    } catch (err) {
      toast({
        title: 'Could not queue ingest',
        description: err instanceof ApiError ? `${err.message} (${err.code})` : String(err),
        variant: 'error',
      });
    }
  }

  return (
    <PageShell
      title="Sources"
      description="Where this project's posts come from. Each source shows when it last brought data in, how much, and whether it is set up at all."
      bodyClassName="gap-6"
    >
      {readiness.data && (
        <section className="space-y-2 card-surface p-4">
          <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Subsystems
          </h2>
          <div className="flex flex-wrap gap-2">
            {readiness.data.subsystems.map((s) => (
              <Badge
                key={s.name}
                variant={
                  s.status === 'up'
                    ? 'risk-low'
                    : s.status === 'degraded'
                      ? 'risk-med'
                      : 'risk-high'
                }
                title={s.detail}
              >
                {s.name}: {s.status}
              </Badge>
            ))}
          </div>
          {(readiness.data.capabilities?.length ?? 0) > 0 && (
            <Accordion type="single" collapsible>
              <AccordionItem value="capabilities" className="border-b-0">
                <AccordionTrigger className="text-2xs uppercase tracking-wide text-muted-foreground">
                  Model capabilities
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-1.5">
                    {readiness.data.capabilities?.map((cap, i) => {
                      const c = cap as Record<string, unknown>;
                      return (
                        <li key={String(c.name ?? i)} className="text-2xs">
                          <span className="font-medium">{String(c.name ?? 'capability')}</span>{' '}
                          <Badge variant={c.available ? 'risk-low' : 'risk-med'}>
                            {String(c.status ?? (c.available ? 'available' : 'unavailable'))}
                          </Badge>
                          {typeof c.detail === 'string' && (
                            <p className="mt-0.5 text-muted-foreground">{c.detail}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sources
        </h2>
        {sources.isLoading && <SkeletonCard />}
        {Boolean(sources.error) && (
          <ErrorState error={sources.error} onRetry={() => void sources.refetch()} />
        )}
        {!sources.isLoading && (sources.data?.length ?? 0) === 0 && (
          <EmptyState icon={<Radio className="h-6 w-6" />} title="No sources configured" />
        )}

        <ul className="grid gap-2 md:grid-cols-2">
          {(sources.data ?? []).map((s) => {
            const result = results[s.source];
            return (
              <li key={s.source} className="space-y-2 card-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium">{humanizeEnum(s.source)}</span>
                  <Badge variant={HEALTH_VARIANT[s.status]}>{humanizeEnum(s.status)}</Badge>
                  {!s.configured && <Badge variant="muted">not configured</Badge>}
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => test(s.source)}
                    disabled={testSource.isPending}
                  >
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void ingest(s.source)}
                    aria-label={`Run ingest for ${s.source}`}
                  >
                    <Play className="h-3 w-3" aria-hidden="true" />
                    Ingest
                  </Button>
                </div>

                {s.configured ? (
                  <p className="text-2xs text-muted-foreground">{s.detail}</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-2xs text-muted-foreground">
                      This source has no credentials on this backend, so nothing is being
                      collected from it. Everything below is from the last time it ran.
                    </p>
                    {s.detail && (
                      <TechnicalDetails label="What the server reported">
                        <p className="break-words text-2xs text-muted-foreground">
                          <span className="select-all">{s.detail}</span>
                        </p>
                      </TechnicalDetails>
                    )}
                  </div>
                )}

                <dl className="flex flex-wrap gap-x-4 gap-y-1 text-2xs">
                  <Stat
                    label="Last sync"
                    value={s.last_sync_at ? formatDateTime(s.last_sync_at, filters.tz) : 'never'}
                  />
                  <Stat label="Records" value={formatCount(s.record_count)} />
                  {s.quota_limit !== null && s.quota_limit !== undefined && (
                    <Stat
                      label="Quota"
                      value={`${formatCount(s.quota_used ?? 0)} / ${formatCount(s.quota_limit)}`}
                    />
                  )}
                  {s.quota_resets_at && (
                    <Stat
                      label="Quota resets"
                      value={formatDateTime(s.quota_resets_at, filters.tz)}
                    />
                  )}
                </dl>

                {result && (
                  <div className="rounded-md border border-border bg-surface-sunken px-2.5 py-2 text-2xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={result.reachable ? 'risk-low' : 'risk-high'}>
                        {result.reachable ? 'reachable' : 'unreachable'}
                      </Badge>
                      <Badge variant={result.authenticated ? 'risk-low' : 'risk-med'}>
                        {result.authenticated ? 'authenticated' : 'not authenticated'}
                      </Badge>
                      {result.latency_ms !== null && result.latency_ms !== undefined && (
                        <span className="tabular text-muted-foreground">
                          {result.latency_ms.toFixed(0)} ms
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-muted-foreground">{result.detail}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ingest runs
        </h2>
        {runs.isLoading && <SkeletonCard />}
        {Boolean(runs.error) && (
          <ErrorState error={runs.error} onRetry={() => void runs.refetch()} />
        )}
        {!runs.isLoading && (runs.data?.items.length ?? 0) === 0 && (
          <EmptyState title="No ingest runs recorded for this project" />
        )}

        <ul className="space-y-2">
          {(runs.data?.items ?? []).map((run) => (
            <IngestRunRow key={run.id} run={run} tz={filters.tz} />
          ))}
        </ul>
      </section>
    </PageShell>
  );
}

function IngestRunRow({ run, tz }: { run: IngestRunOut; tz: string }) {
  const rejected = run.records_rejected ?? 0;
  const reasons = Object.entries(run.rejection_reasons ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <li className="space-y-2 card-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium">{humanizeEnum(run.source)}</span>
        <Badge variant={RUN_VARIANT[run.status]}>{humanizeEnum(run.status)}</Badge>
        {run.mode && <Badge variant="muted">{run.mode}</Badge>}
        <div className="flex-1" />
        <span className="tabular text-2xs text-muted-foreground">
          {run.started_at ? formatDateTime(run.started_at, tz) : '—'}
          {run.finished_at ? ` → ${formatDateTime(run.finished_at, tz)}` : ''}
        </span>
      </div>

      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-2xs">
        <Stat label="In" value={formatCount(run.records_in)} />
        <Stat label="Loaded" value={formatCount(run.records_loaded)} />
        <Stat
          label="Rejected"
          value={
            <span className={rejected > 0 ? 'font-medium text-risk-med' : undefined}>
              {formatCount(rejected)}
            </span>
          }
        />
        {run.manifest_sha && (
          <Stat
            label="Manifest"
            value={<span className="font-mono">{run.manifest_sha.slice(0, 10)}</span>}
          />
        )}
      </dl>

      {run.detail && <p className="text-2xs text-muted-foreground">{run.detail}</p>}

      {/*
        Rejection reasons are shown, never hidden behind the total. A run that says
        "12,400 in, 11,900 loaded" and nothing else has quietly lost 500 records.
      */}
      {rejected > 0 && (
        <div className="rounded-md border border-risk-med/40 bg-risk-med-bg p-2.5">
          <p className="text-2xs font-semibold uppercase tracking-wide text-risk-med">
            Why {formatCount(rejected)} record{rejected === 1 ? ' was' : 's were'} rejected
          </p>
          {reasons.length === 0 ? (
            <p className="mt-1 text-2xs">
              The run reported no breakdown. That is itself a gap worth chasing — records were
              dropped and nothing says why.
            </p>
          ) : (
            <ul className="mt-1 space-y-0.5">
              {reasons.map(([reason, count]) => (
                <li key={reason} className="flex items-baseline gap-2 text-2xs">
                  <span className="min-w-0 flex-1 truncate">{reason}</span>
                  <span className="tabular font-medium">{formatCount(count)}</span>
                </li>
              ))}
            </ul>
          )}
          {run.rejects_path && (
            <p className="mt-1 font-mono text-2xs text-muted-foreground">
              Rejects written to <span className="select-all">{run.rejects_path}</span>
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}
