import { Clock, RefreshCw } from 'lucide-react';
import type { NarrativeFreshness } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InfoTip } from '@/components/ui/tooltip';
import { formatCount, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * How old the clustering is, and the only control that refreshes it.
 *
 * Clustered results are never refreshed silently. Reclustering renumbers narratives
 * and can split or merge them; an analyst mid-investigation must decide when that
 * happens. "Update Now" enqueues the job and hands it to the tray -- it does not
 * pretend the feed is already current.
 */

const STATUS_VARIANT: Record<NarrativeFreshness['status'], 'risk-low' | 'risk-med' | 'muted'> = {
  fresh: 'risk-low',
  stale: 'risk-med',
  running: 'muted',
  never_run: 'risk-med',
};

const STATUS_LABEL: Record<NarrativeFreshness['status'], string> = {
  fresh: 'Fresh',
  stale: 'Stale',
  running: 'Clustering now',
  never_run: 'Never clustered',
};

export function FreshnessBar({
  freshness,
  onUpdate,
  updating,
  className,
}: {
  freshness: NarrativeFreshness;
  onUpdate: () => void;
  updating?: boolean;
  className?: string;
}) {
  const running = freshness.status === 'running' || updating === true;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border bg-surface px-3 py-2',
        className,
      )}
    >
      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />

      <span className="text-xs">
        Generated <span className="font-medium">{freshness.age_human}</span>
      </span>

      <Badge variant={STATUS_VARIANT[freshness.status]}>{STATUS_LABEL[freshness.status]}</Badge>

      <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
        {freshness.narrative_count !== null && freshness.narrative_count !== undefined && (
          <Stat label="Narratives" value={formatCount(freshness.narrative_count)} />
        )}
        {freshness.post_count !== null && freshness.post_count !== undefined && (
          <Stat label="Posts clustered" value={formatCount(freshness.post_count)} />
        )}
        {/* Posts the last run never saw. This is the number that makes "stale" concrete. */}
        {freshness.unclustered_post_count !== null &&
          freshness.unclustered_post_count !== undefined &&
          freshness.unclustered_post_count > 0 && (
            <div className="flex items-center gap-1">
              <dt>Unclustered</dt>
              <dd className="tabular font-medium text-risk-med">
                {formatCount(freshness.unclustered_post_count)}
              </dd>
              <InfoTip label="What does unclustered mean?">
                Posts ingested since the last clustering run. They are in the corpus but belong
                to no narrative yet, so they are missing from the feed until you update.
              </InfoTip>
            </div>
          )}
        {freshness.algorithm && <Stat label="Algorithm" value={freshness.algorithm} mono />}
        {freshness.embedding_model && (
          <Stat label="Embeddings" value={freshness.embedding_model} mono />
        )}
        {freshness.last_run_at && (
          <Stat label="Last run" value={`${formatDateTime(freshness.last_run_at, 'UTC')} UTC`} />
        )}
      </dl>

      <div className="flex-1" />

      <Button size="sm" variant="outline" onClick={onUpdate} disabled={running}>
        <RefreshCw className={cn('h-3 w-3', running && 'animate-spin')} aria-hidden="true" />
        {running ? 'Clustering…' : 'Update Now'}
      </Button>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <dt>{label}</dt>
      <dd className={cn('text-foreground', mono ? 'font-mono' : 'tabular')}>{value}</dd>
    </div>
  );
}
