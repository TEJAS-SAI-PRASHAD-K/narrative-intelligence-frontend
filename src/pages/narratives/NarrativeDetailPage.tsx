import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import {
  useCompass,
  useCompassFeedback,
  useNarrative,
  useNarrativeCohorts,
  useNarrativeScore,
  useNarrativeTimeline,
  useRegenerateCompass,
  useUpdateNarrative,
} from '@/api/queries/narratives';
import { AiBlock } from '@/components/ai/AiBlock';
import { AiPill } from '@/components/ai/AiPill';
import { CohortsPanel } from '@/components/cohorts/CohortsPanel';
import { CompassModule } from '@/components/compass/CompassModule';
import { RiskScorecard } from '@/components/risk/RiskScorecard';
import { ScoreExplainer } from '@/components/score/ScoreExplainer';
import { PageShell } from '@/components/page';
import { EmptyState, ErrorState, SkeletonCard, SkeletonText } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useJobs } from '@/jobs/JobStore';
import { useProjectContext } from '@/layout/useProjectContext';
import { MeasuredCount } from '@/components/risk/MeasuredCount';
import { formatCount, formatDateRange, formatDateTime, platformLabel } from '@/lib/format';
import { useFilters } from '@/lib/useFilters';
import { ContentHighlights } from './components/ContentHighlights';
import { ExportDialog } from './components/ExportDialog';
import { InlineEditTitle } from './components/InlineEditTitle';
import { NarrativeCohortsChart } from './components/NarrativeCohortsChart';
import { NarrativeTimelineChart } from './components/NarrativeTimelineChart';

/**
 * 4.3 Narrative Detail. The Compass Context module lives here.
 *
 * The right sidebar is sticky and carries the scorecard plus the hard counts, so the
 * numbers stay on screen while the analyst reads the generated text -- the whole point
 * being that a claim and the evidence for it should be legible together.
 */
export default function NarrativeDetailPage() {
  const { narrativeId } = useParams<{ narrativeId: string }>();
  const { projectId, slug } = useProjectContext();
  const navigate = useNavigate();
  const { filters, pageParams, setPageParam } = useFilters(projectId);
  const { toast } = useToast();
  const { track } = useJobs();

  const [explainerOpen, setExplainerOpen] = useState(false);
  const [cohortsOpen, setCohortsOpen] = useState(false);

  const crossPlatform = pageParams.get('cross_platform') === 'true';
  const interval = pageParams.get('n_interval') ?? '1d';

  const narrative = useNarrative(narrativeId);
  const score = useNarrativeScore(narrativeId, explainerOpen);
  const timeline = useNarrativeTimeline(narrativeId, {
    interval,
    tz: filters.tz,
    cross_platform: crossPlatform,
  });
  const cohorts = useNarrativeCohorts(narrativeId);
  const compass = useCompass(narrativeId, narrative.data?.compass_available !== false);

  const updateNarrative = useUpdateNarrative();
  const regenerate = useRegenerateCompass();
  const feedback = useCompassFeedback();

  if (narrative.isLoading) {
    return (
      <div className="space-y-3 px-4 py-5 lg:px-6">
        <SkeletonText lines={2} />
        <SkeletonCard />
      </div>
    );
  }

  if (narrative.error) {
    return (
      <div className="px-4 py-5 lg:px-6">
        <ErrorState
          error={narrative.error}
          title="Could not load this narrative"
          onRetry={() => void narrative.refetch()}
        />
      </div>
    );
  }

  const n = narrative.data;
  if (!n) {
    return (
      <div className="px-4 py-5 lg:px-6">
        <EmptyState title="Narrative not found" />
      </div>
    );
  }

  async function saveTitle(title: string) {
    if (!narrativeId) return;
    try {
      await updateNarrative.mutateAsync({ id: narrativeId, body: { title } });
      toast({ title: 'Narrative renamed', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Rename failed',
        description: err instanceof ApiError ? `${err.message} (${err.code})` : String(err),
        variant: 'error',
      });
    }
  }

  async function regenerateCompass() {
    if (!narrativeId) return;
    try {
      const accepted = await regenerate.mutateAsync(narrativeId);
      track(accepted, {
        label: 'Regenerate Compass context',
        href: `/p/${slug}/narratives/${narrativeId}`,
      });
      toast({
        title: 'Compass regeneration queued',
        description: 'The new context replaces this one when the job finishes.',
      });
    } catch (err) {
      toast({
        title: 'Could not queue regeneration',
        description: err instanceof ApiError ? `${err.message} (${err.code})` : String(err),
        variant: 'error',
      });
    }
  }

  function sendFeedback(helpful: boolean) {
    const contextId = compass.data?.id;
    if (!contextId) return;
    feedback.mutate(
      { contextId, body: { helpful } },
      {
        onSuccess: (result) =>
          toast({
            title: 'Feedback recorded',
            description: `${result.helpful_count} helpful · ${result.unhelpful_count} unhelpful`,
            variant: 'success',
          }),
        onError: (err) =>
          toast({
            title: 'Could not record feedback',
            description: err instanceof ApiError ? err.message : String(err),
            variant: 'error',
          }),
      },
    );
  }

  return (
    <PageShell
      breadcrumb={[
        { label: 'Narratives', to: `/p/${slug}/narratives` },
        { label: `#${n.display_id}` },
      ]}
      title={n.title.text ?? 'Untitled narrative'}
      titleSlot={
        <InlineEditTitle
          value={n.title.text ?? 'Untitled narrative'}
          onSave={saveTitle}
          isSaving={updateNarrative.isPending}
          label="Rename narrative"
        />
      }
      description="One story running through this corpus: what it claims, where that claim came from, who is spreading it, and how the risk score was reached."
      meta={
        <>
          <Badge variant="muted" className="font-mono">
            ID: {n.display_id}
          </Badge>
          {n.is_manual && <Badge variant="outline">Manual</Badge>}
          <AiPill provenance={n.title.provenance} />
        </>
      }
      actions={
        <ExportDialog
          projectId={projectId}
          slug={slug}
          filters={filters}
          narrativeIds={narrativeId ? [narrativeId] : []}
        />
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          {n.claim && <p className="text-sm italic text-muted-foreground">“{n.claim}”</p>}

          <AiBlock title="Summary" value={n.summary} />

          {/* The differentiator. */}
          {compass.isLoading && <SkeletonCard />}
          {Boolean(compass.error) && !compass.isLoading && (
            <ErrorState
              error={compass.error}
              title="Could not load Compass Context"
              onRetry={() => void compass.refetch()}
            />
          )}
          {compass.data && (
            <CompassModule
              context={compass.data}
              onRegenerate={() => void regenerateCompass()}
              onFeedback={sendFeedback}
              regenerating={regenerate.isPending}
            />
          )}
          {!compass.isLoading && !compass.error && !compass.data && (
            <EmptyState
              title="No Compass context generated yet"
              description="Compass retrieves and cites external sources for a narrative's central claim."
              action={
                <Button size="sm" onClick={() => void regenerateCompass()}>
                  Generate context
                </Button>
              }
            />
          )}

          <NarrativeTimelineChart
            timeline={timeline.data}
            isLoading={timeline.isLoading}
            error={timeline.error}
            onRetry={() => void timeline.refetch()}
            crossPlatform={crossPlatform}
            onCrossPlatformChange={(v) => setPageParam('cross_platform', String(v))}
          />

          <section className="space-y-2 card-surface p-4">
            <h2 className="text-xs font-semibold">Top cohorts</h2>
            <NarrativeCohortsChart
              cohorts={cohorts.data}
              isLoading={cohorts.isLoading}
              error={cohorts.error}
              onRetry={() => void cohorts.refetch()}
              onSelect={() => setCohortsOpen(true)}
            />
          </section>

          {narrativeId && (
            <ContentHighlights
              narrativeId={narrativeId}
              filters={filters}
              onOpenAuthor={(authorId) => navigate(`/p/${slug}/authors/${authorId}`)}
            />
          )}
        </div>

        {/* Sticky sidebar: the numbers stay visible while the generated text is read. */}
        <aside className="min-w-0">
          <div className="sticky top-4 space-y-3">
            <section className="space-y-2.5 card-surface p-4">
              <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Risk scorecard
              </h2>
              <RiskScorecard
                scorecard={n.scorecard}
                layout="grid"
                onExplain={() => setExplainerOpen(true)}
              />
            </section>

            <section className="space-y-1.5 card-surface p-4">
              <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Hard stats
              </h2>
              <dl className="space-y-1 text-xs">
                <Stat
                  label="Date range"
                  value={formatDateRange(n.date_start, n.date_end, filters.tz)}
                />
                <Stat label="Engagements" value={<MeasuredCount value={n.engagement_total} />} />
                <Stat label="Posts" value={formatCount(n.post_count)} />
                <Stat label="Authors" value={formatCount(n.author_count)} />
                {n.velocity !== null && n.velocity !== undefined && (
                  <Stat label="Velocity" value={n.velocity.toFixed(2)} />
                )}
                {n.coherence !== null && n.coherence !== undefined && (
                  <Stat label="Coherence" value={n.coherence.toFixed(3)} />
                )}
                {n.updated_at && (
                  <Stat label="Updated" value={formatDateTime(n.updated_at, filters.tz)} />
                )}
              </dl>

              {(n.platforms?.length ?? 0) > 0 && (
                <div className="pt-1">
                  <p className="mb-1 text-2xs uppercase tracking-wide text-muted-foreground">
                    Platforms
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {n.platforms?.map((p) => (
                      <Badge key={p} variant="muted">
                        {platformLabel(p)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {(n.representative_posts?.length ?? 0) > 0 && (
              <section className="space-y-2">
                <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Representative post
                </h2>
                {n.representative_posts?.slice(0, 1).map((rp) => (
                  <div key={rp.post_id} className="card-surface p-4">
                    <p className="text-2xs text-muted-foreground">
                      @{rp.author_handle ?? 'unknown'} · {platformLabel(rp.source)} ·{' '}
                      {formatDateTime(rp.timestamp, filters.tz)}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed">{rp.text}</p>
                    {rp.membership_score !== null && rp.membership_score !== undefined && (
                      <p className="mt-1.5 font-mono text-2xs text-muted-foreground">
                        membership {rp.membership_score.toFixed(3)}
                      </p>
                    )}
                  </div>
                ))}
              </section>
            )}
          </div>
        </aside>

        <ScoreExplainer
          open={explainerOpen}
          onOpenChange={setExplainerOpen}
          explanation={score.data}
          isLoading={score.isLoading}
          error={score.error}
          subjectLabel={`narrative ${n.display_id}`}
        />

        <CohortsPanel open={cohortsOpen} onOpenChange={setCohortsOpen} filters={filters} />
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular text-right">{value}</dd>
    </div>
  );
}
