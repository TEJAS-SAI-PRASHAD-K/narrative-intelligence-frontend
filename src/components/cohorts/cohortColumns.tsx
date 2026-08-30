import type { CohortOut } from '@/api/types';
import { NotMeasured } from '@/components/risk/NotMeasured';
import { RiskDot } from '@/components/risk/RiskDot';
import { riskLevelFromScore } from '@/components/risk/riskLevel';
import type { Column } from '@/components/table/EntityTable';
import { Badge } from '@/components/ui/badge';
import { formatCount, formatPct, formatScore, humanizeEnum } from '@/lib/format';

/** Shared by the cohorts page and the cohorts slide-over: one definition, two surfaces. */
export const cohortColumns: Column<CohortOut>[] = [
  {
    id: 'name',
    header: 'Cohort',
    sortKey: 'name',
    cell: (c) => (
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{c.name}</span>
        {c.description && (
          <span className="truncate text-2xs text-muted-foreground">{c.description}</span>
        )}
      </div>
    ),
  },
  {
    id: 'category',
    header: 'Category',
    cell: (c) => <Badge variant="muted">{humanizeEnum(c.category)}</Badge>,
  },
  {
    id: 'authors',
    header: 'Authors',
    align: 'right',
    cell: (c) => <span className="tabular">{formatCount(c.author_count)}</span>,
  },
  {
    id: 'post_pct',
    header: '% of Posts',
    align: 'right',
    headerHint: 'Share of posts in the current filter written by this cohort.',
    cell: (c) =>
      c.post_pct === null || c.post_pct === undefined ? (
        <NotMeasured />
      ) : (
        <span className="tabular">{formatPct(c.post_pct)}</span>
      ),
  },
  {
    id: 'mean_bot',
    header: 'Mean bot score',
    align: 'right',
    defaultHidden: true,
    cell: (c) =>
      c.mean_bot_score === null || c.mean_bot_score === undefined ? (
        <NotMeasured />
      ) : (
        <RiskDot level={riskLevelFromScore(c.mean_bot_score)} label={formatScore(c.mean_bot_score)} />
      ),
  },
  {
    id: 'mean_tox',
    header: 'Mean toxicity',
    align: 'right',
    defaultHidden: true,
    cell: (c) =>
      c.mean_toxicity === null || c.mean_toxicity === undefined ? (
        <NotMeasured />
      ) : (
        <RiskDot level={riskLevelFromScore(c.mean_toxicity)} label={formatScore(c.mean_toxicity)} />
      ),
  },
];
