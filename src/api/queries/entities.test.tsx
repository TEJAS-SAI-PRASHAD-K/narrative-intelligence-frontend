import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { qk } from '@/api/keys';
import { useDrivers } from './entities';

const filters = { project_id: 'p1', tz: 'UTC' } as Parameters<typeof useDrivers>[1];

function page(entities: string[], next: string | null) {
  return {
    definition: 'd',
    entity_type: 'author',
    items: entities.map((entity) => ({ entity, entity_type: 'author', post_count: 1 })),
    next_cursor: next,
    total: 3,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('useDrivers paging', () => {
  it('walks next_cursor to the last page and keeps the cursor out of the key', async () => {
    const urls: string[] = [];
    const bodies = [page(['a', 'b'], 'c1'), page(['c'], null)];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        urls.push(String(input));
        return new Response(JSON.stringify(bodies[urls.length - 1]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );

    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let latest: ReturnType<typeof useDrivers> | undefined;
    function Probe() {
      latest = useDrivers('authors', filters, { limit: 2 });
      return null;
    }
    const root = createRoot(document.createElement('div'));
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <Probe />
        </QueryClientProvider>,
      );
    });
    await vi.waitFor(() => expect(latest?.data?.pages).toHaveLength(1));
    expect(latest?.hasNextPage).toBe(true);
    expect(new URL(urls[0]!).searchParams.has('cursor')).toBe(false);

    await act(async () => {
      await latest!.fetchNextPage();
    });
    expect(new URL(urls[1]!).searchParams.get('cursor')).toBe('c1');
    await vi.waitFor(() => expect(latest?.hasNextPage).toBe(false));
    expect(latest?.data?.pages.flatMap((p) => p.items.map((i) => i.entity))).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(JSON.stringify(qk.drivers.list('authors', filters, { limit: 2 }))).not.toContain('c1');
    act(() => root.unmount());
  });
});
