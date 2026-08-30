import { useState } from 'react';
import { useJobHistory } from '@/api/queries/ops';
import type { JobOut } from '@/api/types';
import { EmptyState, ErrorState } from '@/components/states';
import { EntityTable } from '@/components/table/EntityTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateTime, formatDuration, humanizeEnum } from '@/lib/format';

const STATUSES = ['all', 'pending', 'running', 'succeeded', 'failed', 'cancelled'] as const;

const STATUS_VARIANT: Record<
  JobOut['status'],
  'risk-low' | 'risk-med' | 'risk-high' | 'muted'
> = {
  succeeded: 'risk-low',
  running: 'muted',
  pending: 'muted',
  failed: 'risk-high',
  cancelled: 'risk-med',
};

/** The tray's "see all". Same job records, with history and filtering. */
export default function JobsPage() {
  const [status, setStatus] = useState<string>('all');
  const [kind, setKind] = useState('');

  const jobs = useJobHistory({
    status: status === 'all' ? undefined : status,
    kind: kind.trim() || undefined,
    limit: 100,
  });

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="text-sm font-semibold">Job history</h1>
        <div className="flex-1" />
        <div className="space-y-1">
          <Label htmlFor="job-status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="job-status" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {humanizeEnum(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="job-kind">Kind</Label>
          <Input
            id="job-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            placeholder="nlp.cluster"
            className="w-40"
          />
        </div>
      </div>

      {Boolean(jobs.error) && <ErrorState error={jobs.error} onRetry={() => void jobs.refetch()} />}

      {!jobs.isLoading && (jobs.data?.items.length ?? 0) === 0 && !jobs.error && (
        <EmptyState
          title="No jobs match"
          description="Jobs appear here as soon as anything is enqueued from the dashboard."
        />
      )}

      {(jobs.data?.items.length ?? 0) > 0 && (
        <EntityTable
          tableId="jobs"
          caption="Background jobs"
          columns={[
            {
              id: 'kind',
              header: 'Kind',
              cell: (j: JobOut) => <span className="font-mono text-2xs">{j.kind}</span>,
            },
            {
              id: 'status',
              header: 'Status',
              cell: (j) => <Badge variant={STATUS_VARIANT[j.status]}>{humanizeEnum(j.status)}</Badge>,
            },
            {
              id: 'progress',
              header: 'Progress',
              cell: (j) =>
                j.status === 'running' ? (
                  <Progress
                    value={Math.round((j.progress ?? 0) * 100)}
                    className="w-20"
                    aria-label={`${j.kind} progress`}
                  />
                ) : (
                  <span className="tabular text-2xs text-muted-foreground">
                    {Math.round((j.progress ?? 0) * 100)}%
                  </span>
                ),
            },
            {
              id: 'created',
              header: 'Created',
              cell: (j) => <span className="tabular">{formatDateTime(j.created_at, 'UTC')}</span>,
            },
            {
              id: 'elapsed',
              header: 'Elapsed',
              align: 'right',
              cell: (j) => {
                if (!j.started_at) return <span className="text-muted-foreground">—</span>;
                const end = j.finished_at ? new Date(j.finished_at) : new Date();
                const seconds = (end.getTime() - new Date(j.started_at).getTime()) / 1000;
                return <span className="tabular">{formatDuration(seconds)}</span>;
              },
            },
            {
              id: 'error',
              header: 'Error',
              cell: (j) =>
                j.error ? (
                  <span className="text-destructive">{j.error}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            },
            {
              id: 'id',
              header: 'Job id',
              defaultHidden: true,
              cell: (j) => <span className="select-all font-mono text-2xs">{j.id}</span>,
            },
            {
              id: 'celery',
              header: 'Celery task',
              defaultHidden: true,
              cell: (j) => (
                <span className="select-all font-mono text-2xs">{j.celery_task_id ?? '—'}</span>
              ),
            },
          ]}
          rows={jobs.data?.items ?? []}
          rowKey={(j) => j.id}
          isLoading={jobs.isLoading}
          maxHeight="calc(100vh - 14rem)"
        />
      )}
    </div>
  );
}
