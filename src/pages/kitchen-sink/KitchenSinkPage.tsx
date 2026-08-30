import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as fx from '@/components/__fixtures__';
import { AiBlock } from '@/components/ai/AiBlock';
import { AiPill } from '@/components/ai/AiPill';
import { CohortsMethodologyNote } from '@/components/cohorts/CohortsPanel';
import { FreshnessBar } from '@/components/freshness/FreshnessBar';
import { KpiCard } from '@/components/kpi/KpiCard';
import { KpiStrip } from '@/components/kpi/KpiStrip';
import { OriginalPost } from '@/components/post/OriginalPost';
import { NotMeasured } from '@/components/risk/NotMeasured';
import { RiskDot } from '@/components/risk/RiskDot';
import { RiskScorecard } from '@/components/risk/RiskScorecard';
import { ScoreExplainer } from '@/components/score/ScoreExplainer';
import {
  EmptyState,
  ErrorState,
  SkeletonCard,
  SkeletonChart,
  SkeletonKpiStrip,
  SkeletonText,
} from '@/components/states';
import { EntityTable } from '@/components/table/EntityTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TruncationBanner } from '@/components/network/TruncationBanner';
import { CompassModule } from '@/components/compass/CompassModule';
import { ApiError } from '@/api/client';

/**
 * Every shared primitive in every state, on one page, with no backend.
 *
 * This is the screenshot that proves the discipline: loaded, loading, empty, error,
 * null-metric, missing-score-component, truncated-graph, AI-edited-by-user. If a
 * state is hard to reach in a live corpus, it is reachable here.
 */
export default function KitchenSinkPage() {
  const [explainerOpen, setExplainerOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Component kitchen sink</h1>
        <p className="text-xs text-muted-foreground">
          Every shared primitive in every state, driven by typed fixtures under{' '}
          <code>src/components/__fixtures__</code>. No API calls happen on this page.
        </p>
        <Link to="/" className="inline-block text-xs text-primary hover:underline">
          ← Back to projects
        </Link>
      </header>

      <Section
        title="KpiStrip / KpiCard"
        note="Fixed order Posts → Engagements → Authors → Sentiment → Emotions. Every (?) renders the backend's definition string verbatim."
      >
        <KpiStrip bundle={fx.kpiBundle} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Labelled label="Measured, with delta">
            <KpiCard metric={fx.metricMeasured} />
          </Labelled>
          <Labelled label="value: null — renders —, never 0">
            <KpiCard metric={fx.metricNull} />
          </Labelled>
          <Labelled label="Drilldown affordance (narrative-scoped mode)">
            <KpiCard metric={fx.metricNoDelta} onDrilldown={() => undefined} />
          </Labelled>
        </div>
      </Section>

      <Section
        title="RiskScorecard"
        note="Six fields, always, in one order. Fields in missing[] render “not measured” — nowhere does the card render 0."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Labelled label="Complete">
            <div className="rounded-lg border border-border bg-card p-3">
              <RiskScorecard scorecard={fx.scorecardComplete} />
            </div>
          </Labelled>
          <Labelled label='missing: ["authenticity", "bot_like", "toxicity"]'>
            <div className="rounded-lg border border-border bg-card p-3">
              <RiskScorecard
                scorecard={fx.scorecardMissing}
                onExplain={() => setExplainerOpen(true)}
              />
            </div>
          </Labelled>
        </div>
      </Section>

      <Section
        title="RiskDot"
        note="Colour AND shape AND text. Print any screenshot in grayscale: the glyph still separates the levels."
      >
        <div className="flex flex-wrap gap-5 rounded-lg border border-border bg-card p-3">
          <RiskDot level="high" />
          <RiskDot level="medium" />
          <RiskDot level="low" />
          <RiskDot level="none" />
          <RiskDot level="high" label="0.91" />
          <span className="text-xs text-muted-foreground">
            Unmeasured value: <NotMeasured />
          </span>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 grayscale">
          <p className="mb-2 text-2xs uppercase tracking-wide text-muted-foreground">
            Same row, forced to grayscale
          </p>
          <div className="flex flex-wrap gap-5">
            <RiskDot level="high" />
            <RiskDot level="medium" />
            <RiskDot level="low" />
            <RiskDot level="none" />
          </div>
        </div>
      </Section>

      <Section
        title="AiPill / AiBlock"
        note="Driven entirely by provenance.generated_by and edited_by_user — never by a hardcoded list of which fields are AI-written."
      >
        <div className="flex flex-wrap gap-3">
          <AiPill provenance={fx.provenanceAi} />
          <AiPill provenance={fx.provenanceEdited} />
          <AiPill provenance={fx.provenanceHeuristic} />
        </div>
        <AiBlock
          title="Narrative summary"
          value={{ text: fx.compassSubstantiated.context, provenance: fx.provenanceAi }}
          onFeedback={() => undefined}
          onRegenerate={() => undefined}
        />
        <AiBlock
          title="Analyst-edited summary"
          value={{ text: 'An analyst rewrote this headline after review.', provenance: fx.provenanceEdited }}
          onFeedback={() => undefined}
        />
        <AiBlock
          title="Generated, but empty"
          value={{ text: null, provenance: fx.provenanceAi }}
        />
      </Section>

      <Section
        title="ScoreExplainer"
        note="The product thesis. Formula, normalisation, value × weight → contribution, and a loud banner when weights were renormalised over a smaller set of signals."
      >
        <Button size="sm" onClick={() => setExplainerOpen(true)}>
          Open the explainer (renormalised weights)
        </Button>
        <ScoreExplainer
          open={explainerOpen}
          onOpenChange={setExplainerOpen}
          explanation={fx.scoreExplanationRenormalized}
          isLoading={false}
          error={null}
          subjectLabel="narrative #1 (fixture)"
        />
      </Section>

      <Section
        title="CompassModule"
        note="Citations rendered inline at their character spans, and the explicit could-not-source state."
      >
        <CompassModule
          context={fx.compassSubstantiated}
          onRegenerate={() => undefined}
          onFeedback={() => undefined}
        />
        <CompassModule
          context={fx.compassInsufficient}
          onRegenerate={() => undefined}
          onFeedback={() => undefined}
        />
      </Section>

      <Section title="FreshnessBar" note="Clustered results are never refreshed silently.">
        <FreshnessBar freshness={fx.freshnessStale} onUpdate={() => undefined} />
        <FreshnessBar
          freshness={{ ...fx.freshnessStale, status: 'running', age_human: '2 minutes ago' }}
          onUpdate={() => undefined}
        />
        <FreshnessBar
          freshness={{
            ...fx.freshnessStale,
            status: 'never_run',
            age_human: 'never',
            narrative_count: 0,
            unclustered_post_count: 4_128,
          }}
          onUpdate={() => undefined}
        />
      </Section>

      <Section
        title="OriginalPost"
        note="Engagement.views: null renders —, not 0. A Reddit post with no view count is not a post nobody saw."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <OriginalPost
            post={fx.postWithNullViews}
            tz="UTC"
            reasons={['coordinated_timing', 'new_domain', 'high_misinfo_likelihood']}
          />
          <OriginalPost post={fx.postUnscored} tz="UTC" />
        </div>
      </Section>

      <Section
        title="TruncationBanner"
        note="A silently truncated graph makes a coordinated cluster look isolated. Never a tooltip."
      >
        <TruncationBanner
          stats={fx.graphStatsTruncated}
          onRaiseLimit={() => undefined}
          onNarrowFilters={() => undefined}
        />
      </Section>

      <Section title="EntityTable" note="Sorting writes the URL; column visibility is a local preference.">
        <EntityTable
          tableId="kitchen-sink"
          caption="Fixture rows demonstrating the table primitive"
          columns={[
            { id: 'name', header: 'Entity', sortKey: 'name', cell: (r) => r.name },
            {
              id: 'count',
              header: 'Posts',
              align: 'right',
              sortKey: 'count',
              cell: (r) => <span className="tabular">{r.count}</span>,
            },
            {
              id: 'risk',
              header: 'Risk',
              cell: (r) => (r.risk === null ? <NotMeasured /> : <RiskDot level="high" label={String(r.risk)} />),
            },
          ]}
          rows={[
            { id: '1', name: '@coastal_watch', count: 412, risk: 0.91 },
            { id: '2', name: '#electionwatch', count: 288, risk: null },
          ]}
          rowKey={(r) => r.id}
          sort="count"
          onSortChange={() => undefined}
        />
      </Section>

      <Section title="Loading states" note="Every async surface ships its skeleton in the same commit as its happy path.">
        <SkeletonKpiStrip />
        <div className="grid gap-3 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonChart />
        </div>
        <SkeletonText lines={4} />
      </Section>

      <Section title="Empty and error states" note="ErrorState always shows the backend's code and request_id.">
        <EmptyState
          title="No narratives match these filters"
          description="Widen the date range or clear a filter chip."
          action={<Button size="sm">Reset all</Button>}
        />
        <ErrorState
          error={
            new ApiError({
              code: 'narrative_not_found',
              message: 'No narrative with that id exists in this project.',
              status: 404,
              requestId: '375576403b4c4d23',
            })
          }
          onRetry={() => undefined}
        />
        <ErrorState
          error={
            new ApiError({
              code: 'unauthorized',
              message: 'Missing X-API-Key header.',
              status: 401,
              requestId: 'a91f0c22b7e4419d',
            })
          }
        />
        <ErrorState
          error={
            new ApiError({
              code: 'network_error',
              message: 'Cannot reach the API at http://localhost:8000. Is the Phase 4 backend running?',
              status: 0,
            })
          }
          onRetry={() => undefined}
        />
      </Section>

      <Section title="Cohort methodology note" note="Rendered verbatim wherever cohorts appear.">
        <CohortsMethodologyNote />
      </Section>

      <Section title="Badges" note="Risk variants resolve to the shared tokens, not to raw hex.">
        <div className="flex flex-wrap gap-2">
          <Badge variant="risk-high">High</Badge>
          <Badge variant="risk-med">Medium</Badge>
          <Badge variant="risk-low">Low</Badge>
          <Badge variant="risk-none">Not measured</Badge>
          <Badge variant="ai">AI</Badge>
          <Badge variant="muted">muted</Badge>
          <Badge variant="outline">outline</Badge>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="border-b border-border pb-1.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-0.5 text-2xs text-muted-foreground">{note}</p>
      </div>
      {children}
    </section>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="font-mono text-2xs text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
