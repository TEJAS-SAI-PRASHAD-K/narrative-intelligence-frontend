import { useMemo, useState } from 'react';
import { useDrivers, usePosts, type DriverKind } from '@/api/queries/entities';
import type { DriverItem } from '@/api/types';
import { CohortsPanel } from '@/components/cohorts/CohortsPanel';
import { FilterBar } from '@/components/filters/FilterBar';
import { OriginalPost } from '@/components/post/OriginalPost';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/states';
import { EntityTable } from '@/components/table/EntityTable';
import { Button } from '@/components/ui/button';
import { InfoTip } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjectContext } from '@/layout/useProjectContext';
import { formatCount } from '@/lib/format';
import { useFilters } from '@/lib/useFilters';
import { AuthorPanel } from '@/pages/authors/components/AuthorPanel';
import { driverColumns } from './components/driverColumns';
import { InsightsDonut } from './components/InsightsDonut';

const KINDS: { value: DriverKind; label: string }[] = [
  { value: 'authors', label: 'Authors' },
  { value: 'hashtags', label: 'Hashtags' },
  { value: 'urls', label: 'URLs' },
];

/**
 * 4.5 Conversation Drivers. Three tabs over one table and one FilterSpec.
 *
 * `DriversResponse` carries no `next_cursor` (see docs/contract-gaps.md #8), so the
 * page requests one page at the contract maximum and says so in the footer rather
 * than implying the list is complete.
 */
const PAGE_LIMIT = 200;

export default function DriversPage() {
  const { projectId, slug } = useProjectContext();
  const { filters, patchFilters, resetFilters, pageParams, setPageParam } = useFilters(projectId);

  const kind = (pageParams.get('kind') ?? 'authors') as DriverKind;
  const [selected, setSelected] = useState<DriverItem | null>(null);
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [cohortsOpen, setCohortsOpen] = useState(false);

  const drivers = useDrivers(kind, filters, { limit: PAGE_LIMIT });
  const columns = useMemo(() => driverColumns(kind, filters.tz), [kind, filters.tz]);

  // The right rail shows the post behind the selected driver. Scoped by `q` so the
  // lookup is a real backend query, not a client-side scan of a list already fetched.
  const selectedPosts = usePosts(
    selected ? { ...filters, q: selected.entity } : filters,
    { limit: 1, sort: 'engagement' },
    selected !== null,
  );
  const selectedPost = selectedPosts.data?.pages[0]?.items[0];

  const items = drivers.data?.items ?? [];

  return (
    <div className="flex min-h-full flex-col">
      <FilterBar filters={filters} onChange={patchFilters} onReset={resetFilters}>
        <Button variant="ghost" size="sm" onClick={() => setCohortsOpen(true)}>
          Cohorts
        </Button>
      </FilterBar>

      <div className="grid min-h-0 flex-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-sm font-semibold">Conversation drivers</h1>
            {drivers.data && (
              <span className="flex items-center gap-1 text-2xs text-muted-foreground">
                {formatCount(items.length)} rows
                <InfoTip label="How are drivers computed?">
                  <p>{drivers.data.definition}</p>
                </InfoTip>
              </span>
            )}
          </div>

          <Tabs value={kind} onValueChange={(v) => setPageParam('kind', v)}>
            <TabsList>
              {KINDS.map((k) => (
                <TabsTrigger key={k.value} value={k.value}>
                  {k.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <EntityTable
            tableId={`drivers-${kind}`}
            caption={`Top ${kind} driving this conversation`}
            columns={columns}
            rows={items}
            rowKey={(d) => `${d.entity_type}:${d.entity}`}
            isLoading={drivers.isLoading}
            error={drivers.error}
            onRetry={() => void drivers.refetch()}
            onRowClick={(d) => {
              setSelected(d);
              if (kind === 'authors') setAuthorId(d.entity);
            }}
            selectedKey={selected ? `${selected.entity_type}:${selected.entity}` : undefined}
            emptyTitle={`No ${kind} match these filters`}
            emptyDescription="Widen the date range or clear a filter chip."
            maxHeight="calc(100vh - 18rem)"
            footer={
              items.length >= PAGE_LIMIT ? (
                <p className="text-2xs text-muted-foreground">
                  Showing the first {PAGE_LIMIT} rows — the drivers endpoint returns no
                  pagination cursor, so this is not necessarily the complete set. Narrow the
                  filters to be sure you are seeing everything. (contract-gaps #8)
                </p>
              ) : (
                <p className="text-2xs text-muted-foreground">
                  {formatCount(items.length)} row{items.length === 1 ? '' : 's'} — complete for
                  these filters.
                </p>
              )
            }
          />
        </div>

        <aside className="min-w-0 space-y-4">
          <section className="space-y-2">
            <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Selected
            </h2>
            {!selected && (
              <EmptyState
                title="Select a row"
                description="The highest-engagement post behind that driver appears here."
              />
            )}
            {selected && selectedPosts.isLoading && <SkeletonCard />}
            {selected && Boolean(selectedPosts.error) && (
              <ErrorState error={selectedPosts.error} compact />
            )}
            {selected && !selectedPosts.isLoading && !selectedPost && (
              <EmptyState
                title="No post found"
                description={`Nothing in the current filters matches "${selected.entity}".`}
              />
            )}
            {selectedPost && (
              <OriginalPost
                post={selectedPost}
                tz={filters.tz}
                onOpenAuthor={(id) => setAuthorId(id)}
              />
            )}
          </section>

          <InsightsDonut filters={filters} />
        </aside>
      </div>

      <AuthorPanel
        authorId={authorId}
        onOpenChange={(open) => !open && setAuthorId(null)}
        tz={filters.tz}
        slug={slug}
      />

      <CohortsPanel
        open={cohortsOpen}
        onOpenChange={setCohortsOpen}
        filters={filters}
        onSelectCohort={(cohort) => {
          patchFilters({ cohort_id: [...(filters.cohort_id ?? []), cohort.id] });
          setCohortsOpen(false);
        }}
      />
    </div>
  );
}
