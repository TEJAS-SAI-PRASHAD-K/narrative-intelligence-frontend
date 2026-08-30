import type { AlertCondition } from '@/api/types';

/**
 * Reads a rule back in plain English.
 *
 * A rule stored as `{metric: "fusion_score", op: ">", value: 70, scope: "narrative"}`
 * is unreviewable as JSON. An analyst has to be able to check what they built without
 * decoding it, or they will not notice they inverted an operator.
 */
export function describeRule(condition: AlertCondition): string {
  const scope = condition.scope ?? 'narrative';
  const comparison: Record<AlertCondition['op'], string> = {
    '>': 'goes above',
    '>=': 'reaches or exceeds',
    '<': 'falls below',
    '<=': 'falls to or below',
    '==': 'is exactly',
    '!=': 'is anything other than',
  };
  const metric = condition.metric.replace(/_/g, ' ');
  const filterCount = Object.keys(condition.filters ?? {}).length;
  const filterNote = filterCount > 0 ? `, within ${filterCount} extra filter(s)` : '';
  return `When a ${scope}'s ${metric} ${comparison[condition.op]} ${condition.value}${filterNote}.`;
}
