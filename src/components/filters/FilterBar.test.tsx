import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { qk } from '@/api/keys';
import { TooltipProvider } from '@/components/ui/tooltip';
import { emptyFilterSpec, type FilterSpec } from '@/lib/filters';
import { FilterBar } from './FilterBar';

const COHORT = '7f3a9c1e-1111-4222-8333-444455556666';
const GROUP = 'aaaa0000-1111-4222-8333-444455556666';

function mount(filters: FilterSpec, qc: QueryClient) {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  const root = createRoot(host);
  act(() =>
    root.render(
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <FilterBar filters={filters} onChange={() => {}} onReset={() => {}} />
        </TooltipProvider>
      </QueryClientProvider>,
    ),
  );
  return { host, unmount: () => act(() => root.unmount()) };
}

const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, networkMode: 'always' } } });

const spec = (patch: Partial<FilterSpec>): FilterSpec => ({ ...emptyFilterSpec('p1'), ...patch });

// Request paths, query string dropped. AdvancedFilters issues its own list request.
const urls = (m: ReturnType<typeof vi.fn>) =>
  m.mock.calls.map((c) => new URL(String(c[0])).pathname.replace('/api/v1', ''));

afterEach(() => vi.unstubAllGlobals());

describe('FilterBar id chips', () => {
  it('shows the name of a cached cohort', () => {
    const qc = newClient();
    qc.setQueryData(qk.cohorts.name(COHORT), { id: COHORT, name: 'Verified journalists' });
    const { host, unmount } = mount(spec({ cohort_id: [COHORT] }), qc);
    expect(host.textContent).toContain('Cohort: Verified journalists');
    expect(host.innerHTML).not.toContain('title="');
    unmount();
  });

  it('resolves a name from the route and then renders it', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ id: GROUP, name: 'Known Hostile Telegram Channels' }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { host, unmount } = mount(spec({ author_group_id: [GROUP] }), newClient());
    // Before the response lands the chip reads as a short id and says so.
    expect(host.textContent).toContain('Author group: aaaa0000…');
    expect(host.innerHTML).toContain('Loading name, showing short id');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(host.textContent).toContain('Author group: Known Hostile Telegram Channels');
    expect(urls(fetchMock)).toContain(`/author-groups/${GROUP}`);
    unmount();
  });

  it('falls back to the short id with an explanatory title on a 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          { error: { code: 'cohort_not_found', message: 'No cohort', request_id: 'r1' } },
          { status: 404 },
        ),
      ),
    );
    const { host, unmount } = mount(spec({ cohort_id: [COHORT] }), newClient());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(host.textContent).toContain('Cohort: 7f3a9c1e…');
    expect(host.innerHTML).toContain('Name not found, showing short id');
    unmount();
  });

  it('issues no lookup for chips that are not ids', () => {
    const fetchMock = vi.fn(async () => Response.json({ items: [], next_cursor: null }));
    vi.stubGlobal('fetch', fetchMock);
    const { host, unmount } = mount(spec({ platform: ['reddit'] }), newClient());
    expect(host.textContent).toContain('Platform: reddit');
    expect(urls(fetchMock).filter((u) => /\/(cohorts|author-groups)\//.test(u))).toEqual([]);
    unmount();
  });
});
