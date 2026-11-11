import { describe, expect, it } from 'vitest';
import { metricNull } from '@/components/__fixtures__';
import { renderHtml } from '@/test/renderHtml';
import { KpiCard } from './KpiCard';

/**
 * On a corpus with no platform engagement the backend sends `value: null`. The card
 * must say "not measured", because a 0 reads as "nobody reacted" and NaN as a bug.
 */
describe('KpiCard with a null metric', () => {
  const html = renderHtml(<KpiCard metric={metricNull} />);

  it('renders the not-measured dash', () => {
    expect(html).toContain('—');
  });

  it('never renders 0 or NaN as the value', () => {
    expect(html).not.toContain('NaN');
    expect(html).not.toMatch(/tracking-tight tabular">0</);
  });
});
