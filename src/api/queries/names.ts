import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { qk } from '@/api/keys';
import { useNarrative } from '@/api/queries/narratives';
import type { NamedRef } from '@/api/types';
import type { FilterKey } from '@/lib/filters';

/**
 * Id -> display name lookups behind the filter chips. Each id is its own query key, so
 * a name is fetched once per session window however many chips or pages show it, and a
 * 404 is cached as a settled answer instead of being retried (see `queryClient`).
 * Names change rarely, hence the longer stale window than the default.
 */
const NAME_STALE_MS = 5 * 60_000;

export function useCohortName(cohortId: string | undefined) {
  return useQuery({
    queryKey: qk.cohorts.name(cohortId ?? ''),
    queryFn: () => api.get<NamedRef>(`/cohorts/${encodeURIComponent(cohortId!)}`),
    enabled: Boolean(cohortId),
    staleTime: NAME_STALE_MS,
  });
}

export function useAuthorGroupName(groupId: string | undefined) {
  return useQuery({
    queryKey: qk.authors.groupName(groupId ?? ''),
    queryFn: () => api.get<NamedRef>(`/author-groups/${encodeURIComponent(groupId!)}`),
    enabled: Boolean(groupId),
    staleTime: NAME_STALE_MS,
  });
}

export type ChipNameLookup =
  | { state: 'none' }
  | { state: 'loading' }
  | { state: 'not_found' }
  | { state: 'error' }
  | { state: 'resolved'; name: string };

/** The filter keys whose values are ids with a name behind them. */
export const NAMED_FILTER_KEYS: readonly FilterKey[] = [
  'cohort_id',
  'narrative_id',
  'author_group_id',
];

/**
 * Resolves one chip value. Only the hook matching `key` is enabled, so a `platform`
 * chip issues no request. Narratives reuse the detail query, so a narrative already
 * open on screen costs nothing extra.
 */
export function useChipName(key: FilterKey, value: string | undefined): ChipNameLookup {
  const cohort = useCohortName(key === 'cohort_id' ? value : undefined);
  const group = useAuthorGroupName(key === 'author_group_id' ? value : undefined);
  const narrative = useNarrative(key === 'narrative_id' ? value : undefined);

  if (value === undefined || !NAMED_FILTER_KEYS.includes(key)) return { state: 'none' };

  const q = key === 'cohort_id' ? cohort : key === 'author_group_id' ? group : narrative;
  if (q.isPending) return { state: 'loading' };
  if (q.isError) {
    return { state: q.error instanceof ApiError && q.error.isNotFound ? 'not_found' : 'error' };
  }
  const name =
    key === 'narrative_id' ? narrative.data?.title.text : (q.data as NamedRef | undefined)?.name;
  return name ? { state: 'resolved', name } : { state: 'error' };
}
