import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { qk } from '@/api/keys';
import type {
  AuthorsBreakdown,
  ConceptsResponse,
  EmotionsBreakdown,
  EngagementsBreakdown,
  HighRiskPost,
  KpiBundle,
  PageResponse,
  PostsBreakdown,
  SentimentBreakdown,
  TimeseriesAgg,
  TimeseriesGroupBy,
  TimeseriesInterval,
  TimeseriesMetric,
  TimeseriesResponse,
} from '@/api/types';
import { toQueryParams, type FilterSpec, type ListSpec } from '@/lib/filters';

export function useKpis(filters: FilterSpec, enabled = true) {
  return useQuery({
    queryKey: qk.overview.kpis(filters),
    queryFn: () => api.get<KpiBundle>('/overview/kpis', toQueryParams(filters)),
    enabled: enabled && Boolean(filters.project_id),
  });
}

export interface TimeseriesOptions {
  metric: TimeseriesMetric;
  group_by: TimeseriesGroupBy;
  interval: TimeseriesInterval;
  agg: TimeseriesAgg;
  normalize: boolean;
}

export function useTimeseries(filters: FilterSpec, options: TimeseriesOptions, enabled = true) {
  return useQuery({
    queryKey: qk.overview.timeseries(filters, { ...options }),
    queryFn: () =>
      api.get<TimeseriesResponse>('/overview/timeseries', {
        ...toQueryParams(filters),
        ...options,
      }),
    enabled: enabled && Boolean(filters.project_id),
  });
}

export function useConcepts(filters: FilterSpec, enabled = true) {
  return useQuery({
    queryKey: qk.overview.concepts(filters),
    queryFn: () => api.get<ConceptsResponse>('/overview/concepts', toQueryParams(filters)),
    enabled: enabled && Boolean(filters.project_id),
  });
}

export function useHighRiskPosts(filters: FilterSpec, list: ListSpec = { limit: 20 }) {
  return useQuery({
    queryKey: qk.overview.highRiskPosts(filters, list),
    queryFn: () =>
      api.get<PageResponse<HighRiskPost>>('/overview/high-risk-posts', {
        ...toQueryParams(filters),
        limit: list.limit,
      }),
    enabled: Boolean(filters.project_id),
  });
}

/**
 * The five KPI drilldowns. Each returns its own breakdown schema; the union is
 * discriminated by `slice` at the call site so no component has to guess.
 */
export type KpiSlice = 'posts' | 'engagements' | 'authors' | 'emotions' | 'sentiment';

export interface KpiBreakdownMap {
  posts: PostsBreakdown;
  engagements: EngagementsBreakdown;
  authors: AuthorsBreakdown;
  emotions: EmotionsBreakdown;
  sentiment: SentimentBreakdown;
}

export function useKpiBreakdown<K extends KpiSlice>(
  slice: K,
  filters: FilterSpec,
  enabled = true,
) {
  return useQuery({
    queryKey: qk.overview.kpiDrilldown(slice, filters),
    queryFn: () => api.get<KpiBreakdownMap[K]>(`/overview/kpis/${slice}`, toQueryParams(filters)),
    enabled: enabled && Boolean(filters.project_id),
  });
}
