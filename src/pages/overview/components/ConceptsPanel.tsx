import { useConcepts } from '@/api/queries/overview';
import type { ConceptItem } from '@/api/types';
import { NotMeasured } from '@/components/risk/NotMeasured';
import { EmptyState, ErrorState, SkeletonText } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { InfoTip } from '@/components/ui/tooltip';
import type { FilterSpec } from '@/lib/filters';
import { formatCount, formatDelta, humanizeEnum, isMeasured } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Concepts as volume × sentiment. Volume drives the bar; sentiment drives the colour
 * role, so a high-volume positive term and a high-volume negative one are
 * distinguishable at a glance — and, because the sentiment word is always printed,
 * distinguishable in grayscale too.
 */
export function ConceptsPanel({
  filters,
  onSelectTerm,
}: {
  filters: FilterSpec;
  onSelectTerm: (term: string) => void;
}) {
  const { data, isLoading, error, refetch } = useConcepts(filters);

  if (isLoading) return <SkeletonText lines={12} />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        title="No concepts extracted"
        description="Concept extraction runs as part of the NLP pass. A project that has not been scored has none."
      />
    );
  }

  const max = Math.max(...data.items.map((i) => i.volume), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <h3 className="text-xs font-semibold">Concepts</h3>
        <InfoTip label="How are concepts computed?">
          <p>{data.definition}</p>
        </InfoTip>
        <span className="text-2xs text-muted-foreground">
          {formatCount(data.total_terms)} terms · showing {data.items.length}
        </span>
      </div>

      <ul className="space-y-1.5">
        {data.items.map((item) => (
          <ConceptRow key={`${item.kind}:${item.term}`} item={item} max={max} onSelect={onSelectTerm} />
        ))}
      </ul>
    </div>
  );
}

function sentimentRole(score: number | null | undefined): {
  bar: string;
  label: string;
} {
  if (!isMeasured(score)) return { bar: 'bg-risk-none/60', label: 'not measured' };
  if (score <= -0.25) return { bar: 'bg-risk-high/70', label: 'negative' };
  if (score >= 0.25) return { bar: 'bg-risk-low/70', label: 'positive' };
  return { bar: 'bg-risk-med/70', label: 'neutral' };
}

function ConceptRow({
  item,
  max,
  onSelect,
}: {
  item: ConceptItem;
  max: number;
  onSelect: (term: string) => void;
}) {
  const role = sentimentRole(item.sentiment_score);
  const delta = formatDelta(item.delta_pct);

  return (
    <li>
      <div className="flex items-baseline gap-2">
        <button
          type="button"
          onClick={() => onSelect(item.term)}
          className="min-w-0 truncate rounded-sm text-left text-xs hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* The API returns hashtag terms already prefixed; do not add a second #. */}
          {item.kind === 'hashtag' && !item.term.startsWith('#') ? `#${item.term}` : item.term}
        </button>
        <Badge variant="muted">{humanizeEnum(item.kind)}</Badge>
        {item.dominant_emotion && (
          <span className="text-2xs text-muted-foreground">{humanizeEnum(item.dominant_emotion)}</span>
        )}
        <span className="ml-auto shrink-0 tabular text-2xs">{formatCount(item.volume)}</span>
        {/* Sentiment as a word, not only as a bar colour. */}
        <span className="w-20 shrink-0 text-right text-2xs text-muted-foreground">
          {isMeasured(item.sentiment_score) ? (
            `${role.label} ${item.sentiment_score.toFixed(2)}`
          ) : (
            <NotMeasured />
          )}
        </span>
        <span
          className={cn(
            'w-12 shrink-0 text-right tabular text-2xs',
            delta === null ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {delta ?? '—'}
        </span>
      </div>
      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div className={cn('h-full rounded-full', role.bar)} style={{ width: `${(item.volume / max) * 100}%` }} />
      </div>
    </li>
  );
}
