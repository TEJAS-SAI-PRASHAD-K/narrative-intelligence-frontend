import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FILTER_PARAM_KEYS,
  LIST_PARAM_KEYS,
  parseFilterSpec,
  parseListSpec,
  removeChip,
  toSearchParams,
  type FilterChip,
  type FilterSpec,
  type ListSpec,
} from './filters';

/**
 * The URL is the state.
 *
 * This hook is the only way a page reads or writes filters. There is no filter
 * context that owns values -- a context may mirror the URL, never own it. Every
 * mutation goes through `setFilters`, which rewrites the query string, which
 * re-derives the spec, which re-derives the query key.
 */
export function useFilters(
  projectId: string,
  listDefaults: ListSpec = {},
): {
  filters: FilterSpec;
  list: ListSpec;
  setFilters: (next: FilterSpec, options?: { resetCursor?: boolean }) => void;
  patchFilters: (patch: Partial<FilterSpec>) => void;
  setList: (patch: Partial<ListSpec>) => void;
  dropChip: (chip: FilterChip) => void;
  resetFilters: () => void;
  /** Params this hook does not own, so a page can keep its own tab/selection state. */
  pageParams: URLSearchParams;
  setPageParam: (key: string, value: string | null) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => parseFilterSpec(searchParams, projectId),
    [searchParams, projectId],
  );

  const list = useMemo(
    () => parseListSpec(searchParams, listDefaults),
    // `listDefaults` is a literal at every call site; depending on its identity would
    // rebuild the spec on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, listDefaults.sort, listDefaults.limit, listDefaults.cursor],
  );

  /** Params owned by the page rather than by the filter bar, preserved on every write. */
  const pageParams = useMemo(() => {
    const owned = new Set([...FILTER_PARAM_KEYS, ...LIST_PARAM_KEYS]);
    const rest = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      if (!owned.has(key)) rest.append(key, value);
    }
    return rest;
  }, [searchParams]);

  const write = useCallback(
    (spec: FilterSpec, nextList: ListSpec, extra: URLSearchParams) => {
      const next = toSearchParams(spec, nextList);
      for (const [key, value] of extra.entries()) next.append(key, value);
      next.sort();
      setSearchParams(next, { replace: false });
    },
    [setSearchParams],
  );

  const setFilters = useCallback(
    (next: FilterSpec, options?: { resetCursor?: boolean }) => {
      // Changing a filter invalidates the cursor: page 3 of the old result set is not
      // page 3 of the new one.
      const nextList = options?.resetCursor === false ? list : { ...list, cursor: undefined };
      write(next, nextList, pageParams);
    },
    [list, pageParams, write],
  );

  const patchFilters = useCallback(
    (patch: Partial<FilterSpec>) => {
      setFilters({ ...filters, ...patch });
    },
    [filters, setFilters],
  );

  const setList = useCallback(
    (patch: Partial<ListSpec>) => {
      write(filters, { ...list, ...patch }, pageParams);
    },
    [filters, list, pageParams, write],
  );

  const dropChip = useCallback(
    (chip: FilterChip) => setFilters(removeChip(filters, chip)),
    [filters, setFilters],
  );

  const resetFilters = useCallback(() => {
    write(
      { project_id: projectId, tz: filters.tz, include_shared: true },
      { ...list, cursor: undefined },
      pageParams,
    );
  }, [projectId, filters.tz, list, pageParams, write]);

  const setPageParam = useCallback(
    (key: string, value: string | null) => {
      const extra = new URLSearchParams(pageParams);
      if (value === null) extra.delete(key);
      else extra.set(key, value);
      write(filters, list, extra);
    },
    [filters, list, pageParams, write],
  );

  return {
    filters,
    list,
    setFilters,
    patchFilters,
    setList,
    dropChip,
    resetFilters,
    pageParams,
    setPageParam,
  };
}
