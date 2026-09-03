import { CheckCircle2, CircleSlash, Loader2, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { JobStatus } from '@/api/types';
import { EmptyState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import { isTerminal, useJobs, type TrackedJob } from './JobStore';

/**
 * Background work, in a panel opened from the sidebar's Jobs item.
 *
 * This was a tray fixed to the bottom-right corner. It was the only place a 202 became
 * visible, which was right, but it sat on top of whatever was underneath it -- the
 * network legend, a table's footer, the last row of a list -- and an analyst could not
 * move it. In a panel it covers nothing, and the sidebar badge carries the signal the
 * floating tray existed to provide.
 */
export function JobsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { jobs, active, dismiss, cancel, clearFinished } = useJobs();

  // Re-render once a second so the elapsed clocks tick while jobs are running.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!open || active.length === 0) return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [open, active.length]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby="jobs-sheet-desc">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Jobs
            {active.length > 0 && <Badge variant="default">{active.length} running</Badge>}
          </SheetTitle>
          <SheetDescription id="jobs-sheet-desc">
            Work you have started in this session. Reclustering, ingestion, exports and layouts all
            run in the background — the screen updates on its own when one finishes.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-2">
          {jobs.length === 0 ? (
            <EmptyState
              title="Nothing running"
              description="Actions that take a while — reclustering, an ingest run, rendering a report — appear here while they work."
            />
          ) : (
            <ul className="divide-y divide-border">
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} onDismiss={dismiss} onCancel={cancel} />
              ))}
            </ul>
          )}
        </SheetBody>

        <SheetFooter className="justify-between">
          <Link
            to="/jobs"
            onClick={() => onOpenChange(false)}
            className="rounded-sm text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            See the full job history
          </Link>
          {jobs.some((j) => isTerminal(j.status)) && (
            <Button variant="ghost" size="sm" onClick={clearFinished}>
              Clear finished
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
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
    <li className="py-2.5 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            STATUS_CLASS[job.status],
            running && 'animate-spin',
          )}
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
        <Progress value={job.progress} className="mt-1.5" aria-label={`${job.label} progress`} />
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
