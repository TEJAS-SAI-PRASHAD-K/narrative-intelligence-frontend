import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useAuthor,
  useAuthorPosts,
  useAuthorScore,
  useAuthorTimeline,
} from '@/api/queries/entities';
import { OriginalPost } from '@/components/post/OriginalPost';
import { ScoreExplainer } from '@/components/score/ScoreExplainer';
import { PageShell } from '@/components/page';
import { EmptyState, ErrorState, SkeletonCard, SkeletonText } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProjectContext } from '@/layout/useProjectContext';
import {
  formatCount,
  formatDateTime,
  formatScore,
  humanizeEnum,
  platformLabel,
} from '@/lib/format';
import { useFilters } from '@/lib/useFilters';
import { AuthorStats } from './components/AuthorPanel';

/**
 * Full author profile. Same data as the slide-over, given room: the activity timeline
 * and the post list are the two things an analyst scrolls, so they get the width.
 */
export default function AuthorPage() {
  const { authorId } = useParams<{ authorId: string }>();
  const { projectId, slug } = useProjectContext();
  const { filters } = useFilters(projectId);
  const [explainerOpen, setExplainerOpen] = useState(false);

  const author = useAuthor(authorId);
  const score = useAuthorScore(authorId, explainerOpen);
  const posts = useAuthorPosts(authorId, { limit: 50 });
  const timeline = useAuthorTimeline(authorId, { interval: '1d', tz: filters.tz });

  if (author.isLoading) {
    return (
      <div className="space-y-3 px-4 py-5 lg:px-6">
        <SkeletonText lines={3} />
        <SkeletonCard />
      </div>
    );
  }

  if (author.error) {
    return (
      <div className="px-4 py-5 lg:px-6">
        <ErrorState
          error={author.error}
          title="Could not load this author"
          onRetry={() => void author.refetch()}
        />
      </div>
    );
  }

  const a = author.data;
  if (!a) {
    return (
      <div className="px-4 py-5 lg:px-6">
        <EmptyState title="Author not found" />
      </div>
    );
  }

  return (
    <PageShell
      breadcrumb={[
        { label: 'Drivers', to: `/p/${slug}/drivers` },
        { label: `@${a.handle ?? a.author_id}` },
      ]}
      title={`@${a.handle ?? a.author_id}`}
      description="One account: what it posts, how often, how it scored for bot-like and anomalous behaviour, and which narratives it appears in."
      meta={
        <>
          <Badge variant="muted">{platformLabel(a.source)}</Badge>
          {a.is_bot_flagged && <Badge variant="risk-high">Flagged bot-like</Badge>}
        </>
      }
      actions={
        <Button size="sm" variant="outline" onClick={() => setExplainerOpen(true)}>
          Why this score?
        </Button>
      }
      bodyClassName="gap-4"
    >
      <p className="font-mono text-2xs text-muted-foreground">
        author_id <span className="select-all">{a.author_id}</span>
        {a.scoring_version ? ` · scoring ${a.scoring_version}` : ''}
      </p>

      <section className="card-surface p-4">
        <AuthorStats author={a} tz={filters.tz} />
      </section>

      {(a.cohorts?.length ?? 0) > 0 && (
        <section className="space-y-1.5">
          <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cohorts
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {a.cohorts?.map((c) => (
              <Badge key={c.cohort_id} variant="outline" className="gap-1">
                {c.name}
                <span className="text-muted-foreground">
                  {humanizeEnum(c.category)}
                  {c.confidence !== null && c.confidence !== undefined
                    ? ` · ${formatScore(c.confidence)}`
                    : ''}{' '}
                  · {c.assigned_by === 'analyst' ? 'analyst' : 'model'}
                </span>
              </Badge>
            ))}
          </div>
        </section>
      )}

      {(a.author_group_ids?.length ?? 0) > 0 && (
        <section className="space-y-1.5">
          <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Author groups
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {a.author_group_ids?.map((id) => (
              <Badge key={id} variant="muted" className="font-mono">
                {id}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {(a.narratives_touched?.length ?? 0) > 0 && (
        <section className="space-y-1.5">
          <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Narratives touched
          </h2>
          {/* Ids only -- the contract returns no titles here (contract-gaps #9). */}
          <ul className="flex flex-wrap gap-1.5">
            {a.narratives_touched?.map((id) => (
              <li key={id}>
                <Link
                  to={`/p/${slug}/narratives/${id}`}
                  className="rounded-sm font-mono text-2xs text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {id.slice(0, 8)}…
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Activity
        </h2>
        {timeline.isLoading && <SkeletonText lines={4} />}
        {Boolean(timeline.error) && <ErrorState error={timeline.error} compact />}
        {timeline.data && timeline.data.points.length > 0 && (
          <div className="card-surface p-4">
            <table className="w-full text-xs">
              <caption className="sr-only">Posting activity by bucket</caption>
              <thead>
                <tr className="text-2xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="py-1 text-left">
                    Bucket
                  </th>
                  <th scope="col" className="py-1 text-right">
                    Posts
                  </th>
                  <th scope="col" className="py-1 text-right">
                    Engagement
                  </th>
                  <th scope="col" className="py-1 text-right">
                    Mean toxicity
                  </th>
                </tr>
              </thead>
              <tbody>
                {timeline.data.points.slice(-14).map((p) => (
                  <tr key={p.bucket_start} className="border-t border-border">
                    <td className="py-1 tabular">{formatDateTime(p.bucket_start, filters.tz)}</td>
                    <td className="py-1 text-right tabular">{formatCount(p.post_count)}</td>
                    <td className="py-1 text-right tabular">{formatCount(p.engagement)}</td>
                    <td className="py-1 text-right tabular">
                      {p.mean_toxicity === null || p.mean_toxicity === undefined
                        ? '—'
                        : p.mean_toxicity.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Posts
        </h2>
        {posts.isLoading && <SkeletonCard />}
        {Boolean(posts.error) && (
          <ErrorState error={posts.error} onRetry={() => void posts.refetch()} />
        )}
        {!posts.isLoading && (posts.data?.items.length ?? 0) === 0 && (
          <EmptyState title="No posts returned for this author" />
        )}
        <ul className="space-y-2">
          {(posts.data?.items ?? []).map((p) => (
            <li key={p.id}>
              <OriginalPost post={p} tz={filters.tz} />
            </li>
          ))}
        </ul>
      </section>

      <ScoreExplainer
        open={explainerOpen}
        onOpenChange={setExplainerOpen}
        explanation={score.data}
        isLoading={score.isLoading}
        error={score.error}
        subjectLabel={`@${a.handle ?? a.author_id}`}
      />
    </PageShell>
  );
}
