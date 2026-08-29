import { CheckCircle2, ChevronDown, ChevronUp, CircleSlash, Loader2, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { JobStatus } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import { isTerminal, useJobs, type TrackedJob } from './JobStore';

/**
 * Docked bottom-right, global, one row per tracked job. This is the only place work
 * enqueued by a 202 becomes visible; without it a button that fires a 202 is
 * indistinguishable from a button that does nothing.
 */
export function JobTray() {
  const { jobs, active, dismiss, cancel, clearFinished } = useJobs();
  const [collapsed, setCollapsed] = useState(false);

  // Re-render once a second so the elapsed clocks tick while jobs are running.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (active.length === 0) return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active.length]);

  if (jobs.length === 0) return null;

  return (
    <aside
      aria-label="Background jobs"
      className="fixed bottom-3 right-3 z-40 w-80 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-border px-2.5 py-1.5">
        <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Jobs
        </span>
        {active.length > 0 && (
          <Badge variant="default" aria-label={`${active.length} running`}>
            {active.length} running
          </Badge>
        )}
        <div className="flex-1" />
        <Link
          to="/jobs"
          className="rounded-sm px-1 text-2xs text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          See all
        </Link>
        {jobs.some((j) => isTerminal(j.status)) && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Clear finished jobs"
            onClick={clearFinished}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={collapsed ? 'Expand job tray' : 'Collapse job tray'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? (
            <ChevronUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          )}
        </Button>
      </div>

      {!collapsed && (
        <ul className="max-h-72 overflow-y-auto">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} onDismiss={dismiss} onCancel={cancel} />
          ))}
        </ul>
      )}
    </aside>
  );
}

const STATUS_ICON: Record<JobStatus, typeof Loader2> = {
  pending: Loader2,
  running: Loader2,
  succeeded: CheckCircle2,
  failed: XCircle,
  cancelled: CircleSlash,
};

const STATUS_CLASS: Record<JobStatus, string> = {
  pending: 'text-state-pending',
  running: 'text-state-running',
  succeeded: 'text-state-succeeded',
  failed: 'text-state-failed',
  cancelled: 'text-state-cancelled',
};

function JobRow({
  job,
  onDismiss,
  onCancel,
}: {
  job: TrackedJob;
  onDismiss: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const Icon = STATUS_ICON[job.status];
  const running = !isTerminal(job.status);
  const elapsed = ((job.finishedAt ?? Date.now()) - job.startedAt) / 1000;

  return (
    <li className="border-b border-border px-2.5 py-2 last:border-b-0">
      <div className="flex items-center gap-2">
        <Icon
          className={cn('h-3.5 w-3.5 shrink-0', STATUS_CLASS[job.status], running && 'animate-spin')}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate text-xs">{job.label}</span>
        {/* Status is text, never colour alone. */}
        <span className={cn('text-2xs capitalize', STATUS_CLASS[job.status])}>{job.status}</span>
        {running ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Cancel ${job.label}`}
            onClick={() => onCancel(job.id)}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Dismiss ${job.label}`}
            onClick={() => onDismiss(job.id)}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </Button>
        )}
      </div>

      {running && (
        <Progress
          value={job.progress}
          className="mt-1.5"
          aria-label={`${job.label} progress`}
        />
      )}

      <div className="mt-1 flex items-center gap-2 font-mono text-2xs text-muted-foreground">
        <span>{formatDuration(elapsed)}</span>
        {running && job.progress > 0 && <span>{job.progress}%</span>}
        <span className="truncate" title={job.id}>
          {job.id.slice(0, 8)}
        </span>
      </div>

      {job.error && (
        <p className="mt-1 break-words rounded-sm bg-destructive/10 px-1.5 py-1 text-2xs text-destructive">
          {job.error}
          {job.requestId && (
            <span className="ml-1 select-all font-mono opacity-80">({job.requestId})</span>
          )}
        </p>
      )}
    </li>
  );
}
