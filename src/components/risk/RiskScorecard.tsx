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

type Field =
  'priority' | 'bot_like' | 'anomalous' | 'toxicity' | 'compass_risk' | 'negative_sentiment';

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

/**
 * What each signal measures and on what scale, in the analyst's language.
 *
 * Six labels in small caps over six numbers, half of them percentages and half of them
 * bands, is not self-explanatory to anyone who did not build the scoring pass. Every
 * one of them is now hoverable, so no number on this card is unexplained.
 */
const FIELD_DEFINITION: Record<Field, string> = {
  priority:
    'How much attention this narrative needs relative to the others, as a band: high, medium or low. It is the summary of the five signals beside it.',
  bot_like:
    'The share of accounts in this narrative whose posting pattern a classifier scored as automated. 0% to 100%. It is a suspicion, not a finding.',
  anomalous:
    'How unusual this narrative’s posting pattern is against the rest of the corpus — bursts, synchronised timing, repetition. 0% to 100%.',
  toxicity:
    'How much of the text in this narrative a classifier scored as abusive or harassing. 0% to 100%.',
  compass_risk:
    'The risk band from the Compass check, which reads the narrative’s central claim against sourced evidence. High, medium or low.',
  negative_sentiment:
    'The share of posts in this narrative scored as negative in tone. 0% to 100%. Tone is not truth: an angry narrative is not necessarily a false one.',
};

export function RiskScorecard({
  scorecard,
  layout = 'row',
  className,
  onExplain,
}: {
  scorecard: NarrativeScorecard;
  /**
   * `row` is a fixed three-across grid that wraps to two rows; `grid` is the two-across
   * form for a narrow sidebar. Both are grids: the flex-wrap row this replaces gave the
   * six fields a different width and a different wrap point on every surface, so the
   * same card read as a different shape depending on where it appeared.
   */
  layout?: 'row' | 'grid';
  className?: string;
  /** Opens <ScoreExplainer>. Omitted where no score endpoint backs the card. */
  onExplain?: () => void;
}) {
  const missing = new Set(scorecard.missing ?? []);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className={cn(
          'grid gap-x-4 gap-y-2.5',
          layout === 'row' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2',
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
              Fusion score {/* 0-100, unlike the six 0-1 signals above it. Say so. */}
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
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="flex items-center gap-1 text-2xs uppercase tracking-wide text-muted-foreground">
        <span className="truncate">{label}</span>
        {/* Every signal is explainable, not only the ones that are missing. */}
        <InfoTip label={`What does ${label} measure?`}>
          <p>{FIELD_DEFINITION[field]}</p>
          {isMissing && (
            <p className="mt-1.5 border-t border-border pt-1.5">
              It was not computed for this narrative, so it counts for nothing in the score. It
              shows as “not measured” rather than as a zero, because a zero would mean the
              signal ran and found nothing.
            </p>
          )}
        </InfoTip>
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
    return (
      <NotMeasured reason={`${FIELD_LABEL[field]} was not computed for this narrative.`} />
    );
  }

  if (field === 'priority') {
    // Priority is never null in the contract: it is the one always-present field.
    return (
      <RiskDot level={riskLevelFromBand(scorecard.priority)} label={cap(scorecard.priority)} />
    );
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
