import { describe, expect, it } from 'vitest';
import { activeChips, emptyFilterSpec, type FilterSpec } from '@/lib/filters';
import { chipText, shortId } from './chipLabel';

const ID = '7f3a9c1e-1111-4222-8333-444455556666';
const spec: FilterSpec = { ...emptyFilterSpec('p1'), cohort_id: [ID] };
const chip = activeChips(spec)[0]!;

describe('chipText', () => {
  it('shows the resolved name with no title', () => {
    expect(chipText(chip, { state: 'resolved', name: 'Verified journalists' })).toEqual({
      label: 'Cohort: Verified journalists',
    });
  });

  it('falls back to the short id and says it is loading', () => {
    const t = chipText(chip, { state: 'loading' });
    expect(t.label).toBe('Cohort: 7f3a9c1e…');
    expect(t.title).toMatch(/loading/i);
  });

  it('falls back to the short id on a 404 and says the name was not found', () => {
    const t = chipText(chip, { state: 'not_found' });
    expect(t.label).toBe('Cohort: 7f3a9c1e…');
    expect(t.title).toMatch(/not found/i);
  });

  it('falls back to the short id on other failures', () => {
    expect(chipText(chip, { state: 'error' }).title).toMatch(/unavailable/i);
  });

  it('leaves chips without a name lookup untouched', () => {
    const platform = activeChips({ ...emptyFilterSpec('p1'), platform: ['reddit'] })[0]!;
    expect(chipText(platform, { state: 'none' })).toEqual({ label: 'Platform: reddit' });
  });

  it('does not truncate ids that are already short', () => {
    expect(shortId('abc')).toBe('abc');
  });
});
