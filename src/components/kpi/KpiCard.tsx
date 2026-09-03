import { ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Metric } from '@/api/types';
import { NotMeasured } from '@/components/risk/NotMeasured';
import { InfoTip, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDelta, formatMetricValue, isMeasured } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * One KPI. Every number is explainable in one click.
 *
 * The `(?)` tooltip renders `metric.definition` verbatim -- the backend knows what
 * the query actually summed and the frontend does not, so no definition text is
 * written here. A KPI without its definition wired up is an incomplete component.
 *
 * `nullable_fields` is listed in the same tooltip: it names the inputs that can be
 * absent, which is what turns "why is this smaller than I expected" into an
 * answerable question.
 */
export function KpiCard({
  metric,
  icon: Icon,
  onDrilldown,
  drilldownLabel,
  className,
}: {
  metric: Metric;
  /** Anchors the card at a glance. Purely decorative -- the label carries the meaning. */
  icon?: LucideIcon;
  /** Set only in narrative-scoped mode, where each card expands into its breakdown. */
  onDrilldown?: (() => void) | undefined;
  drilldownLabel?: string;
  className?: string;
}) {
  const delta = formatDelta(metric.delta_pct);
  const measured = isMeasured(metric.value);
  const interactive = Boolean(onDrilldown);

  const body = (
    <>
      <div className="flex items-center gap-1.5">
        {Icon && (
          <span
            aria-hidden="true"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-inset ring-primary/20"
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="truncate text-2xs font-medium uppercase tracking-wide text-muted-foreground">
          {metric.label}
        </span>
        <InfoTip label={`What does ${metric.label} count?`}>
          <div className="space-y-1.5">
            {/* Verbatim from the contract. Do not paraphrase. */}
            <p>{metric.definition}</p>
            {metric.nullable_fields && metric.nullable_fields.length > 0 && (
              <p className="text-muted-foreground">
                May be unmeasured on some platforms:{' '}
                <span className="font-mono">{metric.nullable_fields.join(', ')}</span>
              </p>
            )}
            {isMeasured(metric.sample_size) && (
              <p className="text-muted-foreground">
                Sample size <span className="tabular">{metric.sample_size}</span>
              </p>
            )}
          </div>
        </InfoTip>
      </div>

      <div className="mt-3 text-3xl font-semibold leading-none tracking-tight tabular">
        {measured ? (
          formatMetricValue(metric.value, metric.unit)
        ) : (
          <NotMeasured
            reason={
              metric.nullable_fields && metric.nullable_fields.length > 0
                ? `Not measured. Depends on ${metric.nullable_fields.join(', ')}, which this platform does not report.`
                : undefined
            }
          />
        )}
      </div>

      <div className="mt-2.5 flex h-5 items-center gap-1.5">
        {delta !== null ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'inline-flex cursor-help items-center gap-0.5 rounded-md px-1.5 py-0.5 text-2xs font-medium',
                  (metric.delta_pct ?? 0) > 0
                    ? 'bg-risk-med-bg text-risk-med'
                    : 'bg-risk-low-bg text-risk-low',
                )}
              >
                {(metric.delta_pct ?? 0) > 0 ? (
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-3 w-3" aria-hidden="true" />
                )}
                {delta}
              </span>
            </TooltipTrigger>
            <TooltipContent>Change against the preceding window of equal length.</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-2xs text-muted-foreground">no comparison window</span>
        )}
      </div>
    </>
  );

  return (
    <div
      className={cn(
        'card-surface p-4',
        interactive && 'card-interactive cursor-pointer hover:border-primary/50',
        className,
      )}
      // Convenience for mouse users. The real affordance is the button below, which
      // is what keyboard and screen-reader users get -- the card itself is never a
      // <button>, because it contains the definition tooltip's own button and
      // nesting interactive elements is both invalid and untabbable.
      {...(interactive ? { onClick: onDrilldown } : {})}
    >
      {body}
      {interactive && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDrilldown?.();
          }}
          className="mt-1.5 inline-flex items-center gap-0.5 rounded-sm text-2xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {drilldownLabel ?? `Break down ${metric.label}`}
          <ChevronRight className="h-2.5 w-2.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
