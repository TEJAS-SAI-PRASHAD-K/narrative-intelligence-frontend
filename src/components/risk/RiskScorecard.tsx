import type { NarrativeScorecard } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { InfoTip } from '@/components/ui/tooltip';
import { formatScore } from '@/lib/format';
import { cn } from '@/lib/utils';
import { NotMeasured } from './NotMeasured';
import { RiskDot } from './RiskDot';
import { riskLevelFromBand, riskLevelFromScore } from './riskLevel';

/**
 * Six fields, always, in this order:
 *   Priority · Bot-Like · Anomalous · Toxicity · Compass Risk · Negative Sentiment
 *
 * The order and the label styling are identical on the feed card, the detail sidebar
 * and the kitchen sink, so an analyst reads the same shape everywhere. Any field named
 * in `missing[]` -- or arriving as `null` -- renders "not measured", never 0 and never
 * a zero-height bar.
 */

type Field = 'priority' | 'bot_like' | 'anomalous' | 'toxicity' | 'compass_risk' | 'negative_sentiment';

const FIELD_LABEL: Record<Field, string> = {
  priority: 'Priority',
  bot_like: 'Bot-Like',
  anomalous: 'Anomalous',
  toxicity: 'Toxicity',
  compass_risk: 'Compass Risk',
  negative_sentiment: 'Negative Sentiment',
};

const ORDER: Field[] = [
  'priority',
  'bot_like',
  'anomalous',
  'toxicity',
  'compass_risk',
  'negative_sentiment',
];

export function RiskScorecard({
  scorecard,
  layout = 'row',
  className,
  onExplain,
}: {
  scorecard: NarrativeScorecard;
  layout?: 'row' | 'grid';
  className?: string;
  /** Opens <ScoreExplainer>. Omitted where no score endpoint backs the card. */
  onExplain?: () => void;
}) {
  const missing = new Set(scorecard.missing ?? []);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div
        className={cn(
          layout === 'row'
            ? 'flex flex-wrap items-start gap-x-5 gap-y-2'
            : 'grid grid-cols-2 gap-x-4 gap-y-2.5',
        )}
      >
        {ORDER.map((field) => (
          <Cell key={field} field={field} scorecard={scorecard} missing={missing} />
        ))}
      </div>

      {(scorecard.fusion_score !== null && scorecard.fusion_score !== undefined) || onExplain ? (
        <div className="flex items-center gap-2 pt-0.5">
          {scorecard.fusion_score !== null && scorecard.fusion_score !== undefined && (
            <span className="text-2xs text-muted-foreground">
              Fusion score{' '}
              {/* 0-100, unlike the six 0-1 signals above it. Say so. */}
              <span className="tabular font-medium text-foreground">
                {scorecard.fusion_score.toFixed(1)}
              </span>
              <span className="text-muted-foreground"> / 100</span>
            </span>
          )}
          {scorecard.scoring_version && (
            <Badge variant="muted" className="font-mono">
              {scorecard.scoring_version}
            </Badge>
          )}
          {onExplain && (
            <button
              type="button"
              onClick={onExplain}
              className="rounded-sm text-2xs text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Why this score?
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Cell({
  field,
  scorecard,
  missing,
}: {
  field: Field;
  scorecard: NarrativeScorecard;
  missing: Set<string>;
}) {
  const label = FIELD_LABEL[field];
  const isMissing = missing.has(field);

  return (
    <div className="flex min-w-[6.5rem] flex-col gap-0.5">
      <span className="flex items-center gap-1 text-2xs uppercase tracking-wide text-muted-foreground">
        {label}
        {isMissing && (
          <InfoTip label={`Why is ${label} not measured?`}>
            The backend listed <code>{field}</code> in <code>missing[]</code> for this narrative:
            the signal was not computed, so it contributes nothing and is not shown as zero.
          </InfoTip>
        )}
      </span>
      <Value field={field} scorecard={scorecard} isMissing={isMissing} />
    </div>
  );
}

function Value({
  field,
  scorecard,
  isMissing,
}: {
  field: Field;
  scorecard: NarrativeScorecard;
  isMissing: boolean;
}) {
  if (isMissing) {
    return <NotMeasured reason={`Not measured: the backend lists "${field}" in missing[].`} />;
  }

  if (field === 'priority') {
    // Priority is never null in the contract: it is the one always-present field.
    return <RiskDot level={riskLevelFromBand(scorecard.priority)} label={cap(scorecard.priority)} />;
  }

  if (field === 'compass_risk') {
    const risk = scorecard.compass_risk;
    if (!risk) {
      return <NotMeasured reason="No Compass context has been generated for this narrative." />;
    }
    return <RiskDot level={riskLevelFromBand(risk)} label={cap(risk)} />;
  }

  const value = scorecard[field];
  if (value === null || value === undefined) {
    return <NotMeasured />;
  }
  return <RiskDot level={riskLevelFromScore(value)} label={formatScore(value)} />;
}

function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
