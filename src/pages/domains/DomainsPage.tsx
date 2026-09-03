import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDomains } from '@/api/queries/entities';
import type { DomainOut } from '@/api/types';
import { FilterBar } from '@/components/filters/FilterBar';
import { PageShell } from '@/components/page';
import { NotMeasured } from '@/components/risk/NotMeasured';
import { RiskDot } from '@/components/risk/RiskDot';
import { riskLevelFromBand } from '@/components/risk/riskLevel';
import { ScoreCell } from '@/components/risk/ScoreCell';
import { EntityTable, type Column } from '@/components/table/EntityTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjectContext } from '@/layout/useProjectContext';
import { formatCount, formatDate, formatDecimal, humanizeEnum } from '@/lib/format';
import { useFilters } from '@/lib/useFilters';
import { EnrichmentBadge } from './components/EnrichmentBadge';

const SORTS = [
  { value: 'risk', label: 'Risk score' },
  { value: 'posts', label: 'Post count' },
  { value: 'recent', label: 'Most recent' },
];

const LIST_DEFAULTS = { sort: 'risk', limit: 100 } as const;

/**
 * 4.7 Domain Risk. Sorted by `risk_score`, with `risk_band` badges in the same visual
 * language as narrative risk -- the same tokens, the same glyphs, so "high" means the
 * same thing here as it does on the feed.
 */
export default function DomainsPage() {
  const { projectId, slug } = useProjectContext();
  const navigate = useNavigate();
  const { filters, list, patchFilters, resetFilters, setList } = useFilters(
    projectId,
    LIST_DEFAULTS,
  );
  const [selected, setSelected] = useState<string | null>(null);

  const domains = useDomains(filters, list);
  const rows = useMemo(() => domains.data?.pages.flatMap((p) => p.items) ?? [], [domains.data]);

  const columns: Column<DomainOut>[] = [
    {
      id: 'domain',
      header: 'Domain',
      width: '18rem',
      cell: (d) => <span className="truncate font-mono text-xs">{d.domain}</span>,
    },
    {
      id: 'risk',
      header: 'Risk',
      sortKey: 'risk',
      headerHint: 'DomainOut.risk_score is 0-100, not a percentage.',
      cell: (d) => (
        <div className="flex items-center gap-2">
          <ScoreCell value={d.risk_score} scale="hundred" />
          {d.risk_band && (
            <RiskDot level={riskLevelFromBand(d.risk_band)} label={humanizeEnum(d.risk_band)} />
          )}
        </div>
      ),
    },
    {
      id: 'enrichment',
      header: 'Enrichment',
      cell: (d) => <EnrichmentBadge status={d.enrichment_status} detail={d.enrichment_detail} />,
    },
    {
      id: 'posts',
      header: 'Posts',
      align: 'right',
      sortKey: 'posts',
      cell: (d) => <span className="tabular">{formatCount(d.post_count)}</span>,
    },
    {
      id: 'narratives',
      header: 'Narratives',
      align: 'right',
      cell: (d) => <span className="tabular">{formatCount(d.narrative_count)}</span>,
    },
    {
      id: 'authors',
      header: 'Authors',
      align: 'right',
      cell: (d) => <span className="tabular">{formatCount(d.author_count)}</span>,
    },
    {
      id: 'age',
      header: 'Domain age',
      headerHint:
        'Days since WHOIS registration. A very new domain behind a viral claim is a signal.',
      cell: (d) =>
        d.domain_age_days === null || d.domain_age_days === undefined ? (
          <NotMeasured reason="WHOIS has not been fetched for this domain." />
        ) : (
          <span className="tabular">{formatCount(d.domain_age_days)} d</span>
        ),
    },
    {
      id: 'country',
      header: 'Hosting',
      cell: (d) =>
        d.hosting_country ? (
          <Badge variant="muted">{d.hosting_country}</Badge>
        ) : (
          <NotMeasured reason="Hosting country not resolved." />
        ),
    },
    {
      id: 'velocity',
      header: 'Link velocity',
      align: 'right',
      defaultHidden: true,
      cell: (d) => <span className="tabular">{formatDecimal(d.link_velocity, 2)}</span>,
    },
    {
      id: 'bot_ratio',
      header: 'Sharer bot ratio',
      defaultHidden: true,
      cell: (d) => <ScoreCell value={d.sharing_author_bot_ratio} scale="unit" />,
    },
    {
      id: 'tls',
      header: 'TLS cert age',
      defaultHidden: true,
      cell: (d) =>
        d.tls_cert_age_days === null || d.tls_cert_age_days === undefined ? (
          <NotMeasured />
        ) : (
          <span className="tabular">{formatCount(d.tls_cert_age_days)} d</span>
        ),
    },
    {
      id: 'last_seen',
      header: 'Last seen',
      defaultHidden: true,
      cell: (d) => <span className="tabular">{formatDate(d.last_seen, filters.tz)}</span>,
    },
  ];

  return (
    <PageShell
      title="Domain risk"
      description="The websites being linked to from this corpus, scored for how risky each source is. Select a domain to see who is sharing it and why it scored as it did."
      filterBar={
        <FilterBar filters={filters} onChange={patchFilters} onReset={resetFilters}>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="domain-sort" className="whitespace-nowrap">
              Sort
            </Label>
            <Select
              value={list.sort ?? 'risk'}
              onValueChange={(v) => setList({ sort: v, cursor: undefined })}
            >
              <SelectTrigger id="domain-sort" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FilterBar>
      }
    >
      <div className="space-y-4">
        <EntityTable
          tableId="domains"
          caption="Domains ranked by risk score"
          columns={columns}
          rows={rows}
          rowKey={(d) => d.domain}
          isLoading={domains.isLoading}
          error={domains.error}
          onRetry={() => void domains.refetch()}
          sort={list.sort}
          onSortChange={(sort) => setList({ sort, cursor: undefined })}
          onRowClick={(d) => {
            setSelected(d.domain);
            navigate(`/p/${slug}/domains/${encodeURIComponent(d.domain)}`);
          }}
          selectedKey={selected ?? undefined}
          emptyTitle="No domains match these filters"
          emptyDescription="Domains are extracted from post URLs during ingest."
          maxHeight="calc(100vh - 16rem)"
          footer={
            domains.hasNextPage ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void domains.fetchNextPage()}
                disabled={domains.isFetchingNextPage}
              >
                {domains.isFetchingNextPage ? 'Loading…' : 'Load more domains'}
              </Button>
            ) : (
              <p className="text-2xs text-muted-foreground">
                {formatCount(rows.length)} domain{rows.length === 1 ? '' : 's'} — complete for these
                filters.
              </p>
            )
          }
        />
      </div>
    </PageShell>
  );
}
