import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { useDomain, useDomainNarratives, useEnrichDomain } from '@/api/queries/entities';
import type { ScoreComponent } from '@/api/types';
import { NotMeasured } from '@/components/risk/NotMeasured';
import { RiskDot } from '@/components/risk/RiskDot';
import { riskLevelFromBand } from '@/components/risk/riskLevel';
import { ScoreCell } from '@/components/risk/ScoreCell';
import { ScoreExplainer } from '@/components/score/ScoreExplainer';
import { PageShell } from '@/components/page';
import { EmptyState, ErrorState, SkeletonCard, SkeletonText } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useJobs } from '@/jobs/JobStore';
import { useProjectContext } from '@/layout/useProjectContext';
import { formatCount, formatDate, formatDateTime, formatPct, humanizeEnum } from '@/lib/format';
import { useFilters } from '@/lib/useFilters';
import { EnrichmentBadge } from './components/EnrichmentBadge';

/**
 * Domain detail: WHOIS age, hosting country, TLS age, enrichment status, the score
 * `components[]` through <ScoreExplainer>, and the narratives that linked here.
 */
export default function DomainDetailPage() {
  const { domain } = useParams<{ domain: string }>();
  const { projectId, slug } = useProjectContext();
  const { filters } = useFilters(projectId);
  const { toast } = useToast();
  const { track } = useJobs();

  const [explainerOpen, setExplainerOpen] = useState(false);

  const domainQuery = useDomain(domain, projectId);
  const narratives = useDomainNarratives(domain, projectId);
  const enrich = useEnrichDomain();

  async function runEnrichment() {
    if (!domain) return;
    try {
      const accepted = await enrich.mutateAsync({ domain, projectId });
      track(accepted, {
        label: `Enrich ${domain}`,
        href: `/p/${slug}/domains/${encodeURIComponent(domain)}`,
      });
      toast({
        title: 'Enrichment queued',
        description: 'WHOIS, hosting and TLS data refresh when the job finishes.',
      });
    } catch (err) {
      toast({
        title: 'Could not queue enrichment',
        description: err instanceof ApiError ? `${err.message} (${err.code})` : String(err),
        variant: 'error',
      });
    }
  }

  if (domainQuery.isLoading) {
    return (
      <div className="space-y-3 px-4 py-5 lg:px-6">
        <SkeletonText lines={2} />
        <SkeletonCard />
      </div>
    );
  }

  if (domainQuery.error) {
    return (
      <div className="px-4 py-5 lg:px-6">
        <ErrorState
          error={domainQuery.error}
          title="Could not load this domain"
          onRetry={() => void domainQuery.refetch()}
        />
      </div>
    );
  }

  const d = domainQuery.data;
  if (!d) {
    return (
      <div className="px-4 py-5 lg:px-6">
        <EmptyState title="Domain not found in this project" />
      </div>
    );
  }

  /**
   * `DomainOut` carries `components[]` and `scoring_version` but no formula string, so
   * the panel is fed a minimal explanation built from what the contract does return.
   * Nothing is invented: the formula and normalization read as "not provided".
   */
  const explanation = {
    narrative_id: d.domain,
    fusion_score: d.risk_score ?? null,
    priority: (d.risk_band ?? 'low') as 'high' | 'medium' | 'low',
    scoring_version: d.scoring_version ?? 'unknown',
    formula: 'Not provided by /domains/{domain}; only the weighted components are returned.',
    normalization: 'Not provided by /domains/{domain}.',
    components: (d.components ?? []) as ScoreComponent[],
    missing: [],
    weights_renormalized: false,
    computed_at: d.enriched_at ?? null,
  };

  return (
    <PageShell
      breadcrumb={[{ label: 'Domains', to: `/p/${slug}/domains` }, { label: d.domain }]}
      title={d.domain}
      titleSlot={<span className="font-mono">{d.domain}</span>}
      description="One website being linked to from this corpus: how risky it scored, what that score was built from, and who is sharing it."
      meta={
        <>
          {d.risk_band && (
            <RiskDot level={riskLevelFromBand(d.risk_band)} label={humanizeEnum(d.risk_band)} />
          )}
          <EnrichmentBadge status={d.enrichment_status} detail={d.enrichment_detail} />
        </>
      }
      actions={
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void runEnrichment()}
            disabled={enrich.isPending}
          >
            <RefreshCw
              className={enrich.isPending ? 'h-3 w-3 animate-spin' : 'h-3 w-3'}
              aria-hidden="true"
            />
            {enrich.isPending ? 'Queued' : 'Enrich now'}
          </Button>
          {(d.components?.length ?? 0) > 0 && (
            <Button size="sm" variant="outline" onClick={() => setExplainerOpen(true)}>
              Why this score?
            </Button>
          )}
        </>
      }
      bodyClassName="gap-4"
    >
      <section className="card-surface p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
          <Stat
            label="Risk score"
            hint="0-100, not a percentage."
            value={<ScoreCell value={d.risk_score} scale="hundred" />}
          />
          <Stat
            label="Domain age"
            value={
              d.domain_age_days === null || d.domain_age_days === undefined ? (
                <NotMeasured reason="WHOIS has not been fetched for this domain." />
              ) : (
                <span className="tabular">{formatCount(d.domain_age_days)} days</span>
              )
            }
          />
          <Stat
            label="WHOIS created"
            value={
              d.whois_created_at ? (
                <span className="tabular">{formatDate(d.whois_created_at, filters.tz)}</span>
              ) : (
                <NotMeasured />
              )
            }
          />
          <Stat
            label="Registrar"
            value={d.registrar ?? <NotMeasured reason="Registrar not disclosed or not fetched." />}
          />
          <Stat label="Hosting country" value={d.hosting_country ?? <NotMeasured />} />
          <Stat
            label="TLS cert age"
            value={
              d.tls_cert_age_days === null || d.tls_cert_age_days === undefined ? (
                <NotMeasured />
              ) : (
                <span className="tabular">{formatCount(d.tls_cert_age_days)} days</span>
              )
            }
          />
          <Stat
            label="Link velocity"
            value={
              d.link_velocity === null || d.link_velocity === undefined ? (
                <NotMeasured />
              ) : (
                <span className="tabular">{d.link_velocity.toFixed(2)}</span>
              )
            }
          />
          <Stat
            label="Sharer bot ratio"
            value={<ScoreCell value={d.sharing_author_bot_ratio} scale="unit" />}
          />
          <Stat
            label="Posts"
            value={<span className="tabular">{formatCount(d.post_count)}</span>}
          />
          <Stat
            label="Authors"
            value={<span className="tabular">{formatCount(d.author_count)}</span>}
          />
          <Stat
            label="Narratives"
            value={<span className="tabular">{formatCount(d.narrative_count)}</span>}
          />
          <Stat
            label="Enriched at"
            value={
              d.enriched_at ? (
                <span className="tabular">{formatDateTime(d.enriched_at, filters.tz)}</span>
              ) : (
                <NotMeasured reason="This domain has never been enriched." />
              )
            }
          />
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Linked narratives
        </h2>
        {narratives.isLoading && <SkeletonText lines={4} />}
        {Boolean(narratives.error) && (
          <ErrorState error={narratives.error} compact onRetry={() => void narratives.refetch()} />
        )}
        {!narratives.isLoading && (narratives.data?.length ?? 0) === 0 && (
          <EmptyState title="No narratives link to this domain in the current window" />
        )}
        <ul className="space-y-1.5">
          {(narratives.data ?? []).map((link) => (
            <li
              key={link.narrative_id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md border border-border bg-card px-3 py-2"
            >
              <Link
                to={`/p/${slug}/narratives/${link.narrative_id}`}
                className="min-w-0 flex-1 truncate rounded-sm text-xs text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {link.title}
              </Link>
              <Badge variant="muted">{formatPct(link.share_pct)} of its posts</Badge>
              <span className="tabular text-2xs text-muted-foreground">
                {formatCount(link.post_count)} posts · {formatDate(link.first_seen, filters.tz)} –{' '}
                {formatDate(link.last_seen, filters.tz)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <ScoreExplainer
        open={explainerOpen}
        onOpenChange={setExplainerOpen}
        explanation={explanation}
        isLoading={false}
        error={null}
        subjectLabel={d.domain}
      />
    </PageShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-wide text-muted-foreground" title={hint}>
        {label}
      </dt>
      <dd className="mt-0.5 text-xs">{value}</dd>
    </div>
  );
}
