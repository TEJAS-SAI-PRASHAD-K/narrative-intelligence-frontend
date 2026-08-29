import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiBaseUrl, API_PREFIX } from '@/api/client';
import { qk } from '@/api/keys';
import type {
  AlertOut,
  AlertRuleCreate,
  AlertRuleOut,
  AlertRuleUpdate,
  ApiKeyCreate,
  ApiKeyCreated,
  ApiKeyOut,
  IngestRequest,
  IngestRunOut,
  JobAccepted,
  JobOut,
  MediaCheckOut,
  PageResponse,
  ReportCreate,
  ReportOut,
} from '@/api/types';
import type { ListSpec } from '@/lib/filters';

// --- jobs ------------------------------------------------------------------

export function useJobHistory(params: {
  project_id?: string | undefined;
  kind?: string | undefined;
  status?: string | undefined;
  limit?: number | undefined;
}) {
  return useQuery({
    queryKey: qk.jobs.list({ ...params }),
    queryFn: () => api.get<PageResponse<JobOut>>('/jobs', { ...params }),
  });
}

export function useJob(jobId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: qk.jobs.detail(jobId ?? ''),
    queryFn: () => api.get<JobOut>(`/jobs/${encodeURIComponent(jobId!)}`),
    enabled: enabled && Boolean(jobId),
  });
}

// --- ingest ----------------------------------------------------------------

export function useIngestRuns(projectId: string | undefined, list: ListSpec = { limit: 50 }) {
  return useQuery({
    queryKey: qk.ingest.runs(projectId, list),
    queryFn: () =>
      api.get<PageResponse<IngestRunOut>>('/ingest/runs', {
        project_id: projectId,
        limit: list.limit,
      }),
    enabled: Boolean(projectId),
  });
}

/** 202. */
export function useStartIngest() {
  return useMutation({
    mutationFn: (body: IngestRequest) => api.post<JobAccepted>('/ingest', body),
  });
}

// --- media -----------------------------------------------------------------

export function useMediaChecks(list: ListSpec = { limit: 50 }) {
  return useQuery({
    queryKey: qk.media.list(list),
    queryFn: () => api.get<PageResponse<MediaCheckOut>>('/media/checks', { limit: list.limit }),
  });
}

export function useMediaCheck(jobId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: qk.media.check(jobId ?? ''),
    queryFn: () => api.get<MediaCheckOut>(`/media/check/${encodeURIComponent(jobId!)}`),
    enabled: enabled && Boolean(jobId),
  });
}

/** 202, multipart. The verdict is only readable once the job finishes. */
export function useSubmitMediaCheck() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.postForm<JobAccepted>('/media/check', form);
    },
  });
}

// --- reports ---------------------------------------------------------------

export function useReports(projectId: string | undefined, list: ListSpec = { limit: 50 }) {
  return useQuery({
    queryKey: qk.reports.list(projectId ?? '', list),
    queryFn: () =>
      api.get<PageResponse<ReportOut>>('/reports', {
        project_id: projectId,
        limit: list.limit,
      }),
    enabled: Boolean(projectId),
  });
}

/** 202. */
export function useCreateReport() {
  return useMutation({
    mutationFn: (body: ReportCreate) => api.post<JobAccepted>('/reports', body),
  });
}

/**
 * The download endpoint returns the file itself, not JSON, and needs the API key
 * header -- so it cannot be a plain `<a href>`. Fetch it and hand the blob to the
 * browser.
 */
export function reportDownloadUrl(reportId: string): string {
  return `${apiBaseUrl()}${API_PREFIX}/reports/${encodeURIComponent(reportId)}/download`;
}

export function useDownloadReport() {
  return useMutation({
    mutationFn: async (report: ReportOut) => {
      const blob = await api.get<Blob>(`/reports/${encodeURIComponent(report.id)}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${report.id}.${report.format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  });
}

// --- alerts ----------------------------------------------------------------

export function useAlerts(
  projectId: string | undefined,
  acknowledged: boolean | undefined,
  list: ListSpec = { limit: 50 },
) {
  return useQuery({
    queryKey: qk.alerts.list(projectId ?? '', acknowledged, list),
    queryFn: () =>
      api.get<PageResponse<AlertOut>>('/alerts', {
        project_id: projectId,
        acknowledged,
        limit: list.limit,
      }),
    enabled: Boolean(projectId),
  });
}

export function useAcknowledgeAlert() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) =>
      api.post<{ id: string; acknowledged_at: string; acknowledged_by: string }>(
        `/alerts/${encodeURIComponent(alertId)}/acknowledge`,
      ),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.alerts.all }),
  });
}

export function useAlertRules(projectId: string | undefined, list: ListSpec = { limit: 50 }) {
  return useQuery({
    queryKey: qk.alerts.rules(projectId ?? '', list),
    queryFn: () =>
      api.get<PageResponse<AlertRuleOut>>('/alert-rules', {
        project_id: projectId,
        limit: list.limit,
      }),
    enabled: Boolean(projectId),
  });
}

export function useCreateAlertRule() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: AlertRuleCreate) => api.post<AlertRuleOut>('/alert-rules', body),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.alerts.all }),
  });
}

export function useUpdateAlertRule() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AlertRuleUpdate }) =>
      api.patch<AlertRuleOut>(`/alert-rules/${encodeURIComponent(id)}`, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.alerts.all }),
  });
}

export function useDeleteAlertRule() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ id: string }>(`/alert-rules/${encodeURIComponent(id)}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.alerts.all }),
  });
}

// --- keys ------------------------------------------------------------------

export function useApiKeys() {
  return useQuery({
    queryKey: qk.keys.list(),
    queryFn: () => api.get<PageResponse<ApiKeyOut>>('/keys'),
  });
}

/** The plaintext `key` is returned exactly once, by this call, and never again. */
export function useCreateApiKey() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ApiKeyCreate) => api.post<ApiKeyCreated>('/keys', body),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.keys.all }),
  });
}

export function useRevokeApiKey() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => api.delete<ApiKeyOut>(`/keys/${encodeURIComponent(keyId)}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.keys.all }),
  });
}
