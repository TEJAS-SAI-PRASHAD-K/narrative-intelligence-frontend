import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { NarrativeSummary } from '@/api/types';
import { AiPill } from '@/components/ai/AiPill';
import { RiskScorecard } from '@/components/risk/RiskScorecard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatCount, formatDateRange, platformLabel } from '@/lib/format';
import { InlineEditTitle } from './InlineEditTitle';

/**
 * One narrative in the feed: claim-style headline, display id with inline rename,
 * metadata row, cohorts line, and the full scorecard in the same six-field order it
 * takes everywhere else.
 */
export function NarrativeCard({
  narrative,
  slug,
  tz,
  onRename,
  isRenaming,
  onOpenCohorts,
  onExplainScore,
}: {
  narrative: NarrativeSummary;
  slug: string | undefined;
  tz: string;
  onRename: (title: string) => Promise<void>;
  isRenaming: boolean;
  onOpenCohorts: () => void;
  onExplainScore: () => void;
}) {
  const title = narrative.title.text ?? 'Untitled narrative';

  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
          <Badge variant="muted" className="mt-0.5 shrink-0 font-mono">
            ID: {narrative.display_id}
          </Badge>
          {narrative.is_manual && <Badge variant="outline" className="mt-0.5">Manual</Badge>}
          <AiPill provenance={narrative.title.provenance} />
        </div>

        <h3 className="text-sm font-semibold leading-snug">
          <InlineEditTitle value={title} onSave={onRename} isSaving={isRenaming} label="Rename narrative" />
        </h3>

        {narrative.claim && (
          <p className="text-xs italic text-muted-foreground">“{narrative.claim}”</p>
        )}

        {narrative.summary.text && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {narrative.summary.text}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-2.5">
        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-muted-foreground">
          <Meta label="Dates" value={formatDateRange(narrative.date_start, narrative.date_end, tz)} />
          <Meta label="Engagement" value={formatCount(narrative.engagement_total)} />
          <Meta label="Posts" value={formatCount(narrative.post_count)} />
          <Meta label="Authors" value={formatCount(narrative.author_count)} />
          {(narrative.platforms?.length ?? 0) > 0 && (
            <div className="flex items-center gap-1">
              <dt className="sr-only">Platforms</dt>
              <dd className="flex gap-1">
                {narrative.platforms?.map((p) => (
                  <Badge key={p} variant="muted">
                    {platformLabel(p)}
                  </Badge>
                ))}
              </dd>
            </div>
          )}
        </dl>

        {((narrative.top_hashtags?.length ?? 0) > 0 || (narrative.top_domains?.length ?? 0) > 0) && (
          <div className="flex flex-wrap gap-1">
            {narrative.top_hashtags?.slice(0, 5).map((h) => (
              <Badge key={h} variant="muted">
                {h.startsWith('#') ? h : `#${h}`}
              </Badge>
            ))}
            {narrative.top_domains?.slice(0, 3).map((d) => (
              <Badge key={d} variant="outline" className="font-mono">
                {d}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onOpenCohorts} className="px-0 text-muted-foreground">
            <Users className="h-3 w-3" aria-hidden="true" />
            Cohorts
          </Button>
        </div>

        <RiskScorecard scorecard={narrative.scorecard} onExplain={onExplainScore} />

        <div className="flex items-center gap-3 pt-0.5">
          <Button size="sm" variant="outline" asChild>
            <Link to={`/p/${slug}/narratives/${narrative.id}`}>Open narrative</Link>
          </Button>
          {narrative.cluster_id !== null && narrative.cluster_id !== undefined && (
            <span className="font-mono text-2xs text-muted-foreground">
              cluster {narrative.cluster_id}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1">
      <dt>{label}</dt>
      <dd className="tabular text-foreground">{value}</dd>
    </div>
  );
}
