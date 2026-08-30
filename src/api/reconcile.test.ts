import { describe, expect, it } from 'vitest';
import type { NarrativeSummary } from './types';
import { reconcileNarrative, reconcileNarrativeList, shouldKeepLocalEdit } from './reconcile';

function narrative(
  id: string,
  title: string,
  updatedAt: string | null,
  edited: boolean,
): Pick<NarrativeSummary, 'id' | 'title' | 'updated_at'> {
  return {
    id,
    updated_at: updatedAt,
    title: {
      text: title,
      provenance: {
        generated_by: 'ai',
        model: 'claude-opus-5',
        generated_at: '2026-08-01T00:00:00Z',
        prompt_version: 'v1',
        edited_by_user: edited,
      },
    },
  };
}

/**
 * The acceptance criterion: an optimistic rename must survive a background refetch,
 * and a recluster job's invalidation must not blow away an in-flight edit.
 */
describe('shouldKeepLocalEdit', () => {
  const local = { updated_at: '2026-08-20T10:00:00Z' };

  it('keeps the local edit when the server row predates it', () => {
    expect(shouldKeepLocalEdit(local, { updated_at: '2026-08-20T09:00:00Z' })).toBe(true);
  });

  it('keeps the local edit when the timestamps are equal -- the server has not seen it', () => {
    expect(shouldKeepLocalEdit(local, { updated_at: '2026-08-20T10:00:00Z' })).toBe(true);
  });

  it('yields to the server once it is strictly newer', () => {
    expect(shouldKeepLocalEdit(local, { updated_at: '2026-08-20T10:00:01Z' })).toBe(false);
  });

  it('yields when either side cannot be ordered', () => {
    expect(shouldKeepLocalEdit(local, { updated_at: null })).toBe(false);
    expect(shouldKeepLocalEdit({ updated_at: null }, { updated_at: '2026-08-20T09:00:00Z' })).toBe(false);
    expect(shouldKeepLocalEdit(local, { updated_at: 'not a date' })).toBe(false);
  });
});

describe('reconcileNarrative', () => {
  it('preserves an analyst rename against a stale refetch', () => {
    const local = narrative('n1', 'ANALYST EDIT', '2026-08-20T10:00:00Z', true);
    const stale = narrative('n1', 'Original AI title', '2026-08-20T09:00:00Z', false);
    const merged = reconcileNarrative(local, stale);
    expect(merged.title.text).toBe('ANALYST EDIT');
    expect(merged.title.provenance.edited_by_user).toBe(true);
  });

  it('accepts the server title once the write has landed', () => {
    const local = narrative('n1', 'ANALYST EDIT', '2026-08-20T10:00:00Z', true);
    const fresh = narrative('n1', 'ANALYST EDIT', '2026-08-20T10:00:05Z', true);
    expect(reconcileNarrative(local, fresh).updated_at).toBe('2026-08-20T10:00:05Z');
  });

  it('does not resurrect a title the analyst never edited', () => {
    const local = narrative('n1', 'Old AI title', '2026-08-20T10:00:00Z', false);
    const reclustered = narrative('n1', 'New AI title', '2026-08-20T09:00:00Z', false);
    expect(reconcileNarrative(local, reclustered).title.text).toBe('New AI title');
  });

  it('never merges across different narratives', () => {
    const local = narrative('n1', 'ANALYST EDIT', '2026-08-20T10:00:00Z', true);
    const other = narrative('n2', 'Different narrative', '2026-08-20T09:00:00Z', false);
    expect(reconcileNarrative(local, other).title.text).toBe('Different narrative');
  });

  it('passes the server row straight through when there is no local copy', () => {
    const incoming = narrative('n1', 'Server title', '2026-08-20T09:00:00Z', false);
    expect(reconcileNarrative(undefined, incoming)).toBe(incoming);
  });
});

describe('reconcileNarrativeList', () => {
  it('keeps one edited row and takes the server copy for the rest', () => {
    const locals = [
      narrative('n1', 'ANALYST EDIT', '2026-08-20T10:00:00Z', true),
      narrative('n2', 'Old title', '2026-08-20T10:00:00Z', false),
    ];
    const incoming = [
      narrative('n1', 'Original', '2026-08-20T09:00:00Z', false),
      narrative('n2', 'Reclustered title', '2026-08-20T09:00:00Z', false),
    ];
    const merged = reconcileNarrativeList(locals, incoming);
    expect(merged[0]?.title.text).toBe('ANALYST EDIT');
    expect(merged[1]?.title.text).toBe('Reclustered title');
  });

  it('includes rows a recluster newly created', () => {
    const merged = reconcileNarrativeList(
      [narrative('n1', 'A', '2026-08-20T10:00:00Z', true)],
      [
        narrative('n1', 'A', '2026-08-20T09:00:00Z', false),
        narrative('n9', 'Brand new cluster', '2026-08-20T11:00:00Z', false),
      ],
    );
    expect(merged).toHaveLength(2);
    expect(merged[1]?.title.text).toBe('Brand new cluster');
  });
});
