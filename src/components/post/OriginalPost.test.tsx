import { describe, expect, it } from 'vitest';
import {
  postTelegram,
  postTelegramNoReactions,
  postWithNullViews,
} from '@/components/__fixtures__';
import { renderHtml } from '@/test/renderHtml';
import { OriginalPost } from './OriginalPost';

describe('OriginalPost engagement', () => {
  it('shows Telegram views and forwards as measured counts', () => {
    const html = renderHtml(<OriginalPost post={postTelegram} />);
    expect(html).toContain('Telegram');
    expect(html).toContain('Forwards');
    expect(html).toContain('Reactions');
    expect(html).toContain('58.3K');
    expect(html).toContain('4,870');
    expect(html).not.toContain('>Shares<');
  });

  it('renders a Telegram counter the channel does not expose as not measured', () => {
    const html = renderHtml(<OriginalPost post={postTelegramNoReactions} />);
    expect(html).toContain('This channel does not show reactions.');
    expect(html).toContain('This channel has no linked discussion group.');
  });

  it('keeps a measured zero forward count as 0', () => {
    const html = renderHtml(<OriginalPost post={postTelegramNoReactions} />);
    expect(html).toContain('>0<');
  });

  it('keeps generic labels for other platforms', () => {
    const html = renderHtml(<OriginalPost post={postWithNullViews} />);
    expect(html).toContain('Shares');
    expect(html).toContain('This platform does not report view counts.');
  });
});

const base = postWithNullViews;
const scores = (
  scoring_version: string | null,
  model_versions: Record<string, string> | null = null,
) => ({
  ...base.scores,
  misinfo_likelihood: 0.6,
  scoring_version,
  model_versions,
});

describe('OriginalPost misinfo chip', () => {
  it('names Laya and states the limit on a stamped Hindi post', () => {
    const html = renderHtml(
      <OriginalPost post={{ ...base, lang: 'hi', scores: scores('laya=v0.2.1,anomaly=v0.1.0') }} />,
    );
    expect(html).toContain('Misinfo (Laya, title only)');
    expect(html).toContain('not comparable with English misinfo values');
  });

  it('names Laya from the model_versions map on a Hindi post', () => {
    const html = renderHtml(
      <OriginalPost
        post={{ ...base, lang: 'hi', scores: scores(null, { laya: 'v0.2.1+x@1a2b' }) }}
      />,
    );
    expect(html).toContain('Misinfo (Laya, title only)');
  });

  it('keeps the plain chip when the map has no laya key, even with an old laya stamp', () => {
    const html = renderHtml(
      <OriginalPost
        post={{ ...base, lang: 'hi', scores: scores('laya=v0.2.1', { misinfo: 'v1' }) }}
      />,
    );
    expect(html).not.toContain('Laya');
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
