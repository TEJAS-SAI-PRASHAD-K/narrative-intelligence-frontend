import type { Citation } from '@/api/types';

export interface ContextSegment {
  text: string;
  /** Citations whose span covers this segment, in the order they appear. */
  citations: Citation[];
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

  // Every span boundary, clamped into the string, deduplicated and ordered.
  const boundaries = new Set<number>([0, context.length]);
  for (const c of anchored) {
    boundaries.add(Math.max(0, c.char_start as number));
    boundaries.add(Math.min(context.length, c.char_end as number));
  }
  const points = [...boundaries].sort((a, b) => a - b);

  const segments: ContextSegment[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i] as number;
    const end = points[i + 1] as number;
    if (end <= start) continue;
    segments.push({
      text: context.slice(start, end),
      citations: anchored.filter(
        (c) => (c.char_start as number) <= start && (c.char_end as number) >= end,
      ),
    });
  }

  return { segments, unanchored };
}

/** Stable 1-based numbering in the order the citations were returned. */
export function citationNumbers(citations: Citation[]): Map<string, number> {
  return new Map(citations.map((c, i) => [c.id, i + 1]));
}
