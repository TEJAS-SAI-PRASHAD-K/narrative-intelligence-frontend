import type Graph from 'graphology';
import { useEffect, useRef, useState } from 'react';
import Sigma from 'sigma';
import { resolveToken } from '@/lib/tokens';
import { cn } from '@/lib/utils';

export interface LassoSelection {
  nodeIds: string[];
}

/**
 * The WebGL surface. Sigma owns the canvas; React owns nothing inside it.
 *
 * The graph instance is mutated in place by the parent (hiding nodes for the
 * scrubber, recolouring on a legend toggle) and `refresh()` is called -- rebuilding
 * the Sigma instance on every state change would drop the camera and re-upload every
 * buffer, which is what turns a 20k-node graph from smooth into unusable.
 */
export function GraphCanvas({
  graph,
  onNodeClick,
  onSelection,
  lassoMode,
  className,
  refreshToken,
}: {
  graph: Graph | null;
  onNodeClick: (nodeId: string) => void;
  onSelection: (selection: LassoSelection) => void;
  lassoMode: boolean;
  className?: string;
  /** Bump to tell Sigma the graph's attributes changed underneath it. */
  refreshToken: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const [hovered, setHovered] = useState<{ label: string; x: number; y: number } | null>(null);

  // Lasso path in screen coordinates. Kept in a ref so dragging does not re-render
  // React on every mousemove.
  const lassoRef = useRef<{ x: number; y: number }[]>([]);
  const [lassoPath, setLassoPath] = useState<{ x: number; y: number }[]>([]);
  const draggingRef = useRef(false);

  // Callbacks in refs: the Sigma instance is created once and must not be torn down
  // because a parent re-rendered with a new closure.
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;
  const onSelectionRef = useRef(onSelection);
  onSelectionRef.current = onSelection;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !graph) return;

    const renderer = new Sigma(graph, container, {
      renderLabels: false,
      renderEdgeLabels: false,
      defaultEdgeColor: resolveToken('--border'),
      allowInvalidContainer: true,
      // Node and edge reducers apply the `hidden` flags the scrubber and filters set,
      // without mutating the underlying graph structure.
      nodeReducer: (_id, data) => (data.hidden ? { ...data, hidden: true } : data),
      edgeReducer: (_id, data) => (data.hidden ? { ...data, hidden: true } : data),
    });

    renderer.on('clickNode', ({ node }) => onNodeClickRef.current(node));

    renderer.on('enterNode', ({ node }) => {
      const display = renderer.getNodeDisplayData(node);
      if (!display) return;
      const attrs = graph.getNodeAttributes(node);
      setHovered({
        label: `@${String(attrs.label ?? node)}`,
        x: display.x,
        y: display.y,
      });
    });
    renderer.on('leaveNode', () => setHovered(null));

    sigmaRef.current = renderer;
    return () => {
      renderer.kill();
      sigmaRef.current = null;
    };
  }, [graph]);

  // Attribute changes (colour, hidden) need a refresh, not a rebuild.
  useEffect(() => {
    sigmaRef.current?.refresh();
  }, [refreshToken]);

  // --- lasso ---------------------------------------------------------------
  useEffect(() => {
    const renderer = sigmaRef.current;
    const container = containerRef.current;
    if (!renderer || !container || !graph) return;

    // Sigma's camera must stop panning while the lasso is drawing, or the selection
    // rectangle and the graph move at the same time.
    renderer.getCamera().disable();
    if (!lassoMode) {
      renderer.getCamera().enable();
      return;
    }

    function toLocal(e: MouseEvent): { x: number; y: number } {
      const rect = container!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function onDown(e: MouseEvent) {
      draggingRef.current = true;
      lassoRef.current = [toLocal(e)];
      setLassoPath(lassoRef.current);
    }

    function onMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      lassoRef.current = [...lassoRef.current, toLocal(e)];
      setLassoPath(lassoRef.current);
    }

    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;

      const path = lassoRef.current;
      lassoRef.current = [];
      setLassoPath([]);
      if (path.length < 3) return;

      const selected: string[] = [];
      graph!.forEachNode((id) => {
        const display = renderer!.getNodeDisplayData(id);
        if (!display) return;
        const viewport = renderer!.framedGraphToViewport(display);
        if (pointInPolygon(viewport, path)) selected.push(id);
      });
      onSelectionRef.current({ nodeIds: selected });
    }

    container.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      container.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      renderer.getCamera().enable();
    };
  }, [lassoMode, graph]);

  return (
    <div className={cn('relative h-full w-full', className)}>
      <div
        ref={containerRef}
        className={cn('h-full w-full', lassoMode && 'cursor-crosshair')}
        role="application"
        aria-label="Network graph. Use the toolbar controls to filter and inspect; the node list is available from the Inspect panel."
      />

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-2 py-1 text-2xs shadow-lg"
          style={{ left: hovered.x + 10, top: hovered.y + 10 }}
        >
          {hovered.label}
        </div>
      )}

      {lassoPath.length > 1 && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <polygon
            points={lassoPath.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="hsl(var(--primary) / 0.12)"
            stroke="hsl(var(--primary))"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        </svg>
      )}
    </div>
  );
}

/** Ray casting. Used per node on lasso release, so it stays allocation-free. */
function pointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i] as { x: number; y: number };
    const b = polygon[j] as { x: number; y: number };
    const intersects =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}
