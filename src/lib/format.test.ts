import { describe, expect, it } from 'vitest';
import { compareNullsLast, formatCount, formatExactCount, NOT_MEASURED, sumMeasured } from './format';

describe('null formatting', () => {
  it('formats null as the dash and 0 as 0', () => {
    expect(formatCount(null)).toBe(NOT_MEASURED);
    expect(formatExactCount(undefined)).toBe(NOT_MEASURED);
    expect(formatCount(0)).toBe('0');
  });
});

describe('sumMeasured', () => {
  it('skips null', () => {
    expect(sumMeasured([3, null, 4])).toBe(7);
  });
  it('returns null when every input is null', () => {
    expect(sumMeasured([null, undefined])).toBeNull();
    expect(sumMeasured([])).toBeNull();
  });
  it('keeps a measured zero', () => {
    expect(sumMeasured([0, null])).toBe(0);
  });
});

describe('compareNullsLast', () => {
  it('sorts descending with null last', () => {
    expect([null, 2, 0, null, 9].sort(compareNullsLast)).toEqual([9, 2, 0, null, null]);
  });
});
