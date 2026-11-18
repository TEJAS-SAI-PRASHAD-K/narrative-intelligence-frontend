import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { EntityTable, type TablePagination } from './EntityTable';

beforeAll(() => {
  // jsdom has no ResizeObserver; the table uses one to place its overflow fades.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

interface Row {
  id: string;
}

function mount(pagination: TablePagination, rows: Row[] = [{ id: 'a' }, { id: 'b' }]) {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() =>
    root.render(
      <TooltipProvider>
        <EntityTable<Row>
          tableId="test"
          caption="rows"
          columns={[{ id: 'id', header: 'Id', cell: (r) => r.id }]}
          rows={rows}
          rowKey={(r) => r.id}
          pagination={pagination}
        />
      </TooltipProvider>,
    ),
  );
  return {
    host,
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

const base: TablePagination = {
  hasNextPage: true,
  isFetchingNextPage: false,
  onLoadMore: () => undefined,
  noun: 'authors',
};

describe('EntityTable pagination footer', () => {
  it('offers load more and reports progress against the total', () => {
    const onLoadMore = vi.fn();
    const { host, unmount } = mount({ ...base, onLoadMore, total: 5 });
    const button = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Load more authors'),
    );
    expect(button).toBeTruthy();
    expect(host.textContent).toContain('Showing 2 of 5 authors.');
    act(() => button!.click());
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('does not claim a total when the backend did not count', () => {
    const { host, unmount } = mount({ ...base, total: null });
    expect(host.textContent).toContain('Showing 2 authors.');
    expect(host.textContent).not.toContain(' of ');
    unmount();
  });

  it('disables the button while the next page loads', () => {
    const { host, unmount } = mount({ ...base, isFetchingNextPage: true });
    const button = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Loading'),
    );
    expect(button?.disabled).toBe(true);
    unmount();
  });

  it('says the list is complete once there is no next page', () => {
    const { host, unmount } = mount({ ...base, hasNextPage: false });
    expect(host.textContent).toContain('2 authors, complete for these filters.');
    expect(host.textContent).not.toContain('Load more');
    unmount();
  });
});
