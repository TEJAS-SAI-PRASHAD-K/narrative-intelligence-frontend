import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { qk } from '@/api/keys';
import type {
  AuthorGroupOut,
  AuthorOut,
  AuthorScoreExplanation,
  AuthorTimeline,
  CohortOut,
  DomainNarrativeLink,
  DomainOut,
  DriversResponse,
  JobAccepted,
  PageResponse,
  PostOut,
  SimilarRequest,
  SimilarResponse,
  ThreadResponse,
} from '@/api/types';
import { toQueryParams, type FilterSpec, type ListSpec } from '@/lib/filters';

// --- drivers ---------------------------------------------------------------

export type DriverKind = 'authors' | 'hashtags' | 'urls';

export function useDrivers(kind: DriverKind, filters: FilterSpec, list: ListSpec) {
  return useQuery({
    queryKey: qk.drivers.list(kind, filters, list),
    queryFn: () =>
      api.get<DriversResponse>(`/drivers/${kind}`, {
        ...toQueryParams(filters),
        limit: list.limit,
        cursor: list.cursor,
      }),
    enabled: Boolean(filters.project_id),
  });
}

// --- authors ---------------------------------------------------------------

export function useAuthors(filters: FilterSpec, list: ListSpec) {
  return useInfiniteQuery({
    queryKey: qk.authors.list(filters, list),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<PageResponse<AuthorOut>>('/authors', {
        ...toQueryParams(filters),
        sort: list.sort,
        limit: list.limit,
        cursor: pageParam,
      }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: Boolean(filters.project_id),
  });
}

export function useAuthor(authorId: string | undefined) {
  return useQuery({
    queryKey: qk.authors.detail(authorId ?? ''),
    queryFn: () => api.get<AuthorOut>(`/authors/${encodeURIComponent(authorId!)}`),
    enabled: Boolean(authorId),
  });
}

export function useAuthorScore(authorId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: qk.authors.score(authorId ?? ''),
    queryFn: () =>
      api.get<AuthorScoreExplanation>(`/authors/${encodeURIComponent(authorId!)}/score`),
    enabled: enabled && Boolean(authorId),
  });
}

export function useAuthorTimeline(
  authorId: string | undefined,
  options: { interval: string; tz: string },
) {
  return useQuery({
    queryKey: qk.authors.timeline(authorId ?? '', { ...options }),
    queryFn: () =>
      api.get<AuthorTimeline>(`/authors/${encodeURIComponent(authorId!)}/timeline`, options),
    enabled: Boolean(authorId),
  });
}

export function useAuthorPosts(authorId: string | undefined, list: ListSpec) {
  return useQuery({
    queryKey: qk.authors.posts(authorId ?? '', list),
    queryFn: () =>
      api.get<PageResponse<PostOut>>(`/authors/${encodeURIComponent(authorId!)}/posts`, {
        limit: list.limit,
        cursor: list.cursor,
      }),
    enabled: Boolean(authorId),
  });
}

export function useAuthorGroups(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.authors.groups(projectId ?? ''),
    queryFn: () =>
      api.get<PageResponse<AuthorGroupOut>>('/author-groups', { project_id: projectId }),
    enabled: Boolean(projectId),
  });
}

// --- cohorts ---------------------------------------------------------------

export function useCohorts(filters: FilterSpec, list: ListSpec) {
  return useQuery({
    queryKey: qk.cohorts.list(filters, list),
    queryFn: () =>
      api.get<PageResponse<CohortOut>>('/cohorts', {
        ...toQueryParams(filters),
        limit: list.limit,
        cursor: list.cursor,
      }),
    enabled: Boolean(filters.project_id),
  });
}

export function useCohortAuthors(cohortId: string | undefined, list: ListSpec) {
  return useQuery({
    queryKey: qk.cohorts.authors(cohortId ?? '', list),
    queryFn: () =>
      api.get<PageResponse<AuthorOut>>(`/cohorts/${encodeURIComponent(cohortId!)}/authors`, {
        limit: list.limit,
        cursor: list.cursor,
      }),
    enabled: Boolean(cohortId),
  });
}

// --- domains ---------------------------------------------------------------

export function useDomains(filters: FilterSpec, list: ListSpec) {
  return useInfiniteQuery({
    queryKey: qk.domains.list(filters, list),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<PageResponse<DomainOut>>('/domains', {
        ...toQueryParams(filters),
        sort: list.sort,
        limit: list.limit,
        cursor: pageParam,
      }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: Boolean(filters.project_id),
  });
}

export function useDomain(domain: string | undefined, projectId: string) {
  return useQuery({
    queryKey: qk.domains.detail(domain ?? '', projectId),
    queryFn: () =>
      api.get<DomainOut>(`/domains/${encodeURIComponent(domain!)}`, { project_id: projectId }),
    enabled: Boolean(domain && projectId),
  });
}

export function useDomainNarratives(domain: string | undefined, projectId: string) {
  return useQuery({
    queryKey: qk.domains.narratives(domain ?? '', projectId),
    queryFn: () =>
      api.get<DomainNarrativeLink[]>(`/domains/${encodeURIComponent(domain!)}/narratives`, {
        project_id: projectId,
      }),
    enabled: Boolean(domain && projectId),
  });
}

/** 202. Enrichment is a job; the badge does not flip until the tray says it did. */
export function useEnrichDomain() {
  return useMutation({
    mutationFn: ({ domain, projectId }: { domain: string; projectId: string }) =>
      api.post<JobAccepted>(`/domains/${encodeURIComponent(domain)}/enrich`, undefined, {
        project_id: projectId,
      }),
  });
}

// --- posts -----------------------------------------------------------------

export function usePosts(filters: FilterSpec, list: ListSpec, enabled = true) {
  return useInfiniteQuery({
    queryKey: qk.posts.list(filters, list),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<PageResponse<PostOut>>('/posts', {
        ...toQueryParams(filters),
        sort: list.sort,
        limit: list.limit,
        cursor: pageParam,
      }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: enabled && Boolean(filters.project_id),
  });
}

export function usePost(postId: string | undefined) {
  return useQuery({
    queryKey: qk.posts.detail(postId ?? ''),
    queryFn: () => api.get<PostOut>(`/posts/${encodeURIComponent(postId!)}`),
    enabled: Boolean(postId),
  });
}

export function usePostThread(postId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: qk.posts.thread(postId ?? ''),
    queryFn: () => api.get<ThreadResponse>(`/posts/${encodeURIComponent(postId!)}/thread`),
    enabled: enabled && Boolean(postId),
  });
}

export function useSimilarPosts() {
  return useMutation({
    mutationFn: (body: SimilarRequest) => api.post<SimilarResponse>('/posts/similar', body),
  });
}
