import { describe, expect, it } from 'vitest';
import { languageCoverage } from '@/components/__fixtures__';
import { renderHtml } from '@/test/renderHtml';
import { coverageRows, languageLabel } from './languageCoverage';
import { LanguageCoveragePanel } from './LanguageCoveragePanel';

function render(coverage: Parameters<typeof LanguageCoveragePanel>[0]['coverage']): string {
  return renderHtml(<LanguageCoveragePanel coverage={coverage} />);
}

describe('LanguageCoveragePanel', () => {
  it('shows scored out of total for each language and module', () => {
    const html = render(languageCoverage);
    expect(html).toContain('Hindi (hi)');
    expect(html).toContain('aria-label="716 of 716 scored"');
    expect(html).toContain('aria-label="233 of 233 scored"');
  });

  it('shows a language with zero coverage as 0 of its total, never as missing', () => {
    const html = render(languageCoverage);
    expect(html).toContain('aria-label="0 of 233 scored"');
    expect(html).toContain('aria-label="0 of 4 scored"');
  });

  it('labels records with no language', () => {
    expect(render(languageCoverage)).toContain('No language');
    expect(languageLabel(null)).toBe('No language');
  });

  it('says so on an empty list instead of rendering an empty table', () => {
    const html = render([]);
    expect(html).toContain('No posts match the current filters');
    expect(html).not.toContain('<table');
  });

  it('says so when the API did not report coverage', () => {
    const html = render(null);
    expect(html).toContain('did not report language coverage');
    expect(html).not.toContain('<table');
  });

  it('keeps an unreported module distinct from a measured zero', () => {
    const [row] = coverageRows([{ lang: 'en', total: 10, scored: { toxicity: 0 } }]);
    const byModule = Object.fromEntries((row?.cells ?? []).map((c) => [c.module, c.scored]));
    expect(byModule.toxicity).toBe(0);
    expect(byModule.stance).toBeNull();
  });

  it('adds a column for a module this build does not know', () => {
    const rows = coverageRows([{ lang: 'en', total: 3, scored: { toxicity: 3, nli: 2 } }]);
    expect(rows[0]?.cells.map((c) => c.module)).toContain('nli');
  });
});
