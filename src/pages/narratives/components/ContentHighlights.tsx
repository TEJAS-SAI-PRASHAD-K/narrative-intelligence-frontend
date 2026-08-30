import { useState } from 'react';
import { useNarrativeAuthors, useNarrativePosts } from '@/api/queries/narratives';
import type { AuthorOut, PostOut } from '@/api/types';
import { OriginalPost } from '@/components/post/OriginalPost';
import { ScoreCell } from '@/components/risk/ScoreCell';
import { EmptyState, ErrorState, SkeletonCard, SkeletonTableRows } from '@/components/states';
import { EntityTable } from '@/components/table/EntityTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { FilterSpec } from '@/lib/filters';
import { formatCount, platformLabel } from '@/lib/format';

/**
 * Top Posts | Top Authors for one narrative. Rows open the full post or the author
 * slide-over rather than navigating away, so the analyst keeps their place.
 */
export function ContentHighlights({
  narrativeId,
  filters,
  onOpenAuthor,
}: {
  narrativeId: string;
  filters: FilterSpec;
  onOpenAuthor: (authorId: string) => void;
}) {
  const [tab, setTab] = useState('posts');

  const posts = useNarrativePosts(narrativeId, filters, { limit: 25 });
  const authors = useNarrativeAuthors(narrativeId, filters, { limit: 50 });

  return (
    <section className="space-y-2">
      <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        Content highlights
      </h2>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="posts">Top posts</TabsTrigger>
          <TabsTrigger value="authors">Top authors</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-3 space-y-2">
          {posts.isLoading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}
          {Boolean(posts.error) && !posts.isLoading && (
            <ErrorState error={posts.error} onRetry={() => void posts.refetch()} />
          )}
          {!posts.isLoading && !posts.error && (posts.data?.items.length ?? 0) === 0 && (
            <EmptyState title="No posts match these filters in this narrative" />
          )}
          <ul className="space-y-2">
            {(posts.data?.items ?? []).map((post: PostOut) => (
              <li key={post.id}>
                <OriginalPost post={post} tz={filters.tz} onOpenAuthor={onOpenAuthor} compact />
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="authors" className="mt-3">
          {authors.isLoading ? (
            <table className="w-full text-xs">
              <tbody>
                <SkeletonTableRows rows={6} columns={5} />
              </tbody>
            </table>
          ) : (
            <EntityTable
              tableId="narrative-authors"
              caption="Authors contributing to this narrative"
              columns={[
                {
                  id: 'handle',
                  header: 'Author',
                  cell: (a: AuthorOut) => (
                    <span className="truncate font-medium">@{a.handle ?? a.author_id}</span>
                  ),
                },
                {
                  id: 'source',
                  header: 'Platform',
                  cell: (a) => platformLabel(a.source),
                },
                {
                  id: 'posts',
                  header: 'Posts',
                  align: 'right',
                  cell: (a) => <span className="tabular">{formatCount(a.post_count)}</span>,
                },
                {
                  id: 'risk',
                  header: 'Risk',
                  headerHint: 'AuthorOut.risk_score is 0-100, not a percentage.',
                  cell: (a) => <ScoreCell value={a.risk_score} scale="hundred" />,
                },
                {
                  id: 'bot',
                  header: 'Bot-like',
                  cell: (a) => <ScoreCell value={a.bot_score} scale="unit" />,
                },
              ]}
              rows={authors.data?.items ?? []}
              rowKey={(a) => a.author_id}
              error={authors.error}
              onRetry={() => void authors.refetch()}
              onRowClick={(a) => onOpenAuthor(a.author_id)}
              emptyTitle="No authors match these filters in this narrative"
              maxHeight="24rem"
            />
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
