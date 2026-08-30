/**
 * The shared risk banding. Lives apart from the component so pages, table cells and
 * chart series can all map a raw score onto the same four levels without importing a
 * React component to do it.
 */
export type RiskLevel = 'high' | 'medium' | 'low' | 'none';

/** `null` maps to `none`, never to `low`. An unmeasured signal is not a safe signal. */
export function riskLevelFromScore(value: number | null | undefined): RiskLevel {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'none';
  if (value >= 0.66) return 'high';
  if (value >= 0.33) return 'medium';
  return 'low';
}

export function riskLevelFromBand(band: string | null | undefined): RiskLevel {
  if (band === 'high') return 'high';
  if (band === 'medium' || band === 'med') return 'medium';
  if (band === 'low') return 'low';
  return 'none';
}
