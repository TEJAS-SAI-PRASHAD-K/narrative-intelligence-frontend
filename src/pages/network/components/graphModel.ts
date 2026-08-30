import Graph from 'graphology';
import type { GraphEdge, GraphNode, GraphResponse } from '@/api/types';
import { resolveToken } from '@/lib/tokens';

/**
 * Builds the graphology instance Sigma renders.
 *
 * Positions come from `GraphNode.x/y`. When they are null the caller must enqueue
 * `POST /network/layout` instead of laying out here: above ~2,000 nodes a client-side
 * force layout locks the main thread for tens of seconds and the analyst has no way to
 * tell a slow layout from a hung page.
 */

export const CLIENT_LAYOUT_MAX_NODES = 2000;

/**
 * Colour roles the legend uses, as token names. Sigma cannot parse
 * `hsl(var(--token))`, so these are resolved to concrete colours at render time.
 */
const COLOUR_ROLE: Record<string, string> = {
  danger: '--risk-high',
  warning: '--risk-med',
  success: '--risk-low',
  accent: '--ai',
  neutral: '--muted-foreground',
  primary: '--primary',
};

export function legendColour(role: string): string {
  return resolveToken(COLOUR_ROLE[role] ?? '--muted-foreground');
}

const COMMUNITY_TOKENS = [
  '--series-1',
  '--series-2',
  '--series-3',
  '--series-4',
  '--series-5',
  '--series-6',
  '--series-7',
  '--series-8',
];

/** Stable colour per community id, so a refetch does not reshuffle the palette. */
export function communityColour(id: string | null | undefined): string {
  if (!id) return resolveToken('--muted-foreground');
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  const token = COMMUNITY_TOKENS[Math.abs(h) % COMMUNITY_TOKENS.length] as string;
  return resolveToken(token);
}

export type ColourBy = 'community' | 'cohort' | 'bot_like' | 'platform';

const PLATFORM_TOKEN: Record<string, string> = {
  reddit: '--series-4',
  mastodon: '--series-2',
  news: '--series-3',
  gdelt: '--series-6',
  youtube: '--series-1',
};

export function nodeColour(node: GraphNode, colourBy: ColourBy): string {
  switch (colourBy) {
    case 'bot_like':
      // Not measured is grey, not green. An unscored account is not a clean account.
      if (node.bot_score === null || node.bot_score === undefined)
        return resolveToken('--risk-none');
      if (node.is_bot_like === true || node.bot_score >= 0.6) return resolveToken('--risk-high');
      if (node.bot_score >= 0.3) return resolveToken('--risk-med');
      return resolveToken('--risk-low');
    case 'cohort':
      return communityColour(node.cohort_ids?.[0] ?? null);
    case 'platform':
      return resolveToken(PLATFORM_TOKEN[node.source] ?? '--muted-foreground');
    case 'community':
    default:
      return communityColour(node.community_id);
  }
}

const EDGE_TOKEN: Record<GraphEdge['edge_type'], string> = {
  reply: '--muted-foreground',
  repost: '--series-1',
  mention: '--series-3',
  co_post_similarity: '--ai',
};

export function edgeColour(type: GraphEdge['edge_type'], alpha = 1): string {
  return resolveToken(EDGE_TOKEN[type], alpha);
}

/** Degree drives size, compressed so one hub does not flatten everything else. */
export function nodeSize(degree: number, maxDegree: number): number {
  const ratio = maxDegree > 0 ? degree / maxDegree : 0;
  return 2 + Math.sqrt(ratio) * 12;
}

export interface BuildOptions {
  colourBy: ColourBy;
  hideStandalone: boolean;
}

export interface BuiltGraph {
  graph: Graph;
  /**
   * True when the client is responsible for positioning.
   *
   * The contract says `layout: "client"` means "small enough to lay out live" -- the
   * x/y that come with it are a seed ring, not a result, and rendering them as-is
   * draws a circle that looks like structure but encodes nothing. Any other value
   * ("precomputed", "forceatlas2") means the positions are authoritative and must be
   * used as given.
   */
  needsLayout: boolean;
  maxDegree: number;
}

export function buildGraph(response: GraphResponse, options: BuildOptions): BuiltGraph {
  const graph = new Graph({ multi: true, type: 'undirected' });

  const positioned = response.nodes.filter(
    (n) => typeof n.x === 'number' && typeof n.y === 'number',
  );
  const needsLayout =
    response.nodes.length > 0 &&
    (response.layout === 'client' || positioned.length === 0);

  const maxDegree = response.nodes.reduce((m, n) => Math.max(m, n.degree), 0);

  for (const node of response.nodes) {
    if (options.hideStandalone && node.degree === 0) continue;
    graph.addNode(node.id, {
      // Fallback positions are a deterministic ring, never a random scatter: a random
      // layout looks like structure that is not there.
      x: node.x ?? Math.cos(hashAngle(node.id)) * 100,
      y: node.y ?? Math.sin(hashAngle(node.id)) * 100,
      size: nodeSize(node.degree, maxDegree),
      color: nodeColour(node, options.colourBy),
      label: node.label ?? node.id,
      degree: node.degree,
      source: node.source,
      communityId: node.community_id ?? null,
      botScore: node.bot_score ?? null,
      isBotLike: node.is_bot_like ?? null,
      postCount: node.post_count ?? null,
      cohortIds: node.cohort_ids ?? [],
      authorGroupIds: node.author_group_ids ?? [],
      hidden: false,
    });
  }

  for (const edge of response.edges) {
    if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) continue;
    graph.addEdge(edge.source, edge.target, {
      size: 0.3 + edge.weight * 1.2,
      color: edgeColour(edge.edge_type),
      edgeType: edge.edge_type,
      weight: edge.weight,
      bucketStart: edge.bucket_start ?? edge.first_ts ?? null,
      hidden: false,
    });
  }

  return { graph, needsLayout, maxDegree };
}

function hashAngle(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 3600) / 3600 * Math.PI * 2;
}

/**
 * Distribution of any numeric or categorical node attribute, for the ad-hoc
 * "Add histogram for…" control. Computed over the already-loaded graph -- this is a
 * chart of what is on screen, not a corpus statistic, and the panel says so.
 */
export function attributeHistogram(
  nodes: GraphNode[],
  field: string,
): { label: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const node of nodes) {
    const raw = (node as unknown as Record<string, unknown>)[field];
    let key: string;

    if (raw === null || raw === undefined) key = 'not measured';
    else if (typeof raw === 'number') key = numericBucket(field, raw);
    else if (Array.isArray(raw)) key = raw.length === 0 ? 'none' : `${raw.length}`;
    else key = String(raw);

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => (a.label === 'not measured' ? 1 : b.count - a.count));
}

function numericBucket(field: string, value: number): string {
  // Scores get 0.2-wide bands; counts get order-of-magnitude bands.
  if (field.endsWith('_score')) {
    const lower = Math.floor(value * 5) / 5;
    return `${lower.toFixed(1)}–${(lower + 0.2).toFixed(1)}`;
  }
  if (value === 0) return '0';
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  return `${magnitude}–${magnitude * 10}`;
}
