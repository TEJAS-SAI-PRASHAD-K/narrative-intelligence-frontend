import { ChevronDown, ChevronUp } from 'lucide-react';
import type { KpiBundle } from '@/api/types';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import { STORAGE_KEYS } from '@/lib/storage';
import { useLocalState } from '@/lib/useLocalState';
import { cn } from '@/lib/utils';
import { KpiCard } from './KpiCard';

/** Fixed order, everywhere. An analyst should never have to re-find "Authors". */
export type KpiSliceName = 'posts' | 'engagements' | 'authors' | 'sentiment' | 'emotions';

const ORDER: KpiSliceName[] = ['posts', 'engagements', 'authors', 'sentiment', 'emotions'];

export function KpiStrip({
  bundle,
  onDrilldown,
  className,
}: {
  bundle: KpiBundle;
  /** Present only in narrative-scoped mode; otherwise the cards are static. */
  onDrilldown?: ((slice: KpiSliceName) => void) | undefined;
  className?: string;
}) {
  const [collapsed, setCollapsed] = useLocalState(STORAGE_KEYS.kpiStripCollapsed, false);
  const tz = bundle.tz ?? 'UTC';

  return (
    <section aria-label="Key metrics" className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={collapsed ? 'Expand key metrics' : 'Collapse key metrics'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </Button>
        <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Key metrics
        </h2>
        {/* The window is always stated with its timezone: a KPI without a window is
            a number without a question. */}
        <span className="text-2xs text-muted-foreground">
          {formatDateTime(bundle.window_start, tz)} – {formatDateTime(bundle.window_end, tz)}{' '}
          <span className="font-mono">{tz}</span>
        </span>
        {bundle.comparison_window && (
          <span className="text-2xs text-muted-foreground">
            vs <span className="font-mono">{bundle.comparison_window}</span>
          </span>
        )}
      </div>

      {!collapsed && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {ORDER.map((slice) => (
            <KpiCard
              key={slice}
              metric={bundle[slice]}
              onDrilldown={onDrilldown ? () => onDrilldown(slice) : undefined}
              drilldownLabel={`Break down ${bundle[slice].label}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
