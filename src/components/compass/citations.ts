import type { Citation } from '@/api/types';

export interface ContextSegment {
  text: string;
  /** Citations whose span covers this segment, in the order they appear. */
  citations: Citation[];
}

/**
 * Expands a span to whole words.
 *
 * The backend's spans are byte-accurate but not word-aligned -- they are produced by
 * a character budget, so a span routinely ends mid-word ("...as unver|ified"). Marking
 * that literally puts a superscript inside a word, which reads as a rendering bug and
 * makes the sentence harder to read, without telling the analyst anything true: a
 * source supports a claim at sentence granularity, not at character 245.
 *
 * So boundaries are widened outward to the enclosing word for *display only*. The
 * adjustment is at most one partial word at each end and cannot change which sentence
 * a citation is attached to. Nothing else about the span is altered, and the raw
 * `char_start`/`char_end` are never rewritten in the data.
 */
function snapToWords(context: string, start: number, end: number): [number, number] {
  const isWord = (i: number) => i >= 0 && i < context.length && /\S/.test(context[i] as string);

  let s = Math.max(0, Math.min(start, context.length));
  let e = Math.max(0, Math.min(end, context.length));

  // Walk the start back to the beginning of the word it landed inside.
  while (s > 0 && isWord(s) && isWord(s - 1)) s -= 1;
  // Walk the end forward to the end of the word it landed inside.
  while (e < context.length && isWord(e) && isWord(e - 1)) e += 1;

  return [s, e];
}

/**
 * Splits `context` into segments by citation character spans.
 *
 * The backend returns `char_start`/`char_end` precisely so citations can be rendered
 * *at the sentence they support*, not appended as a flat bibliography. Spans may
 * overlap and may be out of order, so this walks every boundary once and attaches
 * every citation covering each run of characters.
 *
 * Citations without spans are returned separately: they are real sources the model
 * used, they just cannot be anchored, and dropping them would understate the
 * evidence base.
 */
export function segmentContext(
  context: string,
  citations: Citation[],
): { segments: ContextSegment[]; unanchored: Citation[] } {
  const anchored = citations.filter(
    (c) =>
      typeof c.char_start === 'number' &&
      typeof c.char_end === 'number' &&
      c.char_end > c.char_start &&
      c.char_start >= 0 &&
      c.char_start < context.length,
  );
  const unanchored = citations.filter((c) => !anchored.includes(c));

  if (context.length === 0) return { segments: [], unanchored: citations };
  if (anchored.length === 0) {
    return { segments: [{ text: context, citations: [] }], unanchored };
  }

  // Word-aligned span per citation, then every boundary, deduplicated and ordered.
  const spans = new Map<string, [number, number]>(
    anchored.map((c) => [
      c.id,
      snapToWords(context, c.char_start as number, c.char_end as number),
    ]),
  );

  const boundaries = new Set<number>([0, context.length]);
  for (const [start, end] of spans.values()) {
    boundaries.add(start);
    boundaries.add(end);
  }
  const points = [...boundaries].sort((a, b) => a - b);

  const segments: ContextSegment[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i] as number;
    const end = points[i + 1] as number;
    if (end <= start) continue;
    segments.push({
      text: context.slice(start, end),
      citations: anchored.filter((c) => {
        const span = spans.get(c.id);
        return span !== undefined && span[0] <= start && span[1] >= end;
      }),
    });
  }

  return { segments, unanchored };
}

/** Stable 1-based numbering in the order the citations were returned. */
export function citationNumbers(citations: Citation[]): Map<string, number> {
  return new Map(citations.map((c, i) => [c.id, i + 1]));
}
