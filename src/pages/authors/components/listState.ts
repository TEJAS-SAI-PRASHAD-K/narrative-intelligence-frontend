/** What a list needs from an infinite query, so the views stay testable without one. */
export interface ListState<T> {
  items: T[];
  total: number | undefined;
  isLoading: boolean;
  error: unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}

type InfiniteResult<T> = {
  data?: { pages: { items: T[]; total?: number | null }[] } | undefined;
  isLoading: boolean;
  error: unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
  refetch: () => unknown;
};

/** Flattens every loaded page; `total` comes from the latest page. */
export function toListState<T>(q: InfiniteResult<T>): ListState<T> {
  const pages = q.data?.pages ?? [];
  return {
    items: pages.flatMap((p) => p.items),
    total: pages.at(-1)?.total ?? undefined,
    isLoading: q.isLoading,
    error: q.error,
    hasNextPage: q.hasNextPage,
    isFetchingNextPage: q.isFetchingNextPage,
    onLoadMore: () => void q.fetchNextPage(),
    onRetry: () => void q.refetch(),
  };
}
