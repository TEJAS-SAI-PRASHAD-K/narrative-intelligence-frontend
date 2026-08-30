import { AlertTriangle, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { ApiError } from '@/api/client';
import { useMediaCheck, useMediaChecks, useSubmitMediaCheck } from '@/api/queries/ops';
import type { MediaCheckOut } from '@/api/types';
import { NotMeasured } from '@/components/risk/NotMeasured';
import { RiskDot } from '@/components/risk/RiskDot';
import type { RiskLevel } from '@/components/risk/riskLevel';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useJobs } from '@/jobs/JobStore';
import { formatBytes, formatCount, formatDateTime, formatScore, humanizeEnum } from '@/lib/format';
import { cn } from '@/lib/utils';

const VERDICT_LEVEL: Record<string, RiskLevel> = {
  likely_manipulated: 'high',
  possibly_manipulated: 'medium',
  likely_authentic: 'low',
  inconclusive: 'none',
};

/**
 * 4.8 Media check. Upload, 202, poll, verdict.
 *
 * The verdict card leads with `explanation` and renders `limitations[]` as a visible
 * list, not a tooltip. A bare confidence number invites an analyst to treat a model
 * output as a finding, which for deepfake detection specifically is how people end up
 * publishing a false accusation.
 */
export default function MediaPage() {
  const [dragging, setDragging] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = useSubmitMediaCheck();
  const history = useMediaChecks({ limit: 50 });
  // Poll the active check directly: the tray tracks the job, this tracks the verdict.
  const active = useMediaCheck(activeJobId ?? undefined, activeJobId !== null);
  const { track } = useJobs();
  const { toast } = useToast();

  async function upload(file: File) {
    try {
      const accepted = await submit.mutateAsync(file);
      setActiveJobId(accepted.job_id);
      track(accepted, { label: `Deepfake check: ${file.name}`, href: '/p' });
      toast({
        title: 'Media check queued',
        description: 'The verdict appears here when the job finishes.',
      });
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof ApiError ? `${err.message} (${err.code})` : String(err),
        variant: 'error',
      });
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-sm font-semibold">Media check</h1>
        <p className="mt-0.5 text-2xs text-muted-foreground">
          Runs the Xception deepfake detector over an uploaded image or video.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void upload(file);
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-border',
        )}
      >
        <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs">Drop an image or video here</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={submit.isPending}>
          {submit.isPending ? 'Uploading…' : 'Choose a file'}
        </Button>
      </div>

      {activeJobId && (
        <section className="space-y-2">
          <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Current check
          </h2>
          {active.isLoading && <SkeletonCard />}
          {Boolean(active.error) && <ErrorState error={active.error} compact />}
          {active.data && <VerdictCard check={active.data} />}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          History
        </h2>
        {/* The endpoint is not project-scoped (contract-gaps #6); say so. */}
        <p className="text-2xs text-muted-foreground">
          Media checks are account-wide, not scoped to this project.
        </p>
        {history.isLoading && <SkeletonCard />}
        {Boolean(history.error) && (
          <ErrorState error={history.error} onRetry={() => void history.refetch()} />
        )}
        {!history.isLoading && (history.data?.items.length ?? 0) === 0 && (
          <EmptyState title="No media has been checked yet" />
        )}
        <ul className="space-y-2">
          {(history.data?.items ?? []).map((check) => (
            <li key={check.job_id}>
              <VerdictCard check={check} compact />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function VerdictCard({ check, compact }: { check: MediaCheckOut; compact?: boolean }) {
  const level = check.verdict ? (VERDICT_LEVEL[check.verdict] ?? 'none') : 'none';
  const retention = check.retention as Record<string, unknown> | undefined;
  const retentionHours =
    retention && typeof retention.retain_hours === 'number' ? retention.retain_hours : null;

  return (
    <article className="space-y-2.5 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        {check.verdict ? (
          <RiskDot level={level} label={humanizeEnum(check.verdict)} />
        ) : (
          <Badge variant="muted">{humanizeEnum(check.status)}</Badge>
        )}
        {check.filename && <span className="truncate font-mono text-2xs">{check.filename}</span>}
        {check.media_type && <Badge variant="muted">{check.media_type}</Badge>}
        <div className="flex-1" />
        <span className="tabular text-2xs text-muted-foreground">
          {formatDateTime(check.submitted_at, 'UTC')} UTC
        </span>
      </div>

      {check.error && (
        <p className="rounded-md bg-destructive/10 px-2 py-1.5 text-2xs text-destructive">
          {check.error}
        </p>
      )}

      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-2xs">
        <Stat
          label="Confidence"
          value={
            check.confidence === null || check.confidence === undefined ? (
              <NotMeasured reason="The detector returned no confidence for this file." />
            ) : (
              formatScore(check.confidence, 1)
            )
          }
        />
        <Stat
          label="Manipulation type"
          value={check.manipulation_type ? humanizeEnum(check.manipulation_type) : <NotMeasured />}
        />
        <Stat
          label="Frames analyzed"
          value={
            check.frames_analyzed === null || check.frames_analyzed === undefined ? (
              <NotMeasured />
            ) : (
              formatCount(check.frames_analyzed)
            )
          }
        />
        <Stat
          label="Face detected"
          value={
            check.face_detected === null || check.face_detected === undefined ? (
              <NotMeasured reason="Face detection did not run on this file." />
            ) : check.face_detected ? (
              'Yes'
            ) : (
              'No'
            )
          }
        />
        <Stat label="Size" value={formatBytes(check.size_bytes)} />
        {check.model && <Stat label="Model" value={`${check.model} ${check.model_version ?? ''}`} />}
      </dl>

      {/* The explanation is the point, not the number. */}
      {check.explanation && (
        <div className="rounded-md border border-border bg-surface-sunken p-2.5">
          <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            What the detector found
          </p>
          <p className="mt-1 text-xs leading-relaxed">{check.explanation}</p>
        </div>
      )}

      {!compact && (check.limitations?.length ?? 0) > 0 && (
        <div className="flex gap-2 rounded-md border border-risk-med/40 bg-risk-med-bg p-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-risk-med" aria-hidden="true" />
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wide text-risk-med">
              Limitations
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-2xs leading-relaxed">
              {check.limitations?.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {retentionHours !== null && (
        <p className="text-2xs text-muted-foreground">
          This file is deleted in {retentionHours} hour{retentionHours === 1 ? '' : 's'}.
        </p>
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}
