import { useCallback, useMemo, useState } from 'react';
import { ApiError } from '@/api/client';
import {
  useNarrativeFeed,
  useNarrativeFreshness,
  useNarrativeScore,
  useRecluster,
  useUpdateNarrative,
  type NarrativeSort,
} from '@/api/queries/narratives';
import { CohortsPanel } from '@/components/cohorts/CohortsPanel';
import { FilterBar } from '@/components/filters/FilterBar';
import { FreshnessBar } from '@/components/freshness/FreshnessBar';
import { ScoreExplainer } from '@/components/score/ScoreExplainer';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useJobs } from '@/jobs/JobStore';
import { useProjectContext } from '@/layout/useProjectContext';
import { formatCount } from '@/lib/format';
import { useFilters } from '@/lib/useFilters';
import { ExportDialog } from './components/ExportDialog';
import { NarrativeCard } from './components/NarrativeCard';

const SORTS: { value: NarrativeSort; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'date', label: 'Most recent' },
  { value: 'engagement', label: 'Engagement' },
];

const LIST_DEFAULTS = { sort: 'priority', limit: 25 } as const;

/**
 * 4.2 Narrative Feed. Cursor-paginated, infinite scroll on `next_cursor`.
 *
 * The rename path is the subtle one. `useUpdateNarrative` writes optimistically, and
 * a recluster finishing invalidates the feed -- so the two can race. The optimistic
 * cache entry is keyed on the narrative and reconciled from the server's own
 * response, and a rename in flight is tracked here so the card keeps showing the
 * analyst's text rather than snapping back to the old title mid-edit.
 */
export default function NarrativeFeedPage() {
  const { projectId, slug } = useProjectContext();
  const { filters, list, patchFilters, resetFilters, setList } = useFilters(projectId, LIST_DEFAULTS);
  const { toast } = useToast();
  const { track } = useJobs();

  const [cohortsOpen, setCohortsOpen] = useState(false);
  const [scoreFor, setScoreFor] = useState<string | null>(null);
  /** Renames not yet confirmed by the server, so a refetch cannot visibly undo them. */
  const [pendingRenames, setPendingRenames] = useState<Record<string, string>>({});

  const feed = useNarrativeFeed(filters, list);
  const freshness = useNarrativeFreshness(projectId);
  const recluster = useRecluster();
  const updateNarrative = useUpdateNarrative();
  const score = useNarrativeScore(scoreFor ?? undefined, scoreFor !== null);

  const items = useMemo(
    () => feed.data?.pages.flatMap((p) => p.items) ?? [],
    [feed.data],
  );
  const total = feed.data?.pages[0]?.total ?? null;

  const rename = useCallback(
    async (narrativeId: string, title: string) => {
      setPendingRenames((prev) => ({ ...prev, [narrativeId]: title }));
      try {
        await updateNarrative.mutateAsync({ id: narrativeId, body: { title } });
        setPendingRenames((prev) => {
          const next = { ...prev };
          delete next[narrativeId];
          return next;
        });
        toast({ title: 'Narrative renamed', variant: 'success' });
      } catch (err) {
        setPendingRenames((prev) => {
          const next = { ...prev };
          delete next[narrativeId];
          return next;
        });
        toast({
          title: 'Rename failed',
          description:
            err instanceof ApiError ? `${err.message} (${err.code} · ${err.requestId ?? 'no request id'})` : String(err),
          variant: 'error',
        });
      }
    },
    [updateNarrative, toast],
  );

  async function updateNow() {
    try {
      const accepted = await recluster.mutateAsync(projectId);
      track(accepted, {
        label: 'Recluster narratives',
        href: `/p/${slug}/narratives`,
      });
      toast({
        title: 'Reclustering queued',
        description: 'The feed refreshes when the job finishes. Your edits are preserved.',
      });
    } catch (err) {
      toast({
        title: 'Could not queue reclustering',
        description: err instanceof ApiError ? `${err.message} (${err.code})` : String(err),
        variant: 'error',
      });
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <FilterBar filters={filters} onChange={patchFilters} onReset={resetFilters}>
        <div className="flex items-center gap-1.5">
          <Label htmlFor="feed-sort" className="whitespace-nowrap">
            Sort
          </Label>
          <Select
            value={list.sort ?? 'priority'}
            onValueChange={(v) => setList({ sort: v, cursor: undefined })}
          >
            <SelectTrigger id="feed-sort" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-sm font-semibold">Narratives</h1>
          {total !== null && (
            <span className="text-2xs text-muted-foreground">{formatCount(total)} total</span>
          )}
          <div className="flex-1" />
          <ExportDialog projectId={projectId} slug={slug} filters={filters} />
        </div>

        {freshness.data && (
          <FreshnessBar
            freshness={freshness.data}
            onUpdate={() => void updateNow()}
            updating={recluster.isPending}
          />
        )}
        {Boolean(freshness.error) && (
          <ErrorState error={freshness.error} title="Could not read clustering freshness" compact />
        )}

        {feed.isLoading && (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {Boolean(feed.error) && !feed.isLoading && (
          <ErrorState
            error={feed.error}
            title="Could not load the narrative feed"
            onRetry={() => void feed.refetch()}
          />
        )}

        {!feed.isLoading && !feed.error && items.length === 0 && (
          <EmptyState
            title="No narratives match these filters"
            description="Widen the date range, clear a filter chip, or run a clustering pass if this project has never been clustered."
            action={
              <Button size="sm" variant="outline" onClick={resetFilters}>
                Reset all filters
              </Button>
            }
          />
        )}

        <ul className="space-y-3">
          {items.map((narrative) => (
            <li key={narrative.id}>
              <NarrativeCard
                narrative={
                  pendingRenames[narrative.id] !== undefined
                    ? {
                        ...narrative,
                        title: {
                          text: pendingRenames[narrative.id] as string,
                          provenance: { ...narrative.title.provenance, edited_by_user: true },
                        },
                      }
                    : narrative
                }
                slug={slug}
                tz={filters.tz}
                onRename={(title) => rename(narrative.id, title)}
                isRenaming={pendingRenames[narrative.id] !== undefined}
                onOpenCohorts={() => setCohortsOpen(true)}
                onExplainScore={() => setScoreFor(narrative.id)}
              />
            </li>
          ))}
        </ul>

        {feed.hasNextPage && (
          <div className="flex justify-center pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void feed.fetchNextPage()}
              disabled={feed.isFetchingNextPage}
            >
              {feed.isFetchingNextPage ? 'Loading…' : 'Load more narratives'}
            </Button>
          </div>
        )}
        {!feed.hasNextPage && items.length > 0 && (
          <p className="pt-1 text-center text-2xs text-muted-foreground">
            End of results — {formatCount(items.length)} narrative
            {items.length === 1 ? '' : 's'} shown.
          </p>
        )}
      </div>

      <CohortsPanel
        open={cohortsOpen}
        onOpenChange={setCohortsOpen}
        filters={filters}
        onSelectCohort={(cohort) => {
          patchFilters({ cohort_id: [...(filters.cohort_id ?? []), cohort.id] });
          setCohortsOpen(false);
        }}
      />

      <ScoreExplainer
        open={scoreFor !== null}
        onOpenChange={(open) => !open && setScoreFor(null)}
        explanation={score.data}
        isLoading={score.isLoading}
        error={score.error}
        subjectLabel={
          scoreFor ? `narrative ${items.find((n) => n.id === scoreFor)?.display_id ?? ''}` : ''
        }
      />
    </div>
  );
}
