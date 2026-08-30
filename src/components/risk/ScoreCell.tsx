import { NotMeasured } from './NotMeasured';
import { RiskDot } from './RiskDot';
import { riskLevelFrom100, riskLevelFromScore } from './riskLevel';
import { formatScore, formatScore100 } from '@/lib/format';

/**
 * A score rendered as dot + text, with its scale stated at the call site.
 *
 * The contract mixes two scales -- 0..1 for model outputs, 0..100 for the composite
 * risk numbers -- and there is no way to tell them apart from the value alone. Making
 * `scale` a required prop means a new call site has to look the field up in the
 * contract instead of guessing, which is how `risk_score: 33.2` first rendered as
 * "3320%".
 */
export function ScoreCell({
  value,
  scale,
  reason,
}: {
  value: number | null | undefined;
  /** `unit` for 0..1 model scores, `hundred` for risk_score / fusion_score. */
  scale: 'unit' | 'hundred';
  reason?: string;
}) {
  if (value === null || value === undefined) return <NotMeasured reason={reason} />;

  return scale === 'hundred' ? (
    <RiskDot level={riskLevelFrom100(value)} label={formatScore100(value)} />
  ) : (
    <RiskDot level={riskLevelFromScore(value)} label={formatScore(value)} />
  );
}
