import forceAtlas2 from 'graphology-layout-forceatlas2';
import { ArrowLeft, Crosshair, Filter, Layers, MousePointer2, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { useProjects } from '@/api/queries/projects';
import { useGraph, usePrecomputeLayout } from '@/api/queries/network';
import type { GraphEdge, GraphResponse } from '@/api/types';
import { TruncationBanner } from '@/components/network/TruncationBanner';
import { EmptyState, ErrorState, SkeletonChart } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { useJobs } from '@/jobs/JobStore';
import { parseFilterSpec } from '@/lib/filters';
import { formatCount, formatDecimal } from '@/lib/format';
import { AuthorPanel } from '@/pages/authors/components/AuthorPanel';
import { GraphCanvas } from './components/GraphCanvas';
import { GraphLegend } from './components/GraphLegend';
import { InspectPanel } from './components/InspectPanel';
import {
  buildGraph,
  CLIENT_LAYOUT_MAX_NODES,
  edgeColour,
  nodeColour,
  type ColourBy,
} from './components/graphModel';
import { TimelineScrubber } from './components/TimelineScrubber';

const COLOUR_OPTIONS: { value: ColourBy; label: string }[] = [
  { value: 'community', label: 'Community' },
  { value: 'cohort', label: 'Cohort' },
  { value: 'bot_like', label: 'Bot-like' },
  { value: 'platform', label: 'Platform' },
];

/**
 * 4.6 Full-screen network graph. Its own shell, outside <AppLayout>.
 *
 * Positions come from `GraphNode.x/y`. When the response has none, the page enqueues
 * `POST /network/layout` and waits -- it only falls back to a client force layout
 * below `CLIENT_LAYOUT_MAX_NODES`, because a ForceAtlas2 pass over 20,000 nodes locks
 * the main thread long enough to be indistinguishable from a crash.
 */
export default function NetworkGraphPage() {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const [searchParams] = useSearchParams();
  const { data: projectsPage } = useProjects();
  const project = projectsPage?.items.find((p) => p.slug === projectSlug);
  const projectId = project?.id ?? '';

  const filters = useMemo(
    () => parseFilterSpec(searchParams, projectId),
    [searchParams, projectId],
  );

  const { toast } = useToast();
  const { track } = useJobs();
  const precomputeLayout = usePrecomputeLayout();

  // --- view state (ephemeral, not part of the shareable filter set) ---------
  const [colourBy, setColourBy] = useState<ColourBy>('community');
  const [lassoMode, setLassoMode] = useState(false);
  const [hideStandalone, setHideStandalone] = useState(
    searchParams.get('hide_standalone') === 'true',
  );
  const [maxNodes, setMaxNodes] = useState<number>(
    Number(searchParams.get('max_nodes')) || 5000,
  );
  const [bucketWidth, setBucketWidth] = useState(searchParams.get('bucket') ?? '12h');
  const [bucketIndex, setBucketIndex] = useState<number | null>(null);
  const [hiddenLegend, setHiddenLegend] = useState<Set<string>>(new Set());
  const [edgeOpacity, setEdgeOpacity] = useState(0.55);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const narrativeIds = searchParams.getAll('narrative_id');
  const comparisonId = searchParams.get('comparison_id') ?? undefined;

  const graphQuery = useGraph(
    filters,
    {
      narrative_id: narrativeIds.length > 0 ? narrativeIds : undefined,
      comparison_id: comparisonId,
      max_nodes: maxNodes,
      bucket: bucketWidth,
      hide_standalone: hideStandalone,
    },
    Boolean(projectId),
  );

  const response: GraphResponse | undefined = graphQuery.data;

  // --- graph construction ---------------------------------------------------
  const built = useMemo(() => {
    if (!response) return null;
    return buildGraph(response, { colourBy, hideStandalone });
  }, [response, colourBy, hideStandalone]);

  const layoutRequested = useRef(false);

  useEffect(() => {
    if (!built || !response) return;
    if (!built.needsLayout) return;

    if (response.nodes.length <= CLIENT_LAYOUT_MAX_NODES) {
      // Small enough to lay out here without blocking perceptibly. The response's own
      // x/y are used as the seed, so the result is deterministic across reloads.
      forceAtlas2.assign(built.graph, {
        iterations: 300,
        settings: {
          ...forceAtlas2.inferSettings(built.graph),
          gravity: 0.6,
          scalingRatio: 12,
          barnesHutOptimize: built.graph.order > 500,
        },
      });
      setRefreshToken((t) => t + 1);
      return;
    }

    // Too big for the browser: ForceAtlas2 over this many nodes locks the main thread
    // long enough to be indistinguishable from a crash. Ask the backend and wait --
    // no silent fallback.
    if (layoutRequested.current) return;
    layoutRequested.current = true;

    precomputeLayout
      .mutateAsync({
        project_id: filters.project_id,
        algorithm: 'forceatlas2',
        max_nodes: maxNodes,
        ...(narrativeIds[0] ? { narrative_id: narrativeIds[0] } : {}),
        ...(comparisonId ? { comparison_id: comparisonId } : {}),
      })
      .then((accepted) => {
        track(accepted, { label: 'Compute graph layout' });
        toast({
          title: 'Computing layout',
          description: `${formatCount(response.nodes.length)} nodes is above the ${formatCount(CLIENT_LAYOUT_MAX_NODES)}-node client limit, so the backend is laying it out. The graph redraws when the job finishes.`,
        });
      })
      .catch((err: unknown) => {
        toast({
          title: 'Could not queue the layout job',
          description: err instanceof ApiError ? `${err.message} (${err.code})` : String(err),
          variant: 'error',
        });
      });
    // `precomputeLayout` is a stable mutation object; including it would re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built, response, filters.project_id, maxNodes]);

  /**
   * Play Mode: filter the loaded graph, never refetch.
   *
   * Cumulative by design -- an account that appears in bucket 3 is still on screen at
   * bucket 40, because the question the animation answers is "how did this spread",
   * not "who posted in this twelve-hour window". The scrubber prints both counts so
   * the two are never confused.
   */
  const playState = useMemo(() => {
    if (!response || bucketIndex === null) return { nodeIds: null, shown: null };
    const cutoff = response.buckets?.[bucketIndex]?.bucket_end;
    if (!cutoff) return { nodeIds: null, shown: null };

    const alive = new Set<string>();
    let edges = 0;
    for (const edge of response.edges) {
      const ts = edge.bucket_start ?? edge.first_ts;
      if (ts && ts <= cutoff) {
        alive.add(edge.source);
        alive.add(edge.target);
        edges += 1;
      }
    }
    return { nodeIds: alive, shown: { nodes: alive.size, edges } };
  }, [response, bucketIndex]);

  const visibleNodeIds = playState.nodeIds;

  /**
   * Applies Play Mode and legend visibility by flipping `hidden` on the existing
   * graph, then telling Sigma to refresh. Rebuilding the graph per frame would
   * re-upload every buffer and drop the frame rate through the floor.
   */
  useEffect(() => {
    if (!built || !response) return;
    const { graph } = built;

    graph.forEachNode((id, attrs) => {
      const hiddenByTime = visibleNodeIds !== null && !visibleNodeIds.has(id);
      const hiddenByLegend =
        hiddenLegend.has('bot_like') && attrs.isBotLike === true;
      graph.setNodeAttribute(id, 'hidden', hiddenByTime || hiddenByLegend);
    });

    graph.forEachEdge((id, attrs) => {
      const cutoff =
        bucketIndex !== null ? response.buckets?.[bucketIndex]?.bucket_end : null;
      const hiddenByTime = Boolean(
        cutoff && attrs.bucketStart && String(attrs.bucketStart) > cutoff,
      );
      const hiddenByLegend = hiddenLegend.has(String(attrs.edgeType));
      graph.setEdgeAttribute(id, 'hidden', hiddenByTime || hiddenByLegend);
      graph.setEdgeAttribute(
        id,
        'color',
        edgeColour(attrs.edgeType as GraphEdge['edge_type'], edgeOpacity),
      );
    });

    setRefreshToken((t) => t + 1);
  }, [built, response, visibleNodeIds, hiddenLegend, edgeOpacity, bucketIndex]);

  // Recolour in place on a colour-by change, for the same reason.
  useEffect(() => {
    if (!built || !response) return;
    const byId = new Map(response.nodes.map((n) => [n.id, n]));
    built.graph.forEachNode((id) => {
      const node = byId.get(id);
      if (node) built.graph.setNodeAttribute(id, 'color', nodeColour(node, colourBy));
    });
    setRefreshToken((t) => t + 1);
  }, [colourBy, built, response]);

  const legendCounts = useMemo(() => {
    if (!response) return {};
    const counts: Record<string, number> = {};
    for (const edge of response.edges) {
      counts[edge.edge_type] = (counts[edge.edge_type] ?? 0) + 1;
    }
    counts.bot_like = response.nodes.filter((n) => n.is_bot_like === true).length;
    return counts;
  }, [response]);

  const toggleLegend = useCallback((key: string) => {
    setHiddenLegend((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Own shell: no icon rail, no top bar. */}
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/p/${projectSlug}/network`}>
            <ArrowLeft className="h-3 w-3" aria-hidden="true" />
            Network
          </Link>
        </Button>

        <span className="text-xs font-semibold">Graph</span>
        {project && <Badge variant="muted">{project.name}</Badge>}
        {narrativeIds.length > 0 && (
          <Badge variant="default">{narrativeIds.length} narrative(s)</Badge>
        )}
        {comparisonId && <Badge variant="default">comparison</Badge>}

        <div className="mx-2 h-5 w-px bg-border" aria-hidden="true" />

        {/* GRAPH: styling and layout */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Layers className="h-3 w-3" aria-hidden="true" />
              Graph
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="colour-by">Colour nodes by</Label>
              <Select value={colourBy} onValueChange={(v) => setColourBy(v as ColourBy)}>
                <SelectTrigger id="colour-by" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOUR_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-2xs text-muted-foreground">
              Node size is degree. Positions come from the backend
              {response?.layout ? ` (layout: ${response.layout})` : ''}.
            </p>
          </PopoverContent>
        </Popover>

        {/* INTERACT: pointer vs lasso */}
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          <Button
            variant={lassoMode ? 'ghost' : 'secondary'}
            size="icon-sm"
            aria-label="Pointer mode: pan and click nodes"
            aria-pressed={!lassoMode}
            onClick={() => setLassoMode(false)}
          >
            <MousePointer2 className="h-3 w-3" aria-hidden="true" />
          </Button>
          <Button
            variant={lassoMode ? 'secondary' : 'ghost'}
            size="icon-sm"
            aria-label="Lasso mode: drag to select nodes"
            aria-pressed={lassoMode}
            onClick={() => setLassoMode(true)}
          >
            <Crosshair className="h-3 w-3" aria-hidden="true" />
          </Button>
        </div>

        {/* FILTER */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-3 w-3" aria-hidden="true" />
              Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="hide-standalone" className="normal-case tracking-normal">
                Hide standalone nodes
              </Label>
              <Switch
                id="hide-standalone"
                checked={hideStandalone}
                onCheckedChange={setHideStandalone}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="max-nodes">Max nodes</Label>
              <Select value={String(maxNodes)} onValueChange={(v) => setMaxNodes(Number(v))}>
                <SelectTrigger id="max-nodes" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1000, 5000, 10000, 20000, 50000].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {formatCount(n)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-2xs text-muted-foreground">
                Above {formatCount(CLIENT_LAYOUT_MAX_NODES)} nodes without server
                positions, layout is computed by a backend job rather than in the browser.
              </p>
            </div>
          </PopoverContent>
        </Popover>

        {/* INSPECT */}
        <Button variant="outline" size="sm" onClick={() => setInspectOpen(true)}>
          <Search className="h-3 w-3" aria-hidden="true" />
          Inspect
        </Button>

        <div className="flex-1" />

        {selectedNodes.length > 0 && (
          <Badge variant="default">{formatCount(selectedNodes.length)} selected</Badge>
        )}
      </header>

      {response?.stats.truncated && (
        <TruncationBanner
          stats={response.stats}
          onRaiseLimit={() => setMaxNodes((n) => Math.min(n * 2, 50_000))}
          onNarrowFilters={() => setInspectOpen(true)}
        />
      )}

      <div className="relative min-h-0 flex-1">
        {graphQuery.isLoading && (
          <div className="p-4">
            <SkeletonChart />
          </div>
        )}

        {Boolean(graphQuery.error) && !graphQuery.isLoading && (
          <div className="p-4">
            <ErrorState
              error={graphQuery.error}
              title="Could not load the network graph"
              onRetry={() => void graphQuery.refetch()}
            />
          </div>
        )}

        {response && response.nodes.length === 0 && (
          <div className="p-4">
            <EmptyState
              title="No network in this window"
              description="No edges were built for these filters. Interaction edges come from the graph.build_edges job; a project that has not run it has none."
            />
          </div>
        )}

        {built && response && response.nodes.length > 0 && (
          <>
            <GraphCanvas
              graph={built.graph}
              refreshToken={refreshToken}
              lassoMode={lassoMode}
              onNodeClick={(id) => setAuthorId(id)}
              onSelection={({ nodeIds }) => setSelectedNodes(nodeIds)}
            />

            <div className="pointer-events-none absolute bottom-3 right-3">
              <div className="pointer-events-auto">
                <GraphLegend
                  legend={response.legend ?? []}
                  counts={legendCounts}
                  hidden={hiddenLegend}
                  onToggle={toggleLegend}
                  opacity={edgeOpacity}
                  onOpacityChange={setEdgeOpacity}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {response && (
        <TimelineScrubber
          buckets={response.buckets ?? []}
          bucketWidth={bucketWidth}
          onBucketWidthChange={(w) => {
            // A new bucket width is a new aggregation: this one does refetch.
            setBucketIndex(null);
            setBucketWidth(w);
          }}
          index={bucketIndex}
          onIndexChange={setBucketIndex}
          tz={filters.tz}
          shown={playState.shown}
        />
      )}

      {/* Footer: counts and the graph-level statistics. */}
      {response && (
        <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-surface px-3 py-1.5 text-2xs text-muted-foreground">
          <span className="tabular">
            {formatCount(response.stats.node_count)} nodes ·{' '}
            {formatCount(response.stats.edge_count)} edges
          </span>
          <span className="tabular">density {formatDecimal(response.stats.density, 5)}</span>
          <span className="tabular">
            {formatCount(response.stats.component_count)} components · largest{' '}
            {formatCount(response.stats.largest_component_size)}
          </span>
          <span className="tabular">modularity {formatDecimal(response.stats.modularity, 3)}</span>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <Switch
              id="footer-hide-standalone"
              checked={hideStandalone}
              onCheckedChange={setHideStandalone}
            />
            <Label htmlFor="footer-hide-standalone" className="normal-case tracking-normal">
              Hide standalone nodes
            </Label>
          </div>
        </footer>
      )}

      <Sheet open={inspectOpen} onOpenChange={setInspectOpen}>
        <SheetContent width="wide" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>Inspect</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {response && (
              <InspectPanel
                response={response}
                visibleNodeIds={visibleNodeIds}
                onSelectNode={(id) => {
                  setInspectOpen(false);
                  setAuthorId(id);
                }}
              />
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <AuthorPanel
        authorId={authorId}
        onOpenChange={(open) => !open && setAuthorId(null)}
        tz={filters.tz}
        slug={projectSlug}
      />
    </div>
  );
}
