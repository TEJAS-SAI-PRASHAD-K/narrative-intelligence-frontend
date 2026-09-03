import { Download } from 'lucide-react';
import { useDownloadReport, useReports } from '@/api/queries/ops';
import type { ReportOut } from '@/api/types';
import { PageShell } from '@/components/page';
import { EmptyState, ErrorState } from '@/components/states';
import { EntityTable } from '@/components/table/EntityTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/api/client';
import { useProjectContext } from '@/layout/useProjectContext';
import { formatBytes, formatDateTime, humanizeEnum } from '@/lib/format';
import { useFilters } from '@/lib/useFilters';
import { ExportDialog } from '@/pages/narratives/components/ExportDialog';

const STATUS_VARIANT: Record<ReportOut['status'], 'risk-low' | 'risk-med' | 'risk-high' | 'muted'> =
  {
    succeeded: 'risk-low',
    running: 'muted',
    pending: 'muted',
    failed: 'risk-high',
    cancelled: 'risk-med',
  };

/**
 * 4.9 Reports. Rendering is a job; the download link only appears once the job
 * actually succeeded, so a half-rendered PDF is never handed to an analyst.
 *
 * The download endpoint returns the file, not JSON, and needs the API key header, so
 * it cannot be a plain anchor -- `useDownloadReport` fetches the blob and hands it to
 * the browser.
 */
export default function ReportsPage() {
  const { projectId, slug } = useProjectContext();
  const { filters } = useFilters(projectId);
  const reports = useReports(projectId);
  const download = useDownloadReport();
  const { toast } = useToast();

  async function get(report: ReportOut) {
    try {
      await download.mutateAsync(report);
    } catch (err) {
      toast({
        title: 'Download failed',
        description:
          err instanceof ApiError
            ? `${err.message} (${err.code} · ${err.requestId ?? 'no request id'})`
            : String(err),
        variant: 'error',
      });
    }
  }

  return (
    <PageShell
      title="Reports"
      description="Snapshots of this project you can send to someone who does not use the dashboard. Whatever filters were in force when you exported are baked into the file."
      meta={
        reports.data && (
          <span className="text-2xs text-muted-foreground">
            {reports.data.items.length} rendered
          </span>
        )
      }
      actions={<ExportDialog projectId={projectId} slug={slug} filters={filters} />}
      bodyClassName="gap-4"
    >
      {Boolean(reports.error) && (
        <ErrorState error={reports.error} onRetry={() => void reports.refetch()} />
      )}

      {!reports.isLoading && (reports.data?.items.length ?? 0) === 0 && !reports.error && (
        <EmptyState
          title="No reports yet"
          description="Use Export above — or the same button on the narrative feed or a narrative page — to render one."
        />
      )}

      {(reports.data?.items.length ?? 0) > 0 && (
        <EntityTable
          tableId="reports"
          caption="Rendered reports for this project"
          columns={[
            {
              id: 'template',
              header: 'Template',
              cell: (r: ReportOut) => humanizeEnum(r.template),
            },
            {
              id: 'format',
              header: 'Format',
              cell: (r) => <Badge variant="muted">{r.format.toUpperCase()}</Badge>,
            },
            {
              id: 'status',
              header: 'Status',
              cell: (r) => (
                <Badge variant={STATUS_VARIANT[r.status]}>{humanizeEnum(r.status)}</Badge>
              ),
            },
            {
              id: 'created',
              header: 'Created',
              cell: (r) => (
                <span className="tabular">{formatDateTime(r.created_at, filters.tz)}</span>
              ),
            },
            {
              id: 'finished',
              header: 'Finished',
              cell: (r) => (
                <span className="tabular">
                  {r.finished_at ? formatDateTime(r.finished_at, filters.tz) : '—'}
                </span>
              ),
            },
            {
              id: 'size',
              header: 'Size',
              align: 'right',
              cell: (r) => <span className="tabular">{formatBytes(r.size_bytes)}</span>,
            },
            {
              id: 'error',
              header: 'Error',
              defaultHidden: true,
              cell: (r) => (r.error ? <span className="text-destructive">{r.error}</span> : '—'),
            },
          ]}
          rows={reports.data?.items ?? []}
          rowKey={(r) => r.id}
          isLoading={reports.isLoading}
          rowActions={(r) => (
            <Button
              size="sm"
              variant="outline"
              disabled={r.status !== 'succeeded' || download.isPending}
              onClick={() => void get(r)}
              aria-label={`Download ${r.template} report`}
            >
              <Download className="h-3 w-3" aria-hidden="true" />
              Download
            </Button>
          )}
          maxHeight="calc(100vh - 16rem)"
        />
      )}
    </PageShell>
  );
}
