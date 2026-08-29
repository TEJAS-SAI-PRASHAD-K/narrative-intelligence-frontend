import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { qk } from '@/api/keys';
import type {
  ComparisonCreate,
  ComparisonOut,
  GraphResponse,
  JobAccepted,
  LayoutRequest,
  PageResponse,
} from '@/api/types';
import { toQueryParams, type FilterSpec } from '@/lib/filters';

export interface GraphOptions {
  narrative_id?: string[] | undefined;
  comparison_id?: string | undefined;
  max_nodes?: number | undefined;
  bucket: string;
  hide_standalone: boolean;
}

/**
 * `/network/graph` takes `narrative_id` as its own parameter rather than as part of
 * the shared filter set, so it is passed through `options` and the shared
 * `narrative_id` filter is stripped from the query. Keeping them separate is what
 * stops a top-bar narrative filter from silently re-scoping the graph.
 */
export function useGraph(filters: FilterSpec, options: GraphOptions, enabled = true) {
  const shared = toQueryParams(filters);
  delete shared.narrative_id;

  return useQuery({
    queryKey: qk.network.graph(filters, { ...options }),
    queryFn: () =>
      api.get<GraphResponse>('/network/graph', {
        ...shared,
        narrative_id: options.narrative_id,
        comparison_id: options.comparison_id,
        max_nodes: options.max_nodes,
        bucket: options.bucket,
        hide_standalone: options.hide_standalone,
      }),
    enabled: enabled && Boolean(filters.project_id),
    // A 20K-node payload is expensive to re-request; hold it longer than a list.
    staleTime: 120_000,
  });
}

/** 202. Positions come back on `GraphNode.x/y` once the job lands. */
export function usePrecomputeLayout() {
  return useMutation({
    mutationFn: (body: LayoutRequest) => api.post<JobAccepted>('/network/layout', body),
  });
}

export function useComparisons(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.network.comparisons(projectId ?? ''),
    queryFn: () =>
      api.get<PageResponse<ComparisonOut>>('/comparisons', { project_id: projectId }),
    enabled: Boolean(projectId),
  });
}

export function useComparison(comparisonId: string | undefined) {
  return useQuery({
    queryKey: qk.network.comparison(comparisonId ?? ''),
    queryFn: () => api.get<ComparisonOut>(`/comparisons/${encodeURIComponent(comparisonId!)}`),
    enabled: Boolean(comparisonId),
  });
}

export function useCreateComparison() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ComparisonCreate) => api.post<ComparisonOut>('/comparisons', body),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.network.all }),
  });
}

export function useDeleteComparison() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (comparisonId: string) =>
      api.delete<{ id: string; deleted?: boolean }>(
        `/comparisons/${encodeURIComponent(comparisonId)}`,
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.network.all }),
  });
}
