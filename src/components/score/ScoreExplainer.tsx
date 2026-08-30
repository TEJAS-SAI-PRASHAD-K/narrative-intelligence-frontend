import { AlertTriangle } from 'lucide-react';
import type {
  AuthorScoreExplanation,
  NarrativeScoreExplanation,
  ScoreComponent,
} from '@/api/types';
import { NotMeasured } from '@/components/risk/NotMeasured';
import { RiskDot } from '@/components/risk/RiskDot';
import { riskLevelFromBand } from '@/components/risk/riskLevel';
import { ErrorState, SkeletonText } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { InfoTip } from '@/components/ui/tooltip';
import { formatDateTime, formatDecimal, isMeasured } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Every number is explainable in one click, and this is where the click lands.
 *
 * The formula, the normalisation, each component's value x weight -> contribution,
 * the scoring version, and -- the part that matters most -- an explicit banner when
 * weights were renormalised because a signal was missing. A fusion score computed
 * over five of six signals is a different number from one computed over six, and an
 * analyst who cannot see that is being misled by a number that looks complete.
 *
 * No arithmetic happens here. `contribution` is served; recomputing it in TypeScript
 * would create a second source of truth that will eventually disagree with
 * `app/scoring/fusion.py`.
 */

type Explanation = NarrativeScoreExplanation | AuthorScoreExplanation;

function isNarrative(e: Explanation): e is NarrativeScoreExplanation {
  return 'fusion_score' in e;
}

export function ScoreExplainer({
  open,
  onOpenChange,
  explanation,
  isLoading,
  error,
  subjectLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  explanation: Explanation | undefined;
  isLoading: boolean;
  error: unknown;
  subjectLabel: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby="score-explainer-desc">
        <SheetHeader>
          <SheetTitle>Why this score?</SheetTitle>
          <SheetDescription id="score-explainer-desc">
            Full decomposition for {subjectLabel}, served by the backend.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-4">
          {isLoading && <SkeletonText lines={8} />}
          {Boolean(error) && !isLoading && <ErrorState error={error} />}
          {explanation && !isLoading && <Body explanation={explanation} />}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function Body({ explanation }: { explanation: Explanation }) {
  const narrative = isNarrative(explanation);
  const components: ScoreComponent[] = narrative
    ? explanation.components
    : (explanation.components ?? explanation.top_features);
  const missing = explanation.missing ?? [];
  const renormalized = narrative && explanation.weights_renormalized === true;

  return (
    <>
      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-3">
          {narrative ? (
            <>
              <Headline label="Fusion score" value={explanation.fusion_score} digits={1} suffix=" / 100" />
              <div className="flex items-center gap-1.5">
                <span className="text-2xs uppercase tracking-wide text-muted-foreground">
                  Priority
                </span>
                <RiskDot level={riskLevelFromBand(explanation.priority)} label={explanation.priority} />
              </div>
            </>
          ) : (
            <>
              {/* risk_score shares AuthorOut's 0-100 scale; bot_score is 0-1. */}
              <Headline label="Risk score" value={explanation.risk_score} digits={1} suffix=" / 100" />
              <Headline label="Bot score" value={explanation.bot_score} digits={3} />
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="muted" className="font-mono">
            {explanation.scoring_version}
          </Badge>
          {!narrative && (
            <Badge variant="muted" className="font-mono">
              {explanation.model}
            </Badge>
          )}
          {explanation.computed_at && (
            <Badge variant="muted">computed {formatDateTime(explanation.computed_at, 'UTC')} UTC</Badge>
          )}
        </div>
      </section>

      {/*
        The renormalisation banner. This is the single most important thing on the
        panel: it says out loud that the number was computed over fewer inputs than
        the formula names, and which ones are absent.
      */}
      {renormalized && (
        <div
          role="note"
          className="flex gap-2 rounded-md border border-risk-med/40 bg-risk-med-bg p-2.5"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-risk-med" aria-hidden="true" />
          <div className="space-y-1 text-xs">
            <p className="font-medium text-risk-med">Weights were renormalised</p>
            <p className="text-foreground/90">
              {missing.length > 0 ? (
                <>
                  These signals were not measured for this subject and contributed nothing:{' '}
                  {missing.map((m, i) => (
                    <span key={m}>
                      <code className="rounded bg-background/40 px-1">{m}</code>
                      {i < missing.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                  . The remaining weights were rescaled to sum to 1, so this score is not
                  directly comparable to one computed over the full set.
                </>
              ) : (
                <>
                  At least one signal was unavailable and the remaining weights were rescaled
                  to sum to 1.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {!renormalized && missing.length > 0 && (
        <div role="note" className="rounded-md border border-border bg-surface-sunken p-2.5 text-xs">
          <p className="font-medium">Not measured</p>
          <p className="mt-0.5 text-muted-foreground">
            {missing.join(', ')} — absent from this subject, shown as “—” rather than zero.
          </p>
        </div>
      )}

      {narrative && (
        <section className="space-y-2">
          <Field label="Formula">
            <code className="block whitespace-pre-wrap break-words rounded bg-surface-sunken px-2 py-1.5 font-mono text-2xs">
              {explanation.formula}
            </code>
          </Field>
          <Field label="Normalization">
            <p className="text-xs text-muted-foreground">{explanation.normalization}</p>
          </Field>
        </section>
      )}

      {!narrative && explanation.caveat && (
        <Field label="Caveat">
          <p className="text-xs text-muted-foreground">{explanation.caveat}</p>
        </Field>
      )}

      <section className="space-y-2">
        <h3 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          {narrative ? 'Components' : 'Top features'}
        </h3>
        {components.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            The backend returned no components for this score.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {components.map((c) => (
              <ComponentRow key={c.name} component={c} scale={maxAbsContribution(components)} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function maxAbsContribution(components: ScoreComponent[]): number {
  const values = components
    .map((c) => Math.abs(c.contribution ?? 0))
    .filter((v) => Number.isFinite(v) && v > 0);
  return values.length > 0 ? Math.max(...values) : 1;
}

/**
 * value x weight -> contribution, as a horizontal bar.
 *
 * A component whose `value` or `contribution` is null gets no bar at all -- not a
 * zero-width one. A zero-width bar and a "contributed nothing" bar look identical,
 * and only one of them is true.
 */
function ComponentRow({ component, scale }: { component: ScoreComponent; scale: number }) {
  const hasContribution = isMeasured(component.contribution);
  const width = hasContribution
    ? Math.min(100, (Math.abs(component.contribution as number) / scale) * 100)
    : 0;
  const negative = (component.contribution ?? 0) < 0;

  return (
    <li className="space-y-1">
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs font-medium">{component.name}</span>
        <InfoTip label={`What is ${component.name}?`}>
          <div className="space-y-1.5">
            <p>{component.definition}</p>
            {component.inputs && Object.keys(component.inputs).length > 0 && (
              <pre className="max-h-40 overflow-auto rounded bg-background/50 p-1.5 font-mono text-[10px]">
                {JSON.stringify(component.inputs, null, 2)}
              </pre>
            )}
          </div>
        </InfoTip>
        <span className="ml-auto shrink-0 font-mono text-2xs text-muted-foreground">
          {isMeasured(component.value) ? formatDecimal(component.value, 3) : <NotMeasured />}
          {' × '}
          {formatDecimal(component.weight, 3)}
          {' = '}
          <span className={cn('font-medium', hasContribution ? 'text-foreground' : '')}>
            {hasContribution ? formatDecimal(component.contribution, 3) : <NotMeasured />}
          </span>
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
        {hasContribution ? (
          <div
            className={cn('h-full rounded-full', negative ? 'bg-risk-low' : 'bg-primary')}
            style={{ width: `${width}%` }}
            role="img"
            aria-label={`${component.name} contributes ${formatDecimal(component.contribution, 3)}`}
          />
        ) : (
          // No bar. An unmeasured component must not read as a zero contribution.
          <div className="flex h-full items-center pl-1">
            <span className="text-[8px] uppercase tracking-wide text-muted-foreground">
              not measured
            </span>
          </div>
        )}
      </div>
    </li>
  );
}

function Headline({
  label,
  value,
  digits,
  suffix,
}: {
  label: string;
  value: number | null;
  digits: number;
  /** States the scale, so "86.5" is never mistaken for a fraction. */
  suffix?: string;
}) {
  return (
    <div>
      <span className="block text-2xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold tabular">
        {isMeasured(value) ? (
          <>
            {value.toFixed(digits)}
            {suffix && <span className="text-xs font-normal text-muted-foreground">{suffix}</span>}
          </>
        ) : (
          <NotMeasured />
        )}
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="block text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}
