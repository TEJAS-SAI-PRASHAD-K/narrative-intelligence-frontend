import { ExternalLink, Maximize2, MessageSquare, Repeat2, ThumbsUp, Eye } from 'lucide-react';
import { useState } from 'react';
import type { PostOut, PostScores } from '@/api/types';
import { NotMeasured } from '@/components/risk/NotMeasured';
import { RiskDot } from '@/components/risk/RiskDot';
import { riskLevelFromScore } from '@/components/risk/riskLevel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCount, formatDateTime, formatScore, humanizeEnum, platformLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * The post as the analyst reads it. Reused in every right rail: overview high-risk,
 * drivers, narrative detail, author profile.
 *
 * `Engagement.views: null` means the platform does not report views. It renders "—",
 * never 0 -- a Reddit post with no view count is not a post nobody saw.
 */
export function OriginalPost({
  post,
  tz = 'UTC',
  reasons,
  onOpenAuthor,
  className,
  compact,
}: {
  post: PostOut;
  tz?: string;
  /** Why this post surfaced, e.g. `HighRiskPost.reasons`. Rendered as chips. */
  reasons?: string[];
  onOpenAuthor?: ((authorId: string) => void) | undefined;
  className?: string;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className={cn('rounded-lg border border-border bg-card', className)}>
      <header className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <Badge variant="outline" className="uppercase tracking-wide">
          Original post
        </Badge>
        <Badge variant="muted">{platformLabel(post.source)}</Badge>
        {post.content_type !== 'post' && (
          <Badge variant="muted">{humanizeEnum(post.content_type)}</Badge>
        )}
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Open this post full screen"
              onClick={() => setExpanded(true)}
            >
              <Maximize2 className="h-3 w-3" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Expand</TooltipContent>
        </Tooltip>
      </header>

      <div className="space-y-2 px-3 py-2.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
          {onOpenAuthor ? (
            <button
              type="button"
              onClick={() => onOpenAuthor(post.author_id)}
              className="rounded-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              @{post.author_handle ?? post.author_id}
            </button>
          ) : (
            <span className="font-medium">@{post.author_handle ?? post.author_id}</span>
          )}
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{post.source_detail}</span>
          <span className="text-muted-foreground">·</span>
          {/* Timestamp always carries its zone. */}
          <span className="tabular text-muted-foreground">
            {formatDateTime(post.timestamp, tz)} <span className="font-mono">{tz}</span>
          </span>
        </div>

        <p className={cn('whitespace-pre-wrap text-sm leading-relaxed', compact && 'line-clamp-4')}>
          {post.text}
        </p>

        {reasons && reasons.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {/* Why this post was flagged -- not just that it was. */}
            {reasons.map((r) => (
              <Badge key={r} variant="risk-high">
                {humanizeEnum(r)}
              </Badge>
            ))}
          </div>
        )}

        <EngagementRow post={post} />
        <ScoreChips scores={post.scores ?? null} />

        {(post.hashtags?.length || post.domains?.length) && !compact ? (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {/* The API returns hashtags already prefixed; do not add a second #. */}
            {post.hashtags?.slice(0, 6).map((h) => (
              <Badge key={h} variant="muted">
                {h.startsWith('#') ? h : `#${h}`}
              </Badge>
            ))}
            {post.domains?.slice(0, 4).map((d) => (
              <Badge key={d} variant="outline" className="font-mono">
                {d}
              </Badge>
            ))}
          </div>
        ) : null}

        {post.urls && post.urls.length > 0 && !compact && (
          <ul className="space-y-0.5">
            {post.urls.slice(0, 3).map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 rounded-sm text-2xs text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                  <span className="max-w-[24rem] truncate">{url}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>@{post.author_handle ?? post.author_id}</DialogTitle>
            <DialogDescription>
              {platformLabel(post.source)} · {post.source_detail} ·{' '}
              {formatDateTime(post.timestamp, tz)} {tz}
            </DialogDescription>
          </DialogHeader>
          <p className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
            {post.text}
          </p>
          <div className="space-y-2 border-t border-border pt-3">
            <EngagementRow post={post} />
            <ScoreChips scores={post.scores ?? null} />
            <p className="font-mono text-2xs text-muted-foreground">
              post_id <span className="select-all">{post.id}</span> · native_id{' '}
              <span className="select-all">{post.native_id}</span>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function EngagementRow({ post }: { post: PostOut }) {
  const e = post.engagement;
  return (
    <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-muted-foreground">
      <EngagementStat Icon={ThumbsUp} label="Likes" value={e?.likes} />
      <EngagementStat Icon={Repeat2} label="Shares" value={e?.shares} />
      <EngagementStat Icon={MessageSquare} label="Replies" value={e?.replies} />
      <EngagementStat
        Icon={Eye}
        label="Views"
        value={e?.views}
        nullReason="This platform does not report view counts."
      />
    </dl>
  );
}

function EngagementStat({
  Icon,
  label,
  value,
  nullReason,
}: {
  Icon: typeof ThumbsUp;
  label: string;
  value: number | null | undefined;
  nullReason?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <Icon className="h-3 w-3" aria-hidden="true" />
      <dt className="sr-only">{label}</dt>
      <dd className="tabular">
        {value === null || value === undefined ? (
          <NotMeasured reason={nullReason} />
        ) : (
          formatCount(value)
        )}
      </dd>
    </div>
  );
}

/** Model scores as chips. A null score is omitted-with-reason, never shown as 0. */
function ScoreChips({ scores }: { scores: PostScores | null }) {
  if (!scores) {
    return (
      <p className="text-2xs text-muted-foreground">
        <NotMeasured reason="This post has not been scored yet." /> not scored
      </p>
    );
  }

  const skipped = scores.skip_reasons ?? [];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs">
      <Chip label="Toxicity" value={scores.toxicity} />
      <Chip label="Misinfo" value={scores.misinfo_likelihood} />
      <Chip label="Anomaly" value={scores.anomaly} />
      {scores.sentiment && (
        <span className="text-muted-foreground">
          Sentiment <span className="text-foreground">{humanizeEnum(scores.sentiment)}</span>
        </span>
      )}
      {scores.emotion && (
        <span className="text-muted-foreground">
          Emotion <span className="text-foreground">{humanizeEnum(scores.emotion)}</span>
        </span>
      )}
      {scores.stance && (
        <span className="text-muted-foreground">
          Stance <span className="text-foreground">{humanizeEnum(scores.stance)}</span>
        </span>
      )}
      {skipped.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help text-muted-foreground underline decoration-dotted">
              {skipped.length} signal{skipped.length === 1 ? '' : 's'} skipped
            </span>
          </TooltipTrigger>
          <TooltipContent>
            The scorer skipped: {skipped.join(', ')}. Those fields are absent, not zero.
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return (
      <span className="text-muted-foreground">
        {label} <NotMeasured />
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      {label}
      <RiskDot level={riskLevelFromScore(value)} label={formatScore(value)} />
    </span>
  );
}
