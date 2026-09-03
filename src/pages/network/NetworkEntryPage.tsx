import { Network, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { useCreateComparison, useComparisons, useDeleteComparison } from '@/api/queries/network';
import { useNarrativeFeed } from '@/api/queries/narratives';
import type { ComparisonOut, EntityType } from '@/api/types';
import { FilterBar } from '@/components/filters/FilterBar';
import { PageShell } from '@/components/page';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/states';
import { EntityTable } from '@/components/table/EntityTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { seriesColour } from '@/components/charts/palette';
import { useProjectContext } from '@/layout/useProjectContext';
import { toSearchParams } from '@/lib/filters';
import { formatDateTime, platformLabel, truncate } from '@/lib/format';
import { useFilters } from '@/lib/useFilters';

const PLATFORMS = ['reddit', 'mastodon', 'news', 'gdelt', 'youtube'] as const;
const ENTITY_TYPES: EntityType[] = ['author', 'hashtag', 'url', 'domain'];

/**
 * 4.6 entry screen. Five "select entities" builder slots, each with its own Visualize
 * button, over the saved-comparisons table.
 *
 * Every Visualize hands the graph route the current FilterSpec plus its own selection,
 * so the graph opens on exactly the scope the analyst was looking at.
 */
export default function NetworkEntryPage() {
  const { projectId, slug } = useProjectContext();
  const navigate = useNavigate();
  const { filters, patchFilters, resetFilters } = useFilters(projectId);
  const { toast } = useToast();

  const comparisons = useComparisons(projectId);
  const deleteComparison = useDeleteComparison();
  const [createOpen, setCreateOpen] = useState(false);

  // A short top-priority slice purely to name narratives in the builder.
  const narratives = useNarrativeFeed(filters, { sort: 'priority', limit: 50 });
  const narrativeItems = narratives.data?.pages[0]?.items ?? [];

  function visualize(params: {
    platforms?: string[];
    narrativeIds?: string[];
    comparisonId?: string;
  }) {
    const sp = toSearchParams({
      ...filters,
      ...(params.platforms && params.platforms.length > 0 ? { platform: params.platforms } : {}),
    });
    for (const id of params.narrativeIds ?? []) sp.append('narrative_id', id);
    if (params.comparisonId) sp.set('comparison_id', params.comparisonId);
    navigate(`/p/${slug}/network/graph?${sp.toString()}`);
  }

  async function remove(comparison: ComparisonOut) {
    try {
      await deleteComparison.mutateAsync(comparison.id);
      toast({ title: `Deleted “${comparison.name}”`, variant: 'success' });
    } catch (err) {
      toast({
        title: 'Could not delete the comparison',
        description: err instanceof ApiError ? `${err.message} (${err.code})` : String(err),
        variant: 'error',
      });
    }
  }

  return (
    <PageShell
      title="Network"
      description="How this conversation spreads between accounts. Pick what to draw — everything, one platform, one narrative, or only the accounts a detector flagged — and the graph opens on that scope."
      filterBar={<FilterBar filters={filters} onChange={patchFilters} onReset={resetFilters} />}
    >
      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Choose a starting point
          </h2>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <BuilderSlot
              title="Everything"
              description="Every account and edge in the current filters."
              onVisualize={() => visualize({})}
            />

            <PlatformSlot
              selected={filters.platform ?? []}
              onVisualize={(platforms) => visualize({ platforms })}
            />

            <NarrativeSlot
              narratives={narrativeItems.map((n) => ({
                id: n.id,
                label: `#${n.display_id} ${truncate(n.title.text ?? 'Untitled', 40)}`,
              }))}
              isLoading={narratives.isLoading}
              onVisualize={(ids) => visualize({ narrativeIds: ids })}
            />

            <BuilderSlot
              title="Bot-like accounts only"
              description="Accounts the classifier flagged, and the edges between them."
              onVisualize={() => {
                patchFilters({ is_bot_like: true });
                visualize({});
              }}
            />

            <BuilderSlot
              title="Anomalous accounts only"
              description="Accounts whose posting pattern the detector flagged."
              onVisualize={() => {
                patchFilters({ is_anomalous: true });
                visualize({});
              }}
            />
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Saved comparisons</h2>
            <div className="flex-1" />
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3 w-3" aria-hidden="true" />
              Create new comparison
            </Button>
          </div>

          {comparisons.isLoading && <SkeletonCard />}
          {Boolean(comparisons.error) && !comparisons.isLoading && (
            <ErrorState error={comparisons.error} onRetry={() => void comparisons.refetch()} />
          )}

          {!comparisons.isLoading && (comparisons.data?.items.length ?? 0) === 0 && (
            <EmptyState
              icon={<Network className="h-6 w-6" />}
              title="No saved comparisons"
              description="A comparison pins a set of narratives and platforms so you can return to the same network view."
              action={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  Create one
                </Button>
              }
            />
          )}

          {(comparisons.data?.items.length ?? 0) > 0 && (
            <EntityTable
              tableId="comparisons"
              caption="Saved network comparisons"
              columns={[
                {
                  id: 'name',
                  header: 'Name',
                  cell: (c: ComparisonOut) => <span className="font-medium">{c.name}</span>,
                },
                {
                  id: 'platforms',
                  header: 'Platforms',
                  cell: (c) => (
                    <div className="flex flex-wrap gap-1">
                      {(c.platforms ?? []).map((p) => (
                        <Badge key={p} variant="muted">
                          {platformLabel(p)}
                        </Badge>
                      ))}
                      {(c.platforms?.length ?? 0) === 0 && (
                        <span className="text-muted-foreground">all</span>
                      )}
                    </div>
                  ),
                },
                {
                  id: 'narratives',
                  header: 'Narratives',
                  cell: (c) => (
                    /* Colour-coded legend: the same colours the graph will use. */
                    <ul className="flex flex-wrap gap-1.5">
                      {c.narrative_ids.map((id) => (
                        <li key={id} className="flex items-center gap-1">
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 rounded-sm"
                            style={{ background: seriesColour(id) }}
                          />
                          <span className="max-w-[12rem] truncate text-2xs">
                            {c.narrative_titles?.[id] ?? `${id.slice(0, 8)}…`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ),
                },
                { id: 'entity_type', header: 'Entity type', cell: (c) => c.entity_type },
                {
                  id: 'created',
                  header: 'Created',
                  cell: (c) => (
                    <span className="tabular">{formatDateTime(c.created_at, filters.tz)}</span>
                  ),
                },
              ]}
              rows={comparisons.data?.items ?? []}
              rowKey={(c) => c.id}
              rowActions={(c) => (
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => visualize({ comparisonId: c.id })}
                  >
                    View
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Delete ${c.name}`}
                    onClick={() => void remove(c)}
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </Button>
                </div>
              )}
              maxHeight="26rem"
            />
          )}
        </section>
      </div>

      <CreateComparisonDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        narratives={narrativeItems.map((n) => ({
          id: n.id,
          label: `#${n.display_id} ${truncate(n.title.text ?? 'Untitled', 40)}`,
        }))}
      />
    </PageShell>
  );
}

function BuilderSlot({
  title,
  description,
  children,
  onVisualize,
  disabled,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
  onVisualize: () => void;
  disabled?: boolean;
}) {
  return (
    <section className="flex flex-col gap-2 card-surface p-4">
      <div>
        <h3 className="text-xs font-semibold">{title}</h3>
        <p className="mt-0.5 text-2xs text-muted-foreground">{description}</p>
      </div>
      {children}
      <div className="mt-auto pt-1">
        <Button size="sm" variant="outline" onClick={onVisualize} disabled={disabled}>
          <Network className="h-3 w-3" aria-hidden="true" />
          Visualize
        </Button>
      </div>
    </section>
  );
}

function PlatformSlot({
  selected,
  onVisualize,
}: {
  selected: string[];
  onVisualize: (platforms: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>(selected);

  return (
    <BuilderSlot
      title="Platforms"
      description="Cross-platform spread between the selected sources."
      onVisualize={() => onVisualize(picked)}
    >
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {PLATFORMS.map((p) => (
          <div key={p} className="flex items-center gap-1.5">
            <Checkbox
              id={`platform-${p}`}
              checked={picked.includes(p)}
              onCheckedChange={() =>
                setPicked((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
              }
            />
            <Label htmlFor={`platform-${p}`} className="cursor-pointer normal-case tracking-normal">
              {platformLabel(p)}
            </Label>
          </div>
        ))}
      </div>
    </BuilderSlot>
  );
}

function NarrativeSlot({
  narratives,
  isLoading,
  onVisualize,
}: {
  narratives: { id: string; label: string }[];
  isLoading: boolean;
  onVisualize: (ids: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);

  return (
    <BuilderSlot
      title="AI narratives"
      description="Accounts carrying the selected narratives, and the edges between them."
      onVisualize={() => onVisualize(picked)}
      disabled={picked.length === 0}
    >
      <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
        {isLoading && <p className="text-2xs text-muted-foreground">Loading narratives…</p>}
        {!isLoading && narratives.length === 0 && (
          <p className="text-2xs text-muted-foreground">No narratives in this project.</p>
        )}
        {narratives.map((n) => (
          <div key={n.id} className="flex items-start gap-1.5">
            <Checkbox
              id={`narrative-${n.id}`}
              checked={picked.includes(n.id)}
              onCheckedChange={() =>
                setPicked((prev) =>
                  prev.includes(n.id) ? prev.filter((x) => x !== n.id) : [...prev, n.id],
                )
              }
            />
            <Label
              htmlFor={`narrative-${n.id}`}
              className="cursor-pointer normal-case leading-tight tracking-normal"
            >
              {n.label}
            </Label>
          </div>
        ))}
      </div>
    </BuilderSlot>
  );
}

function CreateComparisonDialog({
  open,
  onOpenChange,
  projectId,
  narratives,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  narratives: { id: string; label: string }[];
}) {
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState<EntityType>('author');
  const [picked, setPicked] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const create = useCreateComparison();
  const { toast } = useToast();

  async function submit() {
    try {
      await create.mutateAsync({
        project_id: projectId,
        name: name.trim(),
        narrative_ids: picked,
        platforms,
        entity_type: entityType,
      });
      toast({ title: 'Comparison saved', variant: 'success' });
      onOpenChange(false);
      setName('');
      setPicked([]);
      setPlatforms([]);
    } catch (err) {
      toast({
        title: 'Could not save the comparison',
        description: err instanceof ApiError ? `${err.message} (${err.code})` : String(err),
        variant: 'error',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a comparison</DialogTitle>
          <DialogDescription>
            Pins a set of narratives and platforms so the same network view can be reopened.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="comparison-name">Name</Label>
            <Input
              id="comparison-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cross-platform vendor claim"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="comparison-entity">Entity type</Label>
            <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
              <SelectTrigger id="comparison-entity" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
              Platforms
            </legend>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {PLATFORMS.map((p) => (
                <div key={p} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`cmp-platform-${p}`}
                    checked={platforms.includes(p)}
                    onCheckedChange={() =>
                      setPlatforms((prev) =>
                        prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
                      )
                    }
                  />
                  <Label
                    htmlFor={`cmp-platform-${p}`}
                    className="cursor-pointer normal-case tracking-normal"
                  >
                    {platformLabel(p)}
                  </Label>
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
              Narratives
            </legend>
            <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
              {narratives.map((n) => (
                <div key={n.id} className="flex items-start gap-1.5">
                  <Checkbox
                    id={`cmp-narrative-${n.id}`}
                    checked={picked.includes(n.id)}
                    onCheckedChange={() =>
                      setPicked((prev) =>
                        prev.includes(n.id) ? prev.filter((x) => x !== n.id) : [...prev, n.id],
                      )
                    }
                  />
                  <Label
                    htmlFor={`cmp-narrative-${n.id}`}
                    className="cursor-pointer normal-case leading-tight tracking-normal"
                  >
                    {n.label}
                  </Label>
                </div>
              ))}
            </div>
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => void submit()}
            disabled={create.isPending || name.trim().length === 0 || picked.length === 0}
          >
            {create.isPending ? 'Saving…' : 'Save comparison'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
