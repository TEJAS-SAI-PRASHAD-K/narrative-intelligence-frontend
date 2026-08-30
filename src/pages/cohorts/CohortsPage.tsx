import { useState } from 'react';
import { useCohortAuthors, useCohorts } from '@/api/queries/entities';
import type { CohortOut } from '@/api/types';
import { CohortsMethodologyNote } from '@/components/cohorts/CohortsPanel';
import { cohortColumns } from '@/components/cohorts/cohortColumns';
import { FilterBar } from '@/components/filters/FilterBar';
import { ScoreCell } from '@/components/risk/ScoreCell';
import { EmptyState } from '@/components/states';
import { EntityTable } from '@/components/table/EntityTable';
import { Button } from '@/components/ui/button';
import { useProjectContext } from '@/layout/useProjectContext';
import { formatCount, platformLabel } from '@/lib/format';
import { useFilters } from '@/lib/useFilters';
import { AuthorPanel } from '@/pages/authors/components/AuthorPanel';

/**
 * 4.4 Cohorts directory. The same columns the slide-over uses, plus the members of a
 * selected cohort — so "who is actually in this group" is one click from the share
 * number that made it interesting.
 */
export default function CohortsPage() {
  const { projectId, slug } = useProjectContext();
  const { filters, patchFilters, resetFilters } = useFilters(projectId);

  const [selected, setSelected] = useState<CohortOut | null>(null);
  const [authorId, setAuthorId] = useState<string | null>(null);

  const cohorts = useCohorts(filters, { limit: 200 });
  const members = useCohortAuthors(selected?.id, { limit: 200 });

  return (
    <div className="flex min-h-full flex-col">
      <FilterBar filters={filters} onChange={patchFilters} onReset={resetFilters} />

      <div className="grid min-h-0 flex-1 gap-4 p-4 xl:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <h1 className="text-sm font-semibold">Cohorts</h1>
          <CohortsMethodologyNote />
          <EntityTable
            tableId="cohorts-page"
            caption="Cohorts in this project"
            columns={cohortColumns}
            rows={cohorts.data?.items ?? []}
            rowKey={(c) => c.id}
            isLoading={cohorts.isLoading}
            error={cohorts.error}
            onRetry={() => void cohorts.refetch()}
            onRowClick={setSelected}
            selectedKey={selected?.id}
            emptyTitle="No cohorts in this project"
            emptyDescription="Cohorts are produced by the scoring pass. An unscored project has none."
            maxHeight="calc(100vh - 20rem)"
          />
        </div>

        <div className="min-w-0 space-y-3">
          {!selected && (
            <EmptyState
              title="Select a cohort"
              description="Its members appear here, with the scores that put them in it."
            />
          )}

          {selected && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">{selected.name}</h2>
                <span className="text-2xs text-muted-foreground">
                  {formatCount(selected.author_count)} authors
                </span>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    patchFilters({ cohort_id: [...(filters.cohort_id ?? []), selected.id] })
                  }
                >
                  Filter everything by this cohort
                </Button>
              </div>

              {selected.description && (
                <p className="text-xs text-muted-foreground">{selected.description}</p>
              )}

              <EntityTable
                tableId="cohort-members"
                caption={`Authors in ${selected.name}`}
                columns={[
                  {
                    id: 'handle',
                    header: 'Author',
                    cell: (a) => <span className="truncate font-medium">@{a.handle ?? a.author_id}</span>,
                  },
                  { id: 'source', header: 'Platform', cell: (a) => platformLabel(a.source) },
                  {
                    id: 'posts',
                    header: 'Posts',
                    align: 'right',
                    cell: (a) => <span className="tabular">{formatCount(a.post_count)}</span>,
                  },
                  {
                    id: 'risk',
                    header: 'Risk',
                    headerHint: 'AuthorOut.risk_score is 0-100, not a percentage.',
                    cell: (a) => <ScoreCell value={a.risk_score} scale="hundred" />,
                  },
                  {
                    id: 'bot',
                    header: 'Bot-like',
                    cell: (a) => <ScoreCell value={a.bot_score} scale="unit" />,
                  },
                ]}
                rows={members.data?.items ?? []}
                rowKey={(a) => a.author_id}
                isLoading={members.isLoading}
                error={members.error}
                onRetry={() => void members.refetch()}
                onRowClick={(a) => setAuthorId(a.author_id)}
                emptyTitle="No authors returned for this cohort"
                maxHeight="calc(100vh - 22rem)"
              />
            </>
          )}
        </div>
      </div>

      <AuthorPanel
        authorId={authorId}
        onOpenChange={(open) => !open && setAuthorId(null)}
        tz={filters.tz}
        slug={slug}
      />
    </div>
  );
}
