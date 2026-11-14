import { describe, expect, it } from 'vitest';
import { formatCount, formatExactCount, NOT_MEASURED } from './format';

describe('null formatting', () => {
  it('formats null as the dash and 0 as 0', () => {
    expect(formatCount(null)).toBe(NOT_MEASURED);
    expect(formatExactCount(undefined)).toBe(NOT_MEASURED);
    expect(formatCount(0)).toBe('0');
  });
});
