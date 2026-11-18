import { describe, expect, it } from 'vitest';
import { scorecardComplete, scorecardMissing } from '@/components/__fixtures__';
import { renderHtml } from '@/test/renderHtml';
import { RiskScorecard } from './RiskScorecard';

describe('RiskScorecard coordinated author ratio', () => {
  it('shows the measured ratio under the Coordinated Authors label', () => {
    const html = renderHtml(<RiskScorecard scorecard={scorecardComplete} />);
    expect(html).toContain('Coordinated Authors');
    expect(html).toContain('34');
  });

  it('renders NotMeasured for a null ratio, never 0', () => {
    const html = renderHtml(
      <RiskScorecard
        scorecard={{ ...scorecardComplete, coordinated_author_ratio: null }}
      />,
    );
    expect(html).toContain('No author in this narrative was scored for coordination.');
    expect(html).toContain('<span aria-hidden="true">—</span>');
  });

  it('renders NotMeasured when the ratio is absent from the payload', () => {
    const { coordinated_author_ratio: _omit, ...rest } = scorecardMissing;
    const html = renderHtml(<RiskScorecard scorecard={rest} />);
    expect(html).toContain('No author in this narrative was scored for coordination.');
  });
});
