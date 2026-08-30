import { beforeEach, describe, expect, it } from 'vitest';
import { clearTokenCache, resolveToken } from './tokens';

/**
 * Sigma renders anything it cannot parse as black. These pin the conversion, because
 * a silent failure here looks like "the graph did not load".
 */
describe('resolveToken', () => {
  beforeEach(() => {
    clearTokenCache();
    document.documentElement.style.setProperty('--test-blue', '205 90% 60%');
    document.documentElement.style.setProperty('--test-black', '0 0% 0%');
    document.documentElement.style.setProperty('--test-white', '0 0% 100%');
    document.documentElement.style.setProperty('--test-red', '0 100% 50%');
  });

  it('converts an hsl triplet to rgba Sigma can parse', () => {
    expect(resolveToken('--test-red')).toBe('rgba(255, 0, 0, 1)');
    expect(resolveToken('--test-black')).toBe('rgba(0, 0, 0, 1)');
    expect(resolveToken('--test-white')).toBe('rgba(255, 255, 255, 1)');
  });

  it('carries alpha through', () => {
    expect(resolveToken('--test-blue', 0.5)).toMatch(/^rgba\(\d+, \d+, \d+, 0\.5\)$/);
  });

  it('caches per token and alpha rather than per token alone', () => {
    const opaque = resolveToken('--test-blue', 1);
    const half = resolveToken('--test-blue', 0.5);
    expect(opaque).not.toBe(half);
  });

  it('falls back to a visible grey for a missing token, never to black', () => {
    expect(resolveToken('--does-not-exist')).toBe('rgba(122, 130, 145, 1)');
  });

  it('never emits the hsl form Sigma cannot read', () => {
    expect(resolveToken('--test-blue')).not.toContain('hsl');
  });
});
