import { describe, expect, it } from 'vitest';
import { postWithNullViews } from '@/components/__fixtures__';
import { renderHtml } from '@/test/renderHtml';
import { OriginalPost } from './OriginalPost';

const base = postWithNullViews;
const scores = (scoring_version: string | null) => ({
  ...base.scores,
  misinfo_likelihood: 0.6,
  scoring_version,
});

describe('OriginalPost misinfo chip', () => {
  it('names Laya and states the limit on a stamped Hindi post', () => {
    const html = renderHtml(
      <OriginalPost post={{ ...base, lang: 'hi', scores: scores('laya=v0.2.1,anomaly=v0.1.0') }} />,
    );
    expect(html).toContain('Misinfo (Laya, title only)');
    expect(html).toContain('not comparable with English misinfo values');
  });

  it('keeps the plain chip on an unstamped Hindi post and on English', () => {
    for (const post of [
      { ...base, lang: 'hi', scores: scores('phase2:abcdef123456') },
      { ...base, lang: 'en', scores: scores('laya=v0.2.1') },
    ]) {
      const html = renderHtml(<OriginalPost post={post} />);
      expect(html).not.toContain('Laya');
      expect(html).toContain('Misinfo');
    }
  });

  it('shows not measured, not a Laya label, when the value is null', () => {
    const html = renderHtml(
      <OriginalPost
        post={{ ...base, lang: 'hi', scores: { ...scores('laya=v1'), misinfo_likelihood: null } }}
      />,
    );
    expect(html).not.toContain('Laya');
  });
});
