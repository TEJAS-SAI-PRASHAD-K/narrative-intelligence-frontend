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
