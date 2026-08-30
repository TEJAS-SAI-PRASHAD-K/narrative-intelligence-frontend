import { ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
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
  onDrilldown,
  drilldownLabel,
  className,
}: {
  metric: Metric;
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
      <div className="flex items-center gap-1">
        <span className="truncate text-2xs uppercase tracking-wide text-muted-foreground">
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

      <div className="mt-1.5 text-2xl font-semibold leading-none tabular">
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

      <div className="mt-1.5 flex h-4 items-center gap-1.5">
        {delta !== null ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'inline-flex cursor-help items-center gap-0.5 text-2xs',
                  (metric.delta_pct ?? 0) > 0 ? 'text-risk-med' : 'text-risk-low',
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
        'rounded-lg border border-border bg-card p-3',
        interactive && 'transition-colors hover:border-primary/60',
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
