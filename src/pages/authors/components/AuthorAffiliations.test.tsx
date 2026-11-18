import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/client';
import { authorCohorts, authorNarratives } from '@/components/__fixtures__';
import { renderHtml } from '@/test/renderHtml';
import { AuthorCohortsView, AuthorNarrativesView } from './AuthorAffiliations';
import { toListState, type ListState } from './listState';

function state<T>(items: T[], patch: Partial<ListState<T>> = {}): ListState<T> {
  return {
    items,
    total: items.length,
    isLoading: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    onLoadMore: () => undefined,
    onRetry: () => undefined,
    ...patch,
  };
}

const narratives = (s: ListState<(typeof authorNarratives)[number]>, slug = 'demo') =>
  renderHtml(
    <MemoryRouter>
      <AuthorNarrativesView state={s} slug={slug} />
    </MemoryRouter>,
  );

describe('AuthorNarrativesView', () => {
  it('links each narrative to its detail page and shows its title', () => {
    const html = narratives(state(authorNarratives));
    expect(html).toContain('href="/p/demo/narratives/narr-1"');
    expect(html).toContain('href="/p/demo/narratives/narr-2"');
    expect(html).toContain('Ballots were counted twice in two districts');
    expect(html).toContain('Untitled narrative');
  });

  it('renders null engagement as not measured, never zero', () => {
    const html = narratives(state([authorNarratives[1]!]));
    expect(html).toContain('Not measured');
    expect(html).not.toContain('>0<');
  });

  it('says so when the author is in no narrative', () => {
    const html = narratives(state([]));
    expect(html).toContain('No narratives');
    expect(html).not.toContain('<ul');
  });

  it('shows the error with a retry, not an empty state', () => {
    const error = new ApiError({ code: 'author_not_found', message: 'nope', status: 404 });
    const html = narratives(state([], { error }));
    expect(html).toContain('Could not load this author');
    expect(html).toContain('Retry');
    expect(html).not.toContain('No narratives');
  });

  it('offers to load the next page only when there is one', () => {
    expect(narratives(state(authorNarratives))).not.toContain('Load more');
    const html = narratives(state(authorNarratives, { hasNextPage: true, total: 25 }));
    expect(html).toContain('Load more narratives');
    expect(html).toContain('2 of 25');
  });
});

describe('AuthorCohortsView', () => {
  it('lists cohorts with their category', () => {
    const html = renderHtml(<AuthorCohortsView state={state(authorCohorts)} />);
    expect(html).toContain('Verified journalists');
    expect(html).toContain('Influence tier');
  });

  it('adds who assigned a cohort when the author carries a membership', () => {
    const html = renderHtml(
      <AuthorCohortsView
        state={state(authorCohorts)}
        memberships={[
          {
            cohort_id: 'cohort-1',
            name: 'Verified journalists',
            category: 'influence_tier',
            confidence: 0.9,
            assigned_by: 'analyst',
          },
        ]}
      />,
    );
    expect(html).toContain('· analyst');
    expect(html).toContain('90%');
  });

  it('says so when the author has no cohorts', () => {
    const html = renderHtml(<AuthorCohortsView state={state([])} />);
    expect(html).toContain('No cohorts');
  });

  it('shows the error with a retry', () => {
    const html = renderHtml(<AuthorCohortsView state={state([], { error: new Error('boom') })} />);
    expect(html).toContain('Could not load this author');
    expect(html).toContain('Retry');
  });
});

describe('toListState', () => {
  it('flattens every loaded page and takes total from the latest', () => {
    const s = toListState({
      data: {
        pages: [
          { items: ['a', 'b'], total: 5 },
          { items: ['c'], total: 5 },
        ],
      },
      isLoading: false,
      error: null,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: () => undefined,
      refetch: () => undefined,
    });
    expect(s.items).toEqual(['a', 'b', 'c']);
    expect(s.total).toBe(5);
  });

  it('has no total before the first page', () => {
    const s = toListState<string>({
      data: undefined,
      isLoading: true,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: () => undefined,
      refetch: () => undefined,
    });
    expect(s.items).toEqual([]);
    expect(s.total).toBeUndefined();
  });
});
