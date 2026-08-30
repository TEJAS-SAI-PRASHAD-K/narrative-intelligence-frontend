import { describe, expect, it } from 'vitest';
import { formatScore, formatScore100 } from '@/lib/format';
import { riskLevelFrom100, riskLevelFromBand, riskLevelFromScore } from './riskLevel';

/**
 * The contract uses two score scales. Confusing them renders `risk_score: 33.2` as
 * "3320%", which is how this was caught against live data.
 */
describe('two score scales', () => {
  it('formats a 0..1 model score as a percentage', () => {
    expect(formatScore(0.102)).toBe('10%');
    expect(formatScore(1)).toBe('100%');
  });

  it('formats a 0..100 composite on its own scale, not as a percentage', () => {
    expect(formatScore100(33.2)).toBe('33.2');
    expect(formatScore100(96.2)).toBe('96.2');
  });

  it('bands the two scales consistently', () => {
    expect(riskLevelFromScore(0.7)).toBe('high');
    expect(riskLevelFrom100(70)).toBe('high');
    expect(riskLevelFromScore(0.4)).toBe('medium');
    expect(riskLevelFrom100(40)).toBe('medium');
    expect(riskLevelFromScore(0.1)).toBe('low');
    expect(riskLevelFrom100(10)).toBe('low');
  });

  it('does not infer the scale from the value: 0.4 on a 0..100 scale is low, not medium', () => {
    expect(riskLevelFrom100(0.4)).toBe('low');
    expect(riskLevelFromScore(0.4)).toBe('medium');
  });

  it('maps null to none on both scales -- an unmeasured signal is not a safe one', () => {
    expect(riskLevelFromScore(null)).toBe('none');
    expect(riskLevelFrom100(null)).toBe('none');
    expect(riskLevelFromScore(undefined)).toBe('none');
    expect(riskLevelFrom100(Number.NaN)).toBe('none');
    expect(formatScore(null)).toBe('—');
    expect(formatScore100(null)).toBe('—');
  });

  it('treats 0 as a real score on both scales', () => {
    expect(riskLevelFromScore(0)).toBe('low');
    expect(riskLevelFrom100(0)).toBe('low');
    expect(formatScore(0)).toBe('0%');
    expect(formatScore100(0)).toBe('0.0');
  });

  it('maps an absent band to none rather than low', () => {
    expect(riskLevelFromBand(null)).toBe('none');
    expect(riskLevelFromBand('high')).toBe('high');
    expect(riskLevelFromBand('med')).toBe('medium');
  });
});
