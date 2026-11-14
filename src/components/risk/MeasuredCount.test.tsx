import { describe, expect, it } from 'vitest';
import { renderHtml } from '@/test/renderHtml';
import { MeasuredCount } from './MeasuredCount';

describe('MeasuredCount', () => {
  it('renders a measured zero as 0', () => {
    expect(renderHtml(<MeasuredCount value={0} />)).toContain('>0<');
  });

  it('renders null as the dash with "Not measured" as the aria text, never 0', () => {
    const html = renderHtml(<MeasuredCount value={null} />);
    expect(html).toContain('—');
    expect(html).toContain('aria-label="Not measured"');
    expect(html).not.toContain('>0<');
  });
});

describe('a table cell with null engagement_total', () => {
  it('shows the dash and not 0', () => {
    const html = renderHtml(
      <table>
        <tbody>
          <tr>
            <td>
              <MeasuredCount value={null} />
            </td>
          </tr>
        </tbody>
      </table>,
    );
    expect(html).toContain('—');
    expect(html).not.toMatch(/>0</);
  });
});
