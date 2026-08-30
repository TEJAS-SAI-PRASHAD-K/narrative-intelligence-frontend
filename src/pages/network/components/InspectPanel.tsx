import { useMemo, useState } from 'react';
import type { GraphNode, GraphResponse } from '@/api/types';
import { NotMeasured } from '@/components/risk/NotMeasured';
import { ScoreCell } from '@/components/risk/ScoreCell';
import { EntityTable } from '@/components/table/EntityTable';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCount, platformLabel } from '@/lib/format';
import { attributeHistogram } from './graphModel';

/** Node fields the ad-hoc histogram can bucket. */
const HISTOGRAM_FIELDS = [
  { value: 'degree', label: 'Degree' },
  { value: 'bot_score', label: 'Bot score' },
  { value: 'post_count', label: 'Post count' },
  { value: 'source', label: 'Platform' },
  { value: 'community_id', label: 'Community' },
  { value: 'is_bot_like', label: 'Bot-like flag' },
  { value: 'cohort_ids', label: 'Cohort count' },
] as const;

/**
 * Inspect: a distribution over any node field, and the node list as a real table.
 *
 * Both describe *the loaded graph*, which may be truncated, so the panel says so
 * rather than letting a histogram read as a corpus statistic.
 */
export function InspectPanel({
  response,
  visibleNodeIds,
  onSelectNode,
}: {
  response: GraphResponse;
  visibleNodeIds: Set<string> | null;
  onSelectNode: (nodeId: string) => void;
}) {
  const [field, setField] = useState<string>('degree');

  const nodes = useMemo(
    () =>
      visibleNodeIds === null
        ? response.nodes
        : response.nodes.filter((n) => visibleNodeIds.has(n.id)),
    [response.nodes, visibleNodeIds],
  );

  const histogram = useMemo(() => attributeHistogram(nodes, field), [nodes, field]);
  const max = Math.max(...histogram.map((h) => h.count), 1);

  return (
    <Tabs defaultValue="histogram">
      <TabsList>
        <TabsTrigger value="histogram">Histogram</TabsTrigger>
        <TabsTrigger value="table">Table</TabsTrigger>
      </TabsList>

      <TabsContent value="histogram" className="mt-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="histogram-field" className="whitespace-nowrap">
            Add histogram for
          </Label>
          <Select value={field} onValueChange={setField}>
            <SelectTrigger id="histogram-field" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HISTOGRAM_FIELDS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-2xs text-muted-foreground">
          Distribution over the {formatCount(nodes.length)} node
          {nodes.length === 1 ? '' : 's'} currently loaded
          {response.stats.truncated ? ' — this graph is truncated, so this is not a corpus-wide distribution' : ''}.
        </p>

        <ul className="space-y-1">
          {histogram.map((bin) => (
            <li key={bin.label} className="space-y-0.5">
              <div className="flex items-baseline gap-2 text-2xs">
                <span className="min-w-0 flex-1 truncate">{bin.label}</span>
                <span className="tabular">{formatCount(bin.count)}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className={
                    bin.label === 'not measured'
                      ? 'h-full rounded-full bg-risk-none'
                      : 'h-full rounded-full bg-primary/70'
                  }
                  style={{ width: `${(bin.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="table" className="mt-3">
        <EntityTable
          tableId="graph-nodes"
          caption="Nodes in the loaded graph"
          columns={[
            {
              id: 'label',
              header: 'Account',
              cell: (n: GraphNode) => (
                <span className="truncate font-medium">@{n.label ?? n.id}</span>
              ),
            },
            { id: 'source', header: 'Platform', cell: (n) => platformLabel(n.source) },
            {
              id: 'degree',
              header: 'Degree',
              align: 'right',
              cell: (n) => <span className="tabular">{formatCount(n.degree)}</span>,
            },
            {
              id: 'posts',
              header: 'Posts',
              align: 'right',
              cell: (n) =>
                n.post_count === null || n.post_count === undefined ? (
                  <NotMeasured />
                ) : (
                  <span className="tabular">{formatCount(n.post_count)}</span>
                ),
            },
            {
              id: 'bot',
              header: 'Bot score',
              cell: (n) => <ScoreCell value={n.bot_score} scale="unit" />,
            },
            {
              id: 'community',
              header: 'Community',
              defaultHidden: true,
              cell: (n) =>
                n.community_id ? (
                  <span className="font-mono text-2xs">{n.community_id.slice(0, 8)}</span>
                ) : (
                  <NotMeasured reason="Community detection has not run." />
                ),
            },
          ]}
          rows={nodes}
          rowKey={(n) => n.id}
          onRowClick={(n) => onSelectNode(n.id)}
          emptyTitle="No nodes in view"
          maxHeight="26rem"
        />
      </TabsContent>
    </Tabs>
  );
}
