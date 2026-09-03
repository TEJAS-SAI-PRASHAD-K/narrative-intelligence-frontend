import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUpDown, Columns3 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { EmptyState, ErrorState, SkeletonTableRows } from '@/components/states';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { STORAGE_KEYS } from '@/lib/storage';
import { useLocalState } from '@/lib/useLocalState';
import { cn } from '@/lib/utils';

/**
 * One table for authors, hashtags, urls, domains, cohorts, posts and jobs.
 *
 * Sorting writes to the URL (so a sorted view is shareable), column visibility goes to
 * localStorage (a preference, not part of the view), and rows above the virtualisation
 * threshold render through a windowed list so a 5,000-row driver table stays
 * interactive. Nothing here aggregates: totals and counts come from the endpoint.
 */

export interface Column<T> {
  id: string;
  header: string;
  /** Sort value written to the URL. Omit for columns the backend cannot sort by. */
  sortKey?: string;
  cell: (row: T) => ReactNode;
  width?: string;
  align?: 'left' | 'right';
  /** Hidden until the analyst enables it in the column picker. */
  defaultHidden?: boolean;
  headerHint?: string;
}

export interface EntityTableProps<T> {
  /** Persists column visibility under this name. */
  tableId: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  sort?: string | undefined;
  onSortChange?: (sort: string) => void;
  onRowClick?: ((row: T) => void) | undefined;
  selectedKey?: string | undefined;
  rowActions?: ((row: T) => ReactNode) | undefined;
  /** Above this many rows the body virtualises. */
  virtualizeAbove?: number;
  maxHeight?: string;
  footer?: ReactNode;
  caption: string;
}

const ROW_HEIGHT = 38;

export function EntityTable<T>({
  tableId,
  columns,
  rows,
  rowKey,
  isLoading,
  error,
  onRetry,
  emptyTitle = 'No rows match these filters',
  emptyDescription = 'Widen the date range or clear a filter chip.',
  sort,
  onSortChange,
  onRowClick,
  selectedKey,
  rowActions,
  virtualizeAbove = 200,
  maxHeight = '32rem',
  footer,
  caption,
}: EntityTableProps<T>) {
  const [hidden, setHidden] = useLocalState<string[]>(
    STORAGE_KEYS.columns(tableId),
    columns.filter((c) => c.defaultHidden).map((c) => c.id),
  );

  const visible = useMemo(() => columns.filter((c) => !hidden.includes(c.id)), [columns, hidden]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = rows.length > virtualizeAbove;

  /**
   * Whether there are columns off the right edge, and whether any are off the left.
   *
   * A wide table used to end in a bare horizontal scrollbar under the page, which reads
   * as a layout defect rather than as "there is more here". The fade says the same thing
   * where the analyst is already looking, and disappears once they reach the end.
   */
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const updateOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setOverflow({ left: el.scrollLeft > 1, right: max > 1 && el.scrollLeft < max - 1 });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateOverflow();
    // Column visibility, a resized window and late-arriving rows all change the answer.
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateOverflow, visible.length, rows.length]);

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? rows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  function toggleColumn(id: string) {
    setHidden(hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id]);
  }

  if (error && !isLoading) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Choose visible columns">
              <Columns3 className="h-3 w-3" aria-hidden="true" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
            <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
            {columns.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.id}
                checked={!hidden.includes(c.id)}
                onCheckedChange={() => toggleColumn(c.id)}
                onSelect={(e) => e.preventDefault()}
              >
                {c.header}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative">
        {/* Edge fades, not a bare scrollbar: they sit where the content is cut off. */}
        {overflow.left && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-30 w-6 rounded-l-lg bg-gradient-to-r from-background to-transparent"
          />
        )}
        {overflow.right && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-30 w-6 rounded-r-lg bg-gradient-to-l from-background to-transparent"
          />
        )}

        <div
          ref={scrollRef}
          onScroll={updateOverflow}
          className="overflow-auto rounded-lg border border-border"
          style={{ maxHeight }}
        >
          <table className="w-full border-collapse text-xs">
            <caption className="sr-only">{caption}</caption>
            <thead className="sticky top-0 z-20 bg-surface-raised/95 backdrop-blur">
              <tr>
                {visible.map((c, i) => (
                  <HeaderCell
                    key={c.id}
                    column={c}
                    sort={sort}
                    onSortChange={onSortChange}
                    sticky={i === 0}
                  />
                ))}
                {rowActions && (
                  <th scope="col" className="w-20 px-2.5 py-2 text-right">
                    <span className="sr-only">Row actions</span>
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <SkeletonTableRows rows={8} columns={visible.length + (rowActions ? 1 : 0)} />
              )}

              {!isLoading && shouldVirtualize && (
                <>
                  {/* Spacer rows keep the scrollbar honest while only the window renders. */}
                  <SpacerRow
                    height={virtualizer.getVirtualItems()[0]?.start ?? 0}
                    span={visible.length}
                  />
                  {virtualizer.getVirtualItems().map((v) => {
                    const row = rows[v.index];
                    if (!row) return null;
                    return (
                      <Row
                        key={rowKey(row)}
                        row={row}
                        columns={visible}
                        rowKey={rowKey}
                        onRowClick={onRowClick}
                        selectedKey={selectedKey}
                        rowActions={rowActions}
                      />
                    );
                  })}
                  <SpacerRow
                    height={
                      virtualizer.getTotalSize() - (virtualizer.getVirtualItems().at(-1)?.end ?? 0)
                    }
                    span={visible.length}
                  />
                </>
              )}

              {!isLoading &&
                !shouldVirtualize &&
                rows.map((row) => (
                  <Row
                    key={rowKey(row)}
                    row={row}
                    columns={visible}
                    rowKey={rowKey}
                    onRowClick={onRowClick}
                    selectedKey={selectedKey}
                    rowActions={rowActions}
                  />
                ))}
            </tbody>
          </table>

          {!isLoading && rows.length === 0 && (
            <EmptyState title={emptyTitle} description={emptyDescription} className="m-3" />
          )}
        </div>
      </div>

      {footer}
    </div>
  );
}

function SpacerRow({ height, span }: { height: number; span: number }) {
  if (height <= 0) return null;
  return (
    <tr aria-hidden="true">
      <td colSpan={span} style={{ height }} />
    </tr>
  );
}

function HeaderCell<T>({
  column,
  sort,
  onSortChange,
  sticky,
}: {
  column: Column<T>;
  sort: string | undefined;
  onSortChange: ((sort: string) => void) | undefined;
  /** The identity column stays put while the measures scroll past it. */
  sticky?: boolean;
}) {
  const sortable = Boolean(column.sortKey && onSortChange);
  const active = sortable && sort === column.sortKey;

  return (
    <th
      scope="col"
      style={column.width ? { width: column.width } : undefined}
      aria-sort={active ? 'descending' : sortable ? 'none' : undefined}
      className={cn(
        'whitespace-nowrap border-b border-border px-3 py-2.5 text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground',
        column.align === 'right' ? 'text-right' : 'text-left',
        sticky && 'sticky left-0 z-10 bg-surface-raised',
      )}
    >
      {sortable ? (
        <button
          type="button"
          onClick={() => onSortChange?.(column.sortKey as string)}
          title={column.headerHint}
          className={cn(
            'inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
            active && 'text-foreground',
          )}
        >
          {column.header}
          {active ? (
            <ArrowDown className="h-2.5 w-2.5" aria-hidden="true" />
          ) : (
            <ArrowUpDown className="h-2.5 w-2.5 opacity-40" aria-hidden="true" />
          )}
        </button>
      ) : (
        <span title={column.headerHint}>{column.header}</span>
      )}
    </th>
  );
}

function Row<T>({
  row,
  columns,
  rowKey,
  onRowClick,
  selectedKey,
  rowActions,
}: {
  row: T;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick: ((row: T) => void) | undefined;
  selectedKey: string | undefined;
  rowActions: ((row: T) => ReactNode) | undefined;
}) {
  const key = rowKey(row);
  const selected = selectedKey === key;
  const clickable = Boolean(onRowClick);

  return (
    <tr
      // A clickable row is keyboard-reachable and announces its state; a div-with-onClick
      // would leave the whole table unusable without a mouse.
      {...(clickable
        ? {
            tabIndex: 0,
            role: 'button' as const,
            'aria-pressed': selected,
            onClick: () => onRowClick?.(row),
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRowClick?.(row);
              }
            },
          }
        : {})}
      className={cn(
        'group border-b border-border/60 transition-colors last:border-b-0',
        clickable &&
          'cursor-pointer hover:bg-accent/40 focus-visible:bg-accent/60 focus-visible:outline-none',
        selected && 'bg-accent/60',
      )}
      style={{ height: ROW_HEIGHT }}
    >
      {columns.map((c, i) => (
        <td
          key={c.id}
          className={cn(
            'px-3 py-2',
            c.align === 'right' ? 'text-right' : 'text-left',
            // The identity column stays readable while the measures scroll past it, so
            // an analyst never loses track of which row they are reading. It needs its
            // own background to cover what scrolls under it -- including the row's
            // hover and selected states, which would otherwise stop at its edge.
            i === 0 &&
              cn(
                'sticky left-0 z-[1] bg-background',
                clickable && 'group-hover:bg-accent/40',
                selected && 'bg-accent/60',
              ),
          )}
        >
          {c.cell(row)}
        </td>
      ))}
      {rowActions && <td className="px-3 py-2 text-right">{rowActions(row)}</td>}
    </tr>
  );
}
