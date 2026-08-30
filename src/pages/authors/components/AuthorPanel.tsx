import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthor, useAuthorPosts, useAuthorScore, useAuthorTimeline } from '@/api/queries/entities';
import type { AuthorOut } from '@/api/types';
import { OriginalPost } from '@/components/post/OriginalPost';
import { NotMeasured } from '@/components/risk/NotMeasured';
import { ScoreCell } from '@/components/risk/ScoreCell';
import { ScoreExplainer } from '@/components/score/ScoreExplainer';
import { EmptyState, ErrorState, SkeletonCard, SkeletonText } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatCount, formatDate, formatDateTime, formatScore, humanizeEnum, platformLabel } from '@/lib/format';

/**
 * Author profile as a slide-over. Opened from the drivers table, the network graph,
 * a post byline and the narrative author list — one component, so an author reads the
 * same everywhere and the analyst never loses the list behind it.
 */
export function AuthorPanel({
  authorId,
  onOpenChange,
  tz,
  slug,
}: {
  authorId: string | null;
  onOpenChange: (open: boolean) => void;
  tz: string;
  slug: string | undefined;
}) {
  return (
    <Sheet open={authorId !== null} onOpenChange={onOpenChange}>
      <SheetContent width="wide" aria-describedby="author-panel-desc">
        {authorId && <PanelBody authorId={authorId} tz={tz} slug={slug} />}
      </SheetContent>
    </Sheet>
  );
}

function PanelBody({ authorId, tz, slug }: { authorId: string; tz: string; slug: string | undefined }) {
  const [explainerOpen, setExplainerOpen] = useState(false);
  const author = useAuthor(authorId);
  const score = useAuthorScore(authorId, explainerOpen);
  const posts = useAuthorPosts(authorId, { limit: 15 });

  return (
    <>
      <SheetHeader>
        <SheetTitle>
          @{author.data?.handle ?? authorId}
          {author.data && (
            <Badge variant="muted" className="ml-2">
              {platformLabel(author.data.source)}
            </Badge>
          )}
        </SheetTitle>
        <SheetDescription id="author-panel-desc">
          {slug && (
            <Link
              to={`/p/${slug}/authors/${authorId}`}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Open the full profile
              <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
            </Link>
          )}
        </SheetDescription>
      </SheetHeader>

      <SheetBody className="space-y-4">
        {author.isLoading && <SkeletonText lines={8} />}
        {Boolean(author.error) && !author.isLoading && (
          <ErrorState error={author.error} onRetry={() => void author.refetch()} />
        )}

        {author.data && (
          <>
            <AuthorStats author={author.data} tz={tz} />

            <Button size="sm" variant="outline" onClick={() => setExplainerOpen(true)}>
              Why this score?
            </Button>

            {(author.data.cohorts?.length ?? 0) > 0 && (
              <section className="space-y-1.5">
                <h3 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Cohorts
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {author.data.cohorts?.map((c) => (
                    <Badge key={c.cohort_id} variant="outline" className="gap-1">
                      {c.name}
                      <span className="text-muted-foreground">
                        {humanizeEnum(c.category)}
                        {c.confidence !== null && c.confidence !== undefined
                          ? ` · ${formatScore(c.confidence)}`
                          : ''}
                      </span>
                      {/* Assigned by a model or by a person -- a material difference. */}
                      <span className="text-muted-foreground">
                        {c.assigned_by === 'analyst' ? '· analyst' : '· model'}
                      </span>
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {(author.data.skip_reasons?.length ?? 0) > 0 && (
              <p className="rounded-md border border-border bg-surface-sunken px-2.5 py-2 text-2xs text-muted-foreground">
                Some signals were skipped for this author:{' '}
                {author.data.skip_reasons?.join(', ')}. Those fields show “—”, not zero.
              </p>
            )}

            <AuthorActivity authorId={authorId} tz={tz} />

            <section className="space-y-2">
              <h3 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recent posts
              </h3>
              {posts.isLoading && <SkeletonCard />}
              {Boolean(posts.error) && !posts.isLoading && (
                <ErrorState error={posts.error} compact onRetry={() => void posts.refetch()} />
              )}
              {!posts.isLoading && (posts.data?.items.length ?? 0) === 0 && (
                <EmptyState title="No posts returned for this author" />
              )}
              <ul className="space-y-2">
                {(posts.data?.items ?? []).map((p) => (
                  <li key={p.id}>
                    <OriginalPost post={p} tz={tz} compact />
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </SheetBody>

      <ScoreExplainer
        open={explainerOpen}
        onOpenChange={setExplainerOpen}
        explanation={score.data}
        isLoading={score.isLoading}
        error={score.error}
        subjectLabel={`@${author.data?.handle ?? authorId}`}
      />
    </>
  );
}

export function AuthorStats({ author, tz }: { author: AuthorOut; tz: string }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
      <Stat label="Posts" value={<span className="tabular">{formatCount(author.post_count)}</span>} />
      <Stat
        label="Followers"
        value={
          author.followers === null || author.followers === undefined ? (
            <NotMeasured reason="This platform does not report follower counts." />
          ) : (
            <span className="tabular">{formatCount(author.followers)}</span>
          )
        }
      />
      <Stat
        label="Following"
        value={
          author.following === null || author.following === undefined ? (
            <NotMeasured />
          ) : (
            <span className="tabular">{formatCount(author.following)}</span>
          )
        }
      />
      {/* risk_score is 0-100; every other author score is 0-1. */}
      <Stat label="Risk" value={<ScoreCell value={author.risk_score} scale="hundred" />} />
      <Stat label="Bot-like" value={<ScoreCell value={author.bot_score} scale="unit" />} />
      <Stat label="Anomalous" value={<ScoreCell value={author.anomalous_score} scale="unit" />} />
      <Stat label="Toxicity" value={<ScoreCell value={author.toxicity_score} scale="unit" />} />
      <Stat
        label="Coordination"
        value={<ScoreCell value={author.coordination_score} scale="unit" />}
      />
      <Stat
        label="Partisan lean"
        value={
          author.partisan_lean === null || author.partisan_lean === undefined ? (
            <NotMeasured />
          ) : (
            <span className="tabular">{author.partisan_lean.toFixed(2)}</span>
          )
        }
      />
      <Stat
        label="Community"
        value={
          author.community_id ? (
            <span className="font-mono text-xs">
              {author.community_id}
              {author.community_size ? ` (${formatCount(author.community_size)})` : ''}
            </span>
          ) : (
            <NotMeasured reason="Community detection has not run for this project." />
          )
        }
      />
      <Stat label="First seen" value={<span className="tabular">{formatDate(author.first_seen, tz)}</span>} />
      <Stat label="Last seen" value={<span className="tabular">{formatDate(author.last_seen, tz)}</span>} />
      {author.created_at_source && (
        <Stat
          label="Account created"
          value={<span className="tabular">{formatDateTime(author.created_at_source, tz)}</span>}
        />
      )}
      <Stat
        label="Dominant sentiment"
        value={
          author.dominant_sentiment ? (
            humanizeEnum(author.dominant_sentiment)
          ) : (
            <NotMeasured />
          )
        }
      />
      <Stat
        label="Dominant emotion"
        value={author.dominant_emotion ? humanizeEnum(author.dominant_emotion) : <NotMeasured />}
      />
    </dl>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-xs">{value}</dd>
    </div>
  );
}

function AuthorActivity({ authorId, tz }: { authorId: string; tz: string }) {
  const timeline = useAuthorTimeline(authorId, { interval: '1d', tz });

  if (timeline.isLoading) return <SkeletonText lines={4} />;
  if (timeline.error) return <ErrorState error={timeline.error} compact />;
  if (!timeline.data || timeline.data.points.length === 0) return null;

  const max = Math.max(...timeline.data.points.map((p) => p.post_count), 1);

  return (
    <section className="space-y-1.5">
      <h3 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        Activity · {timeline.data.interval} buckets ·{' '}
        <span className="font-mono">{timeline.data.tz}</span>
      </h3>
      <div className="flex h-16 items-end gap-px" role="img" aria-label="Posting activity over time">
        {timeline.data.points.map((p) => (
          <div
            key={p.bucket_start}
            className="min-w-[2px] flex-1 rounded-sm bg-primary/60"
            style={{ height: `${Math.max(2, (p.post_count / max) * 100)}%` }}
            title={`${formatDateTime(p.bucket_start, tz)} · ${p.post_count} posts`}
          />
        ))}
      </div>
      {timeline.data.hour_histogram && (
        <HourHistogram histogram={timeline.data.hour_histogram} />
      )}
    </section>
  );
}

/**
 * Posting hour distribution. A flat 24-hour profile is one of the strongest
 * human-readable coordination signals, so it is worth its own strip.
 */
function HourHistogram({ histogram }: { histogram: Record<string, number> }) {
  const hours = Array.from({ length: 24 }, (_, h) => histogram[String(h)] ?? 0);
  const max = Math.max(...hours, 1);

  return (
    <div className="space-y-0.5">
      <p className="text-2xs text-muted-foreground">Posting hour (UTC)</p>
      <div className="flex h-10 items-end gap-px" role="img" aria-label="Posts by hour of day">
        {hours.map((count, h) => (
          <div
            key={h}
            className="flex-1 rounded-sm bg-muted-foreground/50"
            style={{ height: `${Math.max(2, (count / max) * 100)}%` }}
            title={`${String(h).padStart(2, '0')}:00 — ${count} posts`}
          />
        ))}
      </div>
    </div>
  );
}
