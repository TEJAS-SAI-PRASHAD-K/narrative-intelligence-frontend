import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { qk } from '@/api/keys';
import type {
  HealthResponse,
  PageResponse,
  ProjectCreate,
  ProjectOut,
  ReadinessResponse,
  SourceHealth,
  SourceTestResult,
} from '@/api/types';

export function useProjects() {
  return useQuery({
    queryKey: qk.projects.list(),
    queryFn: () => api.get<PageResponse<ProjectOut>>('/projects'),
    staleTime: 60_000,
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.projects.detail(projectId ?? ''),
    queryFn: () => api.get<ProjectOut>(`/projects/${encodeURIComponent(projectId!)}`),
    enabled: Boolean(projectId),
  });
}

export function useCreateProject() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ProjectCreate) => api.post<ProjectOut>('/projects', body),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.projects.all }),
  });
}

export function useProjectSources(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.projects.sources(projectId ?? ''),
    queryFn: () => api.get<SourceHealth[]>(`/projects/${encodeURIComponent(projectId!)}/sources`),
    enabled: Boolean(projectId),
  });
}

export function useTestSource(projectId: string) {
  return useMutation({
    mutationFn: (source: string) =>
      api.post<SourceTestResult>(
        `/projects/${encodeURIComponent(projectId)}/sources/${encodeURIComponent(source)}/test`,
      ),
  });
}

/** `/healthz` and `/readyz` live outside `/api/v1` and need no key. */
export function useHealth() {
  return useQuery({
    queryKey: qk.health,
    queryFn: () => api.root<HealthResponse>('/healthz'),
    staleTime: 30_000,
  });
}

export function useReadiness() {
  return useQuery({
    queryKey: qk.readiness,
    queryFn: () => api.root<ReadinessResponse>('/readyz'),
    staleTime: 30_000,
  });
}
