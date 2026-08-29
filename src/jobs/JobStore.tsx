import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '@/api/client';
import { JOB_KIND_INVALIDATIONS, qk } from '@/api/keys';
import type { JobAccepted, JobOut } from '@/api/types';
import { useToast } from '@/components/ui/toast';

/**
 * Nothing that returns 202 is treated as done.
 *
 * Every enqueueing mutation hands its `JobAccepted` to `track()`. One store polls
 * `GET /jobs/{id}` with backoff for all of them, and on `succeeded` invalidates the
 * query families that job actually touched (`JOB_KIND_INVALIDATIONS`). A button that
 * fires a 202 and then pretends the data refreshed is a lie to the analyst.
 */

export interface TrackedJob {
  id: string;
  kind: string;
  /** Human label shown in the tray, e.g. "Recluster narratives". */
  label: string;
  status: JobOut['status'];
  progress: number;
  startedAt: number;
  finishedAt: number | null;
  error: string | null;
  requestId: string | null;
  result: Record<string, unknown> | null;
  /** Where the tray's "view" action should send the analyst. */
  href: string | null;
}

interface JobStoreValue {
  jobs: TrackedJob[];
  active: TrackedJob[];
  track: (accepted: JobAccepted, options?: { label?: string; href?: string }) => void;
  dismiss: (id: string) => void;
  cancel: (id: string) => Promise<void>;
  clearFinished: () => void;
}

const JobStoreContext = React.createContext<JobStoreValue | null>(null);

export function useJobs(): JobStoreValue {
  const ctx = React.useContext(JobStoreContext);
  if (!ctx) throw new Error('useJobs must be used inside <JobStoreProvider>');
  return ctx;
}

const TERMINAL: readonly JobOut['status'][] = ['succeeded', 'failed', 'cancelled'];

export function isTerminal(status: JobOut['status']): boolean {
  return TERMINAL.includes(status);
}

/** 1s while the job is young, backing off to 5s. Long jobs must not hammer the API. */
function pollDelay(elapsedMs: number): number {
  if (elapsedMs < 5_000) return 1_000;
  if (elapsedMs < 20_000) return 2_000;
  return 5_000;
}

function humanKind(kind: string): string {
  const labels: Record<string, string> = {
    'ingest.fetch': 'Fetch from sources',
    'ingest.load': 'Load into corpus',
    'nlp.embed': 'Embed posts',
    'nlp.cluster': 'Recluster narratives',
    'nlp.summarize': 'Summarise narratives',
    'score.posts': 'Score posts',
    'score.authors': 'Score authors',
    'score.fusion': 'Recompute fusion scores',
    'graph.build_edges': 'Build network edges',
    'graph.communities': 'Detect communities',
    'graph.layout': 'Compute graph layout',
    'compass.generate': 'Generate Compass context',
    'domain.enrich': 'Enrich domain',
    'media.deepfake': 'Deepfake check',
    'alerts.evaluate': 'Evaluate alert rules',
    'reports.render': 'Render report',
    'maint.purge_uploads': 'Purge uploads',
  };
  return labels[kind] ?? kind;
}

function invalidateForKind(client: QueryClient, kind: string): void {
  const families = JOB_KIND_INVALIDATIONS[kind];
  if (!families) {
    // An unmapped kind is a contract change, not a reason to nuke the cache silently.
    console.warn(`[jobs] no invalidation mapping for kind "${kind}"; nothing refetched`);
    return;
  }
  for (const key of families) void client.invalidateQueries({ queryKey: key });
}

export function JobStoreProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = React.useState<TrackedJob[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const timers = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // Kept in a ref so the polling loop never re-subscribes on every render.
  const toastRef = React.useRef(toast);
  toastRef.current = toast;
  const navigateRef = React.useRef(navigate);
  navigateRef.current = navigate;

  const stopPolling = React.useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const poll = React.useCallback(
    async (id: string, startedAt: number) => {
      let job: JobOut;
      try {
        job = await api.get<JobOut>(`/jobs/${encodeURIComponent(id)}`);
      } catch (err) {
        const apiErr = err instanceof ApiError ? err : null;
        setJobs((prev) =>
          prev.map((j) =>
            j.id === id
              ? {
                  ...j,
                  status: 'failed',
                  finishedAt: Date.now(),
                  error: apiErr?.message ?? 'Lost contact with the job',
                  requestId: apiErr?.requestId ?? null,
                }
              : j,
          ),
        );
        stopPolling(id);
        return;
      }

      setJobs((prev) =>
        prev.map((j) =>
          j.id === id
            ? {
                ...j,
                status: job.status,
                progress: Math.round((job.progress ?? 0) * 100),
                error: job.error ?? null,
                result: (job.result as Record<string, unknown> | null) ?? null,
                finishedAt: isTerminal(job.status) ? Date.now() : null,
              }
            : j,
        ),
      );

      if (!isTerminal(job.status)) {
        const timer = setTimeout(
          () => void poll(id, startedAt),
          pollDelay(Date.now() - startedAt),
        );
        timers.current.set(id, timer);
        return;
      }

      stopPolling(id);

      if (job.status === 'succeeded') {
        invalidateForKind(queryClient, job.kind);
        void queryClient.invalidateQueries({ queryKey: qk.jobs.all });
        setJobs((prev) => {
          const tracked = prev.find((j) => j.id === id);
          toastRef.current({
            title: `${humanKind(job.kind)} finished`,
            description: 'Affected views have been refreshed.',
            variant: 'success',
            ...(tracked?.href
              ? { action: { label: 'View', onSelect: () => navigateRef.current(tracked.href as string) } }
              : {}),
          });
          return prev;
        });
      } else if (job.status === 'failed') {
        toastRef.current({
          title: `${humanKind(job.kind)} failed`,
          description: job.error ?? 'The backend reported no detail.',
          variant: 'error',
          durationMs: 12_000,
        });
      }
    },
    [queryClient, stopPolling],
  );

  const track = React.useCallback(
    (accepted: JobAccepted, options?: { label?: string; href?: string }) => {
      const startedAt = Date.now();
      setJobs((prev) => {
        if (prev.some((j) => j.id === accepted.job_id)) return prev;
        return [
          ...prev,
          {
            id: accepted.job_id,
            kind: accepted.kind,
            label: options?.label ?? humanKind(accepted.kind),
            status: accepted.status ?? 'pending',
            progress: 0,
            startedAt,
            finishedAt: null,
            error: null,
            requestId: null,
            result: null,
            href: options?.href ?? null,
          },
        ];
      });
      const timer = setTimeout(() => void poll(accepted.job_id, startedAt), 600);
      timers.current.set(accepted.job_id, timer);
    },
    [poll],
  );

  const dismiss = React.useCallback(
    (id: string) => {
      stopPolling(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    },
    [stopPolling],
  );

  const cancel = React.useCallback(
    async (id: string) => {
      try {
        await api.post(`/jobs/${encodeURIComponent(id)}/cancel`);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === id ? { ...j, status: 'cancelled', finishedAt: Date.now() } : j,
          ),
        );
        stopPolling(id);
      } catch (err) {
        toastRef.current({
          title: 'Could not cancel the job',
          description: err instanceof ApiError ? err.message : String(err),
          variant: 'error',
        });
      }
    },
    [stopPolling],
  );

  const clearFinished = React.useCallback(() => {
    setJobs((prev) => prev.filter((j) => !isTerminal(j.status)));
  }, []);

  // Capture the map itself: `timers.current` may be reassigned before cleanup runs.
  React.useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) clearTimeout(timer);
      map.clear();
    };
  }, []);

  const value = React.useMemo<JobStoreValue>(
    () => ({
      jobs,
      active: jobs.filter((j) => !isTerminal(j.status)),
      track,
      dismiss,
      cancel,
      clearFinished,
    }),
    [jobs, track, dismiss, cancel, clearFinished],
  );

  return <JobStoreContext.Provider value={value}>{children}</JobStoreContext.Provider>;
}

export { humanKind };
