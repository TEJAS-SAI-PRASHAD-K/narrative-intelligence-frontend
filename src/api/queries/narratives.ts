import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/api/client';
import { qk } from '@/api/keys';
import { reconcileNarrative } from '@/api/reconcile';
import type {
  AuthorOut,
  CompassContext,
  CompassFeedback,
  CompassFeedbackResult,
  JobAccepted,
  NarrativeCohortShare,
  NarrativeCreate,
  NarrativeDetail,
  NarrativeFreshness,
  NarrativeScoreExplanation,
  NarrativeSummary,
  NarrativeTimeline,
  NarrativeUpdate,
  PageResponse,
  PostOut,
} from '@/api/types';
import { toQueryParams, type FilterSpec, type ListSpec } from '@/lib/filters';

export type NarrativeSort = 'priority' | 'date' | 'engagement';

/** Cursor-paginated feed. `next_cursor` drives infinite scroll; nothing is counted client-side. */
export function useNarrativeFeed(filters: FilterSpec, list: ListSpec) {
  return useInfiniteQuery({
    queryKey: qk.narratives.list(filters, list),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<PageResponse<NarrativeSummary>>('/narratives', {
        ...toQueryParams(filters),
        sort: list.sort,
        limit: list.limit,
        cursor: pageParam,
      }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: Boolean(filters.project_id),
  });
}

export function useNarrative(narrativeId: string | undefined) {
  return useQuery({
    queryKey: qk.narratives.detail(narrativeId ?? ''),
    queryFn: () => api.get<NarrativeDetail>(`/narratives/${encodeURIComponent(narrativeId!)}`),
    enabled: Boolean(narrativeId),
  });
}

export function useNarrativeScore(narrativeId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: qk.narratives.score(narrativeId ?? ''),
    queryFn: () =>
      api.get<NarrativeScoreExplanation>(`/narratives/${encodeURIComponent(narrativeId!)}/score`),
    enabled: enabled && Boolean(narrativeId),
  });
}

export function useNarrativeTimeline(
  narrativeId: string | undefined,
  options: { interval: string; tz: string; cross_platform: boolean },
) {
  return useQuery({
    queryKey: qk.narratives.timeline(narrativeId ?? '', { ...options }),
    queryFn: () =>
      api.get<NarrativeTimeline>(
        `/narratives/${encodeURIComponent(narrativeId!)}/timeline`,
        options,
      ),
    enabled: Boolean(narrativeId),
  });
}

export function useNarrativeCohorts(narrativeId: string | undefined) {
  return useQuery({
    queryKey: qk.narratives.cohorts(narrativeId ?? ''),
    queryFn: () =>
      api.get<NarrativeCohortShare[]>(`/narratives/${encodeURIComponent(narrativeId!)}/cohorts`),
    enabled: Boolean(narrativeId),
  });
}

export function useNarrativePosts(
  narrativeId: string | undefined,
  filters: FilterSpec,
  list: ListSpec,
) {
  return useQuery({
    queryKey: qk.narratives.posts(narrativeId ?? '', filters, list),
    queryFn: () =>
      api.get<PageResponse<PostOut>>(`/narratives/${encodeURIComponent(narrativeId!)}/posts`, {
        ...toQueryParams(filters),
        limit: list.limit,
        cursor: list.cursor,
      }),
    enabled: Boolean(narrativeId),
  });
}

export function useNarrativeAuthors(
  narrativeId: string | undefined,
  filters: FilterSpec,
  list: ListSpec,
) {
  return useQuery({
    queryKey: qk.narratives.authors(narrativeId ?? '', filters, list),
    queryFn: () =>
      api.get<PageResponse<AuthorOut>>(`/narratives/${encodeURIComponent(narrativeId!)}/authors`, {
        ...toQueryParams(filters),
        limit: list.limit,
        cursor: list.cursor,
      }),
    enabled: Boolean(narrativeId),
  });
}

export function useNarrativeFreshness(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.narratives.freshness(projectId ?? ''),
    queryFn: () => api.get<NarrativeFreshness>('/narratives/freshness', { project_id: projectId }),
    enabled: Boolean(projectId),
  });
}

export function useCompass(narrativeId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: qk.narratives.compass(narrativeId ?? ''),
    queryFn: () =>
      api.get<CompassContext>(`/narratives/${encodeURIComponent(narrativeId!)}/compass`),
    enabled: enabled && Boolean(narrativeId),
  });
}

// --- mutations -------------------------------------------------------------

/**
 * Optimistic rename. The analyst sees the new title immediately, but the server's
 * `updated_at` wins on reconcile so a background refetch (or a recluster finishing)
 * cannot silently discard an edit that has not landed yet.
 */
export function useUpdateNarrative() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: NarrativeUpdate }) =>
      api.patch<NarrativeDetail>(`/narratives/${encodeURIComponent(id)}`, body),

    onMutate: async ({ id, body }) => {
      await client.cancelQueries({ queryKey: qk.narratives.detail(id) });
      const previous = client.getQueryData<NarrativeDetail>(qk.narratives.detail(id));

      if (previous) {
        client.setQueryData<NarrativeDetail>(qk.narratives.detail(id), {
          ...previous,
          ...(body.title !== undefined && body.title !== null
            ? {
                title: {
                  text: body.title,
                  provenance: { ...previous.title.provenance, edited_by_user: true },
                },
              }
            : {}),
          ...(body.summary !== undefined && body.summary !== null
            ? {
                summary: {
                  text: body.summary,
                  provenance: { ...previous.summary.provenance, edited_by_user: true },
                },
              }
            : {}),
          ...(body.claim !== undefined ? { claim: body.claim } : {}),
        });
      }
      return { previous };
    },

    onError: (_err, { id }, ctx) => {
      if (ctx?.previous) client.setQueryData(qk.narratives.detail(id), ctx.previous);
    },

    onSuccess: (updated) => {
      // Reconcile rather than overwrite: if the server echoes a row older than the one
      // the edit was based on (a read replica, or a demo backend that ignores writes),
      // the analyst's text is kept until the write is actually visible.
      const previous = client.getQueryData<NarrativeDetail>(qk.narratives.detail(updated.id));
      client.setQueryData(qk.narratives.detail(updated.id), reconcileNarrative(previous, updated));

      // Refresh the feed so the card matches the detail view, but only the feed.
      void client.invalidateQueries({ queryKey: [...qk.narratives.all, 'list'] });
    },
  });
}

export function useCreateNarrative() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: NarrativeCreate) => api.post<NarrativeDetail>('/narratives', body),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.narratives.all }),
  });
}

/** 202. The caller hands the result to the job tray; it does not refetch on its own. */
export function useRecluster() {
  return useMutation({
    mutationFn: (projectId: string) =>
      api.post<JobAccepted>('/narratives/recluster', undefined, { project_id: projectId }),
  });
}

/** 202. Same contract: enqueue, track, invalidate on success. */
export function useRegenerateCompass() {
  return useMutation({
    mutationFn: (narrativeId: string) =>
      api.post<JobAccepted>(`/narratives/${encodeURIComponent(narrativeId)}/compass/regenerate`),
  });
}

export function useCompassFeedback() {
  return useMutation({
    mutationFn: ({ contextId, body }: { contextId: string; body: CompassFeedback }) =>
      api.post<CompassFeedbackResult>(
        `/compass/${encodeURIComponent(contextId)}/feedback`,
        body,
      ),
  });
}
