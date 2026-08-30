import { useHighRiskPosts } from '@/api/queries/overview';
import { OriginalPost } from '@/components/post/OriginalPost';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/states';
import type { FilterSpec } from '@/lib/filters';
import { formatScore100 } from '@/lib/format';

/**
 * The right rail: the posts the scorer flagged, each with `reasons[]` rendered as
 * chips. The reasons are the point -- "this post is high risk" is not actionable,
 * "this post is high risk because it was posted by three accounts within four minutes
 * linking a domain registered last week" is.
 */
export function HighRiskRail({
  filters,
  onOpenAuthor,
}: {
  filters: FilterSpec;
  onOpenAuthor: (authorId: string) => void;
}) {
  const { data, isLoading, error, refetch } = useHighRiskPosts(filters, { limit: 12 });

  return (
    <section aria-label="High risk posts" className="space-y-2">
      <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        High risk posts
      </h2>

      {isLoading && (
        <div className="space-y-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {Boolean(error) && !isLoading && (
        <ErrorState error={error} compact onRetry={() => void refetch()} />
      )}

      {!isLoading && !error && (data?.items.length ?? 0) === 0 && (
        <EmptyState
          title="Nothing flagged"
          description="No post in this window crossed the risk threshold. That is a result, not an error."
        />
      )}

      <ul className="space-y-2">
        {(data?.items ?? []).map((entry) => (
          <li key={entry.post.id} className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xs uppercase tracking-wide text-muted-foreground">
                {/* HighRiskPost.risk_score is 0-100, like AuthorOut.risk_score. */}
                Risk {formatScore100(entry.risk_score)}
              </span>
              {entry.narrative_title && (
                <span className="min-w-0 truncate text-2xs text-muted-foreground">
                  {entry.narrative_title}
                </span>
              )}
            </div>
            <OriginalPost
              post={entry.post}
              tz={filters.tz}
              reasons={entry.reasons}
              onOpenAuthor={onOpenAuthor}
              compact
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
