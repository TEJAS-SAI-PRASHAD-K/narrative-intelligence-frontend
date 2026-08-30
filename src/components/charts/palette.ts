/**
 * Deterministic series colours.
 *
 * A series must keep the same colour across both stacked charts and across a
 * refetch, otherwise brushing one chart and reading the other is meaningless. The
 * index is derived from the series key, not from array position, so adding a
 * platform does not recolour the rest.
 */
const SERIES_TOKENS = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
  'var(--series-5)',
  'var(--series-6)',
  'var(--series-7)',
  'var(--series-8)',
] as const;

function hash(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function seriesColour(key: string): string {
  return `hsl(${SERIES_TOKENS[hash(key) % SERIES_TOKENS.length]})`;
}

/** Chart chrome, resolved from the same tokens the rest of the app uses. */
export const CHART_COLOURS = {
  grid: 'hsl(var(--border))',
  axis: 'hsl(var(--muted-foreground))',
  cursor: 'hsl(var(--muted-foreground))',
  primary: 'hsl(var(--primary))',
  riskHigh: 'hsl(var(--risk-high))',
  riskMed: 'hsl(var(--risk-med))',
  riskLow: 'hsl(var(--risk-low))',
} as const;
