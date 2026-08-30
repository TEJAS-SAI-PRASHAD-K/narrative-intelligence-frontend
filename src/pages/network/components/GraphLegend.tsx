import { Eye, EyeOff } from 'lucide-react';
import type { GraphLegendEntry } from '@/api/types';
import { Button } from '@/components/ui/button';
import { InfoTip } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { formatCount } from '@/lib/format';
import { cn } from '@/lib/utils';
import { legendColour } from './graphModel';

/**
 * Driven by `legend[]` from the response, not by a hardcoded list. Each entry carries
 * its own `definition`, so "Co-posting similarity" can say out loud that it is not
 * proof of coordination -- which is the single most important caveat on this screen.
 */
export function GraphLegend({
  legend,
  counts,
  hidden,
  onToggle,
  opacity,
  onOpacityChange,
}: {
  legend: GraphLegendEntry[];
  counts: Record<string, number>;
  hidden: Set<string>;
  onToggle: (key: string) => void;
  opacity: number;
  onOpacityChange: (value: number) => void;
}) {
  if (legend.length === 0) return null;

  return (
    <section
      aria-label="Legend"
      className="w-64 rounded-lg border border-border bg-surface-raised/95 p-2.5 shadow-xl backdrop-blur"
    >
      <h3 className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        Legend
      </h3>

      <ul className="space-y-1">
        {legend.map((entry) => {
          const isHidden = hidden.has(entry.key);
          return (
            <li key={entry.key} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: legendColour(entry.colour_role) }}
              />
              <span className={cn('min-w-0 flex-1 truncate text-2xs', isHidden && 'opacity-50')}>
                {entry.label}
              </span>
              <span className="shrink-0 tabular text-2xs text-muted-foreground">
                {formatCount(counts[entry.key] ?? 0)}
              </span>
              <InfoTip label={`What is ${entry.label}?`}>
                {/* Verbatim from the contract. */}
                <p>{entry.definition}</p>
              </InfoTip>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${isHidden ? 'Show' : 'Hide'} ${entry.label}`}
                aria-pressed={!isHidden}
                onClick={() => onToggle(entry.key)}
              >
                {isHidden ? (
                  <EyeOff className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <Eye className="h-3 w-3" aria-hidden="true" />
                )}
              </Button>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 space-y-1 border-t border-border pt-2">
        <label htmlFor="edge-opacity" className="text-2xs text-muted-foreground">
          Edge opacity
        </label>
        <div className="flex items-center gap-2">
          <Slider
            id="edge-opacity"
            aria-label="Edge opacity"
            min={0}
            max={1}
            step={0.05}
            value={[opacity]}
            onValueChange={([v]) => onOpacityChange(v ?? 1)}
            className="flex-1"
          />
          <span className="w-8 shrink-0 tabular text-2xs">{opacity.toFixed(2)}</span>
        </div>
      </div>
    </section>
  );
}
