import { describe, expect, it } from 'vitest';
import type { AlertCondition } from '@/api/types';
import { describeRule } from './describeRule';

/**
 * The plain-English readback is the only review an analyst gets before a rule starts
 * firing. An inverted operator that reads correctly is worse than no readback at all.
 */
describe('describeRule', () => {
  const base: AlertCondition = { metric: 'fusion_score', op: '>', value: 70, scope: 'narrative' };

  it('reads a threshold rule the way the spec describes it', () => {
    expect(describeRule(base)).toBe("When a narrative's fusion score goes above 70.");
  });

  it('distinguishes every operator', () => {
    const phrases = (['>', '>=', '<', '<=', '==', '!='] as const).map((op) =>
      describeRule({ ...base, op }),
    );
    expect(new Set(phrases).size).toBe(6);
    expect(describeRule({ ...base, op: '<' })).toContain('falls below');
    expect(describeRule({ ...base, op: '>=' })).toContain('reaches or exceeds');
  });

  it('names the scope', () => {
    expect(describeRule({ ...base, scope: 'domain' })).toContain("a domain's");
    expect(describeRule({ ...base, scope: 'author' })).toContain("a author's");
  });

  it('defaults to narrative scope when none is set', () => {
    const { scope: _scope, ...noScope } = base;
    expect(describeRule(noScope as AlertCondition)).toContain("a narrative's");
  });

  it('mentions extra filters rather than hiding them', () => {
    expect(describeRule({ ...base, filters: { platform: 'reddit' } })).toContain(
      'within 1 extra filter',
    );
  });
});
