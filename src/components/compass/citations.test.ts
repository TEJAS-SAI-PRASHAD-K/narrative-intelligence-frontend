import { describe, expect, it } from 'vitest';
import type { Citation } from '@/api/types';
import { citationNumbers, segmentContext } from './citations';

function cite(id: string, start: number | null, end: number | null): Citation {
  return {
    id,
    url: `https://example.org/${id}`,
    title: id,
    publisher: 'Example',
    domain: 'example.org',
    retrieved_at: '2026-08-28T00:00:00Z',
    snippet: '',
    char_start: start,
    char_end: end,
  };
}

const CONTEXT = 'Alpha sentence. Beta sentence. Gamma sentence.';
//               ^0             ^15            ^30            ^46 (end)

describe('segmentContext', () => {
  it('anchors a citation to exactly its span', () => {
    const { segments } = segmentContext(CONTEXT, [cite('a', 0, 15)]);
    expect(segments[0]?.text).toBe('Alpha sentence.');
    expect(segments[0]?.citations.map((c) => c.id)).toEqual(['a']);
    expect(segments[1]?.citations).toEqual([]);
  });

  it('reassembles to the original text with no characters lost or duplicated', () => {
    const { segments } = segmentContext(CONTEXT, [cite('a', 0, 15), cite('b', 16, 29)]);
    expect(segments.map((s) => s.text).join('')).toBe(CONTEXT);
  });

  it('attaches both citations where spans overlap', () => {
    const { segments } = segmentContext(CONTEXT, [cite('a', 0, 29), cite('b', 16, CONTEXT.length)]);
    const overlap = segments.find((s) => s.citations.length === 2);
    expect(overlap).toBeDefined();
    expect(overlap?.citations.map((c) => c.id).sort()).toEqual(['a', 'b']);
    expect(segments.map((s) => s.text).join('')).toBe(CONTEXT);
  });

  it('handles spans arriving out of order', () => {
    const { segments } = segmentContext(CONTEXT, [cite('b', 30, CONTEXT.length), cite('a', 0, 15)]);
    expect(segments.map((s) => s.text).join('')).toBe(CONTEXT);
    expect(segments.at(-1)?.text).toBe(' Gamma sentence.');
    expect(segments.at(-1)?.citations.map((c) => c.id)).toEqual(['b']);
  });

  it('clamps a span that runs past the end of the context', () => {
    const { segments } = segmentContext(CONTEXT, [cite('a', 30, 9_999)]);
    expect(segments.map((s) => s.text).join('')).toBe(CONTEXT);
  });

  it('returns span-less citations as unanchored rather than dropping them', () => {
    const { segments, unanchored } = segmentContext(CONTEXT, [
      cite('a', 0, 15),
      cite('b', null, null),
    ]);
    expect(unanchored.map((c) => c.id)).toEqual(['b']);
    expect(segments.map((s) => s.text).join('')).toBe(CONTEXT);
  });

  it('treats an inverted span as unanchored instead of producing a negative slice', () => {
    const { segments, unanchored } = segmentContext(CONTEXT, [cite('a', 20, 5)]);
    expect(unanchored.map((c) => c.id)).toEqual(['a']);
    expect(segments).toEqual([{ text: CONTEXT, citations: [] }]);
  });

  it('returns no segments for an empty context', () => {
    const { segments, unanchored } = segmentContext('', [cite('a', 0, 5)]);
    expect(segments).toEqual([]);
    expect(unanchored).toHaveLength(1);
  });
});

describe('citationNumbers', () => {
  it('numbers citations from 1 in returned order', () => {
    const map = citationNumbers([cite('a', 0, 1), cite('b', 1, 2)]);
    expect(map.get('a')).toBe(1);
    expect(map.get('b')).toBe(2);
  });
});
