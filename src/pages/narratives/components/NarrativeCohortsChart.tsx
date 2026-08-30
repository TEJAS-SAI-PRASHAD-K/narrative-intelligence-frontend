import type { NarrativeCohortShare } from '@/api/types';
import { EmptyState, ErrorState, SkeletonText } from '@/components/states';
import { CohortsMethodologyNote } from '@/components/cohorts/CohortsPanel';
import { formatCount, formatPct, humanizeEnum } from '@/lib/format';

/**
 * Top cohorts as a horizontal bar chart. Shares are served (`share_pct`); nothing is
 * divided in the browser, so this and the drilldown cannot disagree.
 */
export function NarrativeCohortsChart({
  cohorts,
  isLoading,
  error,
  onRetry,
  onSelect,
}: {
  cohorts: NarrativeCohortShare[] | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  onSelect: (cohortId: string) => void;
}) {
  if (isLoading) return <SkeletonText lines={6} />;
  if (error) return <ErrorState error={error} title="Could not load cohorts" onRetry={onRetry} />;
  if (!cohorts || cohorts.length === 0) {
    return (
      <EmptyState
        title="No cohorts on this narrative"
        description="Cohort assignment runs in the scoring pass; an unscored project has none."
      />
    );
  }

  const max = Math.max(...cohorts.map((c) => c.share_pct), 1);

  return (
    <div className="space-y-2.5">
      <CohortsMethodologyNote />
      <ul className="space-y-1.5">
        {cohorts.map((c) => (
          <li key={c.cohort_id}>
            <div className="flex items-baseline gap-2">
              <button
                type="button"
                onClick={() => onSelect(c.cohort_id)}
                className="min-w-0 truncate rounded-sm text-left text-xs hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {c.name}
              </button>
              <span className="shrink-0 text-2xs text-muted-foreground">
                {humanizeEnum(c.category)}
              </span>
              <span className="ml-auto shrink-0 tabular text-2xs text-muted-foreground">
                {formatCount(c.author_count)} authors · {formatCount(c.post_count)} posts
              </span>
              <span className="w-12 shrink-0 text-right tabular text-2xs font-medium">
                {formatPct(c.share_pct)}
              </span>
            </div>
            <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${(c.share_pct / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
