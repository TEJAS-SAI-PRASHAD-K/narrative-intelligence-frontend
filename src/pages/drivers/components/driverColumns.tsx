import type { DriverItem } from '@/api/types';
import { NotMeasured } from '@/components/risk/NotMeasured';
import { RiskDot } from '@/components/risk/RiskDot';
import { riskLevelFromScore } from '@/components/risk/riskLevel';
import type { Column } from '@/components/table/EntityTable';
import { Badge } from '@/components/ui/badge';
import { formatCount, formatDate, formatDelta, formatScore, humanizeEnum } from '@/lib/format';

/**
 * Columns for the drivers tables. Risk-ish values render as a dot plus a text label,
 * never as a bare float: `0.71` tells an analyst nothing without knowing the scale,
 * and colour alone tells them nothing in grayscale.
 *
 * `DriverItem` is the same shape for authors, hashtags and urls, so the three tabs
 * share one column set with the identity column swapped.
 */
export function driverColumns(
  kind: 'authors' | 'hashtags' | 'urls',
  tz: string,
): Column<DriverItem>[] {
  return [
    {
      id: 'entity',
      header: kind === 'authors' ? 'Author' : kind === 'hashtags' ? 'Hashtag' : 'URL',
      width: '22rem',
      cell: (d) => (
        <div className="flex min-w-0 flex-col">
          {/* `label` is the readable handle; `entity` is the composite id the API keys
              on (e.g. "mastodon:clerk_059"). Lead with the readable one and keep the
              id underneath, since that is what a bug report has to quote. */}
          {/* Truncation is fine as long as the whole value is still reachable: a handle
              cut mid-word with no way to read the rest is a dead end. */}
          <span className="truncate font-medium" title={displayEntity(d, kind)}>
            {displayEntity(d, kind)}
          </span>
          {d.label && d.label !== d.entity && (
            <span
              className="truncate font-mono text-2xs text-muted-foreground"
              title={d.entity}
            >
              {d.entity}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'posts',
      header: 'Posts',
      align: 'right',
      cell: (d) => <span className="tabular">{formatCount(d.post_count)}</span>,
    },
    {
      id: 'engagement',
      header: 'Engagements',
      align: 'right',
      cell: (d) =>
        d.engagement_total === null || d.engagement_total === undefined ? (
          <NotMeasured reason="Engagement is not reported for every platform." />
        ) : (
          <span className="tabular">{formatCount(d.engagement_total)}</span>
        ),
    },
    {
      id: 'authors',
      header: 'Authors',
      align: 'right',
      cell: (d) =>
        d.author_count === null || d.author_count === undefined ? (
          <NotMeasured />
        ) : (
          <span className="tabular">{formatCount(d.author_count)}</span>
        ),
    },
    {
      id: 'bot_like',
      header: 'Bot-like share',
      headerHint: 'Share of the posts behind this entity written by accounts flagged bot-like.',
      cell: (d) =>
        d.bot_like_share === null || d.bot_like_share === undefined ? (
          <NotMeasured />
        ) : (
          <RiskDot
            level={riskLevelFromScore(d.bot_like_share)}
            label={formatScore(d.bot_like_share)}
          />
        ),
    },
    {
      id: 'toxicity',
      header: 'Toxic',
      cell: (d) =>
        d.mean_toxicity === null || d.mean_toxicity === undefined ? (
          <NotMeasured />
        ) : (
          <RiskDot
            level={riskLevelFromScore(d.mean_toxicity)}
            label={formatScore(d.mean_toxicity)}
          />
        ),
    },
    {
      id: 'sentiment',
      header: 'Sentiment',
      cell: (d) =>
        d.dominant_sentiment ? (
          <Badge variant="muted">{humanizeEnum(d.dominant_sentiment)}</Badge>
        ) : (
          <NotMeasured reason="No post behind this entity carries a sentiment score." />
        ),
    },
    {
      id: 'delta',
      header: 'Change',
      align: 'right',
      headerHint: 'Against the preceding window of equal length.',
      cell: (d) => {
        const delta = formatDelta(d.delta_pct);
        return delta === null ? (
          <NotMeasured reason="No comparison window." />
        ) : (
          <span className="tabular">{delta}</span>
        );
      },
    },
    {
      id: 'narratives',
      header: 'Narratives',
      align: 'right',
      defaultHidden: true,
      cell: (d) => <span className="tabular">{d.narrative_ids?.length ?? 0}</span>,
    },
    {
      id: 'first_seen',
      header: 'First seen',
      defaultHidden: true,
      cell: (d) => <span className="tabular">{formatDate(d.first_seen, tz)}</span>,
    },
    {
      id: 'last_seen',
      header: 'Last seen',
      defaultHidden: true,
      cell: (d) => <span className="tabular">{formatDate(d.last_seen, tz)}</span>,
    },
  ];
}

function displayEntity(d: DriverItem, kind: 'authors' | 'hashtags' | 'urls'): string {
  if (kind === 'authors') {
    const handle = d.label ?? d.entity;
    return handle.startsWith('@') ? handle : `@${handle}`;
  }
  // The API returns hashtags already prefixed.
  if (kind === 'hashtags') return d.entity.startsWith('#') ? d.entity : `#${d.entity}`;
  return d.entity;
}
