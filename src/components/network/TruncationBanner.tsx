import { AlertTriangle } from 'lucide-react';
import type { GraphStats } from '@/api/types';
import { Button } from '@/components/ui/button';
import { formatCount } from '@/lib/format';

/**
 * `stats.truncated: true` is loud, persistent, and never a tooltip.
 *
 * A silently truncated graph makes a coordinated cluster look isolated — an operator
 * whose 400 accounts got cut to 40 reads as a fringe actor. That is precisely the
 * wrong error for this product to make, so the banner names the applied threshold,
 * the true total, and how the cut was chosen, and offers both ways out.
 */
export function TruncationBanner({
  stats,
  onRaiseLimit,
  onNarrowFilters,
}: {
  stats: GraphStats;
  onRaiseLimit: () => void;
  onNarrowFilters: () => void;
}) {
  if (!stats.truncated) return null;

  const t = (stats.truncation ?? {}) as Record<string, unknown>;
  const appliedLimit = typeof t.applied_limit === 'number' ? t.applied_limit : null;
  const totalNodes = typeof t.total_nodes === 'number' ? t.total_nodes : null;
  const strategy = typeof t.strategy === 'string' ? t.strategy : null;

  return (
    <div
      role="alert"
      className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-risk-high/50 bg-risk-high-bg px-3 py-2.5"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-risk-high" aria-hidden="true" />

      <div className="min-w-[18rem] flex-1 space-y-1">
        <p className="text-xs font-semibold text-risk-high">
          This graph is truncated — you are not seeing the whole network
        </p>
        <p className="text-2xs leading-relaxed text-foreground/90">
          {appliedLimit !== null && totalNodes !== null ? (
            <>
              Showing <span className="tabular font-medium">{formatCount(stats.node_count)}</span> of{' '}
              <span className="tabular font-medium">{formatCount(totalNodes)}</span> nodes, cut at a
              limit of <span className="tabular font-medium">{formatCount(appliedLimit)}</span>
              {strategy ? ` (${strategy})` : ''}. Components that fall outside the cut will look
              smaller or more isolated than they are.
            </>
          ) : (
            <>
              The backend applied a node limit to this response
              {strategy ? ` (${strategy})` : ''}. Components that fall outside the cut will look
              smaller or more isolated than they are.
            </>
          )}
        </p>
        {Object.keys(t).length > 0 && (
          <details className="text-2xs text-muted-foreground">
            <summary className="cursor-pointer">Truncation detail from the API</summary>
            <pre className="mt-1 overflow-x-auto rounded bg-background/40 p-1.5 font-mono text-[10px]">
              {JSON.stringify(stats.truncation, null, 2)}
            </pre>
          </details>
        )}
      </div>

      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="outline" onClick={onRaiseLimit}>
          Raise limit
        </Button>
        <Button size="sm" variant="outline" onClick={onNarrowFilters}>
          Narrow filters
        </Button>
      </div>
    </div>
  );
}
