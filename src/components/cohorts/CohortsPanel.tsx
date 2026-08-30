import { Info, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCohorts } from '@/api/queries/entities';
import type { CohortOut } from '@/api/types';
import { EntityTable } from '@/components/table/EntityTable';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { FilterSpec } from '@/lib/filters';
import { cohortColumns } from './cohortColumns';
import { COHORT_METHODOLOGY } from './methodology';

/** The disclaimer, rendered verbatim wherever cohorts are shown. */
export function CohortsMethodologyNote() {
  return (
    <div className="flex gap-2 rounded-md border border-border bg-surface-sunken p-2.5">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="text-2xs leading-relaxed text-muted-foreground">{COHORT_METHODOLOGY}</p>
    </div>
  );
}

/**
 * Opens from any cohort value anywhere: a cohorts line on a feed card, a bar on the
 * narrative cohort chart, a cell in the drivers table. Same panel, same methodology
 * banner, every time.
 */
export function CohortsPanel({
  open,
  onOpenChange,
  filters,
  onSelectCohort,
  title = 'Cohorts',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterSpec;
  /** Adds the cohort to the URL filter, so the slide-over doubles as a filter picker. */
  onSelectCohort?: ((cohort: CohortOut) => void) | undefined;
  title?: string;
}) {
  const [search, setSearch] = useState('');
  const { data, isLoading, error, refetch } = useCohorts(filters, { limit: 200 });

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (c) => c.name.toLowerCase().includes(needle) || c.category.toLowerCase().includes(needle),
    );
  }, [data, search]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="wide" aria-describedby="cohorts-panel-desc">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription id="cohorts-panel-desc">
            Author groupings inferred for this project, within the current filters.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-3">
          <CohortsMethodologyNote />

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Search cohorts"
              placeholder="Search cohorts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7"
            />
          </div>

          <EntityTable
            tableId="cohorts-panel"
            caption="Cohorts by author count and share of posts"
            columns={cohortColumns}
            rows={rows}
            rowKey={(c) => c.id}
            isLoading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            onRowClick={onSelectCohort}
            emptyTitle="No cohorts match"
            emptyDescription="Cohorts are produced by the clustering and scoring passes; a project that has not been scored has none."
            maxHeight="calc(100vh - 20rem)"
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
