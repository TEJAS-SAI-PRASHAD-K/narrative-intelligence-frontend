/**
 * The shared risk banding.
 *
 * The contract uses two score scales and mixing them up silently multiplies a number
 * by a hundred, so they are separated here by name rather than inferred:
 *
 *   0..1   — every model score: `bot_score`, `anomalous_score`, `toxicity_score`,
 *            `coordination_score`, `bot_like_share`, `NarrativeScorecard.bot_like`,
 *            `.anomalous`, `.toxicity`, `.negative_sentiment`, `Citation` confidences.
 *   0..100 — the composite risk numbers: `AuthorOut.risk_score`,
 *            `DomainOut.risk_score`, `NarrativeScorecard.fusion_score`.
 *
 * Use `*FromUnit` for the first group and `*From100` for the second. Nothing infers
 * the scale from the value: a 0..100 score that happens to be 0.4 is a very low risk,
 * not a medium one.
 */
export type RiskLevel = 'high' | 'medium' | 'low' | 'none';

const HIGH = 0.66;
const MEDIUM = 0.33;

function band(fraction: number): RiskLevel {
  if (fraction >= HIGH) return 'high';
  if (fraction >= MEDIUM) return 'medium';
  return 'low';
}

/** For 0..1 model scores. `null` maps to `none`, never to `low`. */
export function riskLevelFromScore(value: number | null | undefined): RiskLevel {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'none';
  return band(value);
}

/** For 0..100 composites (`risk_score`, `fusion_score`). */
export function riskLevelFrom100(value: number | null | undefined): RiskLevel {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'none';
  return band(value / 100);
}

export function riskLevelFromBand(band: string | null | undefined): RiskLevel {
  if (band === 'high') return 'high';
  if (band === 'medium' || band === 'med') return 'medium';
  if (band === 'low') return 'low';
  return 'none';
}
