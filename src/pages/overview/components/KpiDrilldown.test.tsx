import { describe, expect, it } from 'vitest';
import type { AuthorsBreakdown, Metric } from '@/api/types';
import { renderHtml } from '@/test/renderHtml';
import { Authors } from './KpiDrilldown';

const metric = (label: string, value: number | null, unit: string): Metric => ({
  label,
  value,
  unit,
  definition: `${label} definition`,
  nullable_fields: [],
  sample_size: null,
  delta_pct: null,
});

const breakdown = (ratio: number | null): AuthorsBreakdown => ({
  total: metric('Authors', 1200, 'count'),
  coordinated_author_ratio: metric('Coordinated authors', ratio, 'ratio'),
  bot_like: metric('Bot-like authors', 90, 'count'),
  author_groups: metric('Author groups', 12, 'count'),
  total_cohort_count: 3,
});

describe('Authors drilldown', () => {
  it('shows the coordinated ratio as a percentage', () => {
    const html = renderHtml(<Authors data={breakdown(0.25)} onOpenCohorts={() => undefined} />);
    expect(html).toContain('Coordinated authors');
    expect(html).toContain('25.0%');
    expect(html).toContain('fusion does not use it');
  });

  it('renders NotMeasured for a null ratio, never 0', () => {
    const html = renderHtml(<Authors data={breakdown(null)} onOpenCohorts={() => undefined} />);
    expect(html).toContain('<span aria-hidden="true">—</span>');
    expect(html).not.toContain('0.0%');
  });
});
