import { Download } from 'lucide-react';
import { useState } from 'react';
import { useCreateReport } from '@/api/queries/ops';
import type { ReportFormat, ReportTemplate } from '@/api/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useJobs } from '@/jobs/JobStore';
import { activeChips, type FilterSpec } from '@/lib/filters';
import { ApiError } from '@/api/client';

const TEMPLATES: { value: ReportTemplate; label: string }[] = [
  { value: 'exec_summary', label: 'Executive summary' },
  { value: 'full_detail', label: 'Full detail' },
  { value: 'raw_data', label: 'Raw data' },
];

const FORMATS: { value: ReportFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'pptx', label: 'PowerPoint' },
  { value: 'csv', label: 'CSV' },
];

/**
 * Export prefills the current FilterSpec and shows the analyst exactly which filters
 * will be baked into the report. A report whose scope the reader cannot see is a
 * report the reader cannot check.
 *
 * `POST /reports` returns 202: the dialog closes onto a job in the tray, and the
 * download link appears only once the render actually finishes.
 */
export function ExportDialog({
  projectId,
  slug,
  filters,
  narrativeIds,
}: {
  projectId: string;
  slug: string | undefined;
  filters: FilterSpec;
  narrativeIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState<ReportTemplate>('exec_summary');
  const [format, setFormat] = useState<ReportFormat>('pdf');

  const createReport = useCreateReport();
  const { track } = useJobs();
  const { toast } = useToast();

  const chips = activeChips(filters);

  async function submit() {
    try {
      const accepted = await createReport.mutateAsync({
        project_id: projectId,
        template,
        format,
        narrative_ids: narrativeIds ?? [],
        // The exact filter set the analyst is looking at, so the report and the
        // screen cannot disagree about scope.
        params: { filters: Object.fromEntries(new URLSearchParams(window.location.search)) },
      });
      track(accepted, { label: `Render ${template} (${format})`, href: `/p/${slug}/reports` });
      setOpen(false);
    } catch (err) {
      toast({
        title: 'Could not queue the report',
        description: err instanceof ApiError ? `${err.message} (${err.code})` : String(err),
        variant: 'error',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-3 w-3" aria-hidden="true" />
          Export
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export this view</DialogTitle>
          <DialogDescription>
            Rendering runs in the background. The job appears in the tray and the download
            becomes available when it finishes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="report-template">Template</Label>
              <Select value={template} onValueChange={(v) => setTemplate(v as ReportTemplate)}>
                <SelectTrigger id="report-template" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="report-format">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ReportFormat)}>
                <SelectTrigger id="report-format" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Exactly which filters get baked in -- stated, not implied. */}
          <div className="rounded-md border border-border bg-surface-sunken p-2.5">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Filters baked into this report
            </p>
            {chips.length === 0 ? (
              <p className="mt-1 text-xs">
                No filters — the whole project, over its full date range.
              </p>
            ) : (
              <ul className="mt-1.5 space-y-0.5">
                {chips.map((c) => (
                  <li key={`${c.key}:${c.value ?? ''}`} className="text-xs">
                    {c.label}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1.5 text-2xs text-muted-foreground">
              Timezone <span className="font-mono">{filters.tz}</span>
              {narrativeIds && narrativeIds.length > 0
                ? ` · ${narrativeIds.length} narrative(s) selected`
                : ''}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void submit()} disabled={createReport.isPending}>
            {createReport.isPending ? 'Queueing…' : 'Queue report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
