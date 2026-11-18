import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuthorCohorts, useAuthorNarratives } from '@/api/queries/entities';
import type { CohortMembership, CohortOut, NarrativeSummary } from '@/api/types';
import { MeasuredCount } from '@/components/risk/MeasuredCount';
import { EmptyState, ErrorState, SkeletonText } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toListState, type ListState } from './listState';
import { formatCount, formatScore, humanizeEnum } from '@/lib/format';

function Section({
  title,
  total,
  shown,
  children,
}: {
  title: string;
  total: number | undefined;
  shown: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
        {total !== undefined && shown > 0 && (
          <span className="ml-1.5 font-normal normal-case tracking-normal tabular">
            {shown < total ? `${formatCount(shown)} of ${formatCount(total)}` : formatCount(total)}
          </span>
        )}
      </h3>
      {children}
    </section>
  );
}

function LoadMore({ state, label }: { state: ListState<unknown>; label: string }) {
  if (!state.hasNextPage) return null;
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={state.isFetchingNextPage}
      onClick={state.onLoadMore}
    >
      {state.isFetchingNextPage ? 'Loading…' : label}
    </Button>
  );
}

/**
 * Cohorts the author belongs to. `memberships` is the author's embedded
 * `CohortMembership[]`, used only to say who assigned a cohort and how confidently,
 * which the list route does not carry.
 */
export function AuthorCohortsView({
  state,
  memberships,
}: {
  state: ListState<CohortOut>;
  memberships?: CohortMembership[] | undefined;
}) {
  const byId = new Map((memberships ?? []).map((m) => [m.cohort_id, m]));

  return (
    <Section title="Cohorts" total={state.total} shown={state.items.length}>
      {state.isLoading && <SkeletonText lines={2} />}
      {Boolean(state.error) && !state.isLoading && (
        <ErrorState
          error={state.error}
          title="Could not load this author's cohorts"
          compact
          onRetry={state.onRetry}
        />
      )}
      {!state.isLoading && !state.error && state.items.length === 0 && (
        <EmptyState
          title="No cohorts"
          description="This author is not a member of any cohort."
          className="py-6"
        />
      )}
      {state.items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {state.items.map((c) => {
            const m = byId.get(c.id);
            return (
              <li key={c.id}>
                <Badge variant="outline" className="gap-1">
                  {c.name}
                  <span className="text-muted-foreground">
                    {humanizeEnum(c.category)}
                    {m && m.confidence !== null && m.confidence !== undefined
                      ? ` · ${formatScore(m.confidence)}`
                      : ''}
                  </span>
                  {m && (
                    <span className="text-muted-foreground">
                      {m.assigned_by === 'analyst' ? '· analyst' : '· model'}
                    </span>
                  )}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
      {!state.error && <LoadMore state={state} label="Load more cohorts" />}
    </Section>
  );
}

/** Narratives the author posted in, each linking to its detail page. */
export function AuthorNarrativesView({
  state,
  slug,
}: {
  state: ListState<NarrativeSummary>;
  slug: string | undefined;
}) {
  return (
    <Section title="Narratives touched" total={state.total} shown={state.items.length}>
      {state.isLoading && <SkeletonText lines={3} />}
      {Boolean(state.error) && !state.isLoading && (
        <ErrorState
          error={state.error}
          title="Could not load this author's narratives"
          compact
          onRetry={state.onRetry}
        />
      )}
      {!state.isLoading && !state.error && state.items.length === 0 && (
        <EmptyState
          title="No narratives"
          description="None of this author's posts are in a narrative yet."
          className="py-6"
        />
      )}
      {state.items.length > 0 && (
        <ul className="space-y-1">
          {state.items.map((n) => {
            const title = n.title.text ?? 'Untitled narrative';
            return (
              <li
                key={n.id}
                className="flex items-baseline justify-between gap-3 rounded-md border border-border px-2.5 py-1.5"
              >
                <div className="min-w-0">
                  {slug ? (
                    <Link
                      to={`/p/${slug}/narratives/${n.id}`}
                      className="rounded-sm text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {title}
                    </Link>
                  ) : (
                    <span className="text-xs font-medium">{title}</span>
                  )}
                  <p className="font-mono text-2xs text-muted-foreground">ID: {n.display_id}</p>
                </div>
                <dl className="flex shrink-0 gap-3 text-2xs text-muted-foreground">
                  <div>
                    <dt className="sr-only">Posts</dt>
                    <dd className="tabular">{formatCount(n.post_count)} posts</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Engagement</dt>
                    <dd>
                      <MeasuredCount value={n.engagement_total} />
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
      {!state.error && <LoadMore state={state} label="Load more narratives" />}
    </Section>
  );
}

export function AuthorCohorts({
  authorId,
  projectId,
  memberships,
}: {
  authorId: string;
  projectId: string;
  memberships?: CohortMembership[] | undefined;
}) {
  const q = useAuthorCohorts(authorId, projectId);
  return <AuthorCohortsView state={toListState(q)} memberships={memberships} />;
}

export function AuthorNarratives({
  authorId,
  projectId,
  slug,
}: {
  authorId: string;
  projectId: string;
  slug: string | undefined;
}) {
  const q = useAuthorNarratives(authorId, projectId);
  return <AuthorNarrativesView state={toListState(q)} slug={slug} />;
}
