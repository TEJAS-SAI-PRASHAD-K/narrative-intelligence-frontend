import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { HierarchyNode } from '@/api/types';
import { NotMeasured } from '@/components/risk/NotMeasured';
import { formatCount, formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * `HierarchyNode[]` rendered as nested proportional bars — domain → channel, and so
 * on. Widths are relative to the largest sibling at each level, so a deep child is
 * never made to look larger than its parent.
 *
 * No aggregation happens here: `value` and `pct` are served. Summing children in the
 * browser would produce a second, quietly different total.
 */
export function HierarchyBars({
  nodes,
  depth = 0,
  onSelect,
}: {
  nodes: HierarchyNode[];
  depth?: number;
  onSelect?: (node: HierarchyNode) => void;
}) {
  const max = Math.max(...nodes.map((n) => n.value), 1);

  return (
    <ul className={cn('space-y-1', depth > 0 && 'ml-4 mt-1 border-l border-border pl-2')}>
      {nodes.map((node) => (
        <HierarchyRow key={node.key} node={node} max={max} depth={depth} onSelect={onSelect} />
      ))}
    </ul>
  );
}

function HierarchyRow({
  node,
  max,
  depth,
  onSelect,
}: {
  node: HierarchyNode;
  max: number;
  depth: number;
  onSelect?: (node: HierarchyNode) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const children = node.children ?? [];
  const width = (node.value / max) * 100;

  return (
    <li>
      <div className="flex items-center gap-1.5">
        {children.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={`${open ? 'Collapse' : 'Expand'} ${node.label}`}
            className="shrink-0 rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {open ? (
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            )}
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(node)}
                className="min-w-0 truncate rounded-sm text-left text-xs hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {node.label}
              </button>
            ) : (
              <span className="min-w-0 truncate text-xs">{node.label}</span>
            )}
            <span className="ml-auto shrink-0 tabular text-2xs">{formatCount(node.value)}</span>
            <span className="w-12 shrink-0 text-right tabular text-2xs text-muted-foreground">
              {node.pct === null || node.pct === undefined ? (
                <NotMeasured />
              ) : (
                formatPct(node.pct)
              )}
            </span>
          </div>
          <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${width}%` }} />
          </div>
        </div>
      </div>

      {open && children.length > 0 && (
        <HierarchyBars nodes={children} depth={depth + 1} onSelect={onSelect} />
      )}
    </li>
  );
}
