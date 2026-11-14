/**
 * Display formatting. The rule that matters here: `null` is not zero.
 *
 * `Metric.value: null`, `PostScores.toxicity: null`, `Engagement.views: null` and any
 * field listed in `NarrativeScorecard.missing[]` mean *not measured on this platform*.
 * Every one of them renders the em dash, never `0`, never a zero-height bar, never an
 * empty gauge. Rendering "not measured" as 0 is the single easiest way to make the
 * whole product lie.
 */

export const NOT_MEASURED = '—';
export const NOT_MEASURED_HINT = 'Not measured on this platform.';
/** Title and aria text for a count that no platform in the view measured. */
export const NOT_MEASURED_LABEL = 'Not measured';

export function isMeasured(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const plain = new Intl.NumberFormat('en-US');

/** Headline counts. Returns the em dash for null -- callers must not pre-coalesce to 0. */
export function formatCount(value: number | null | undefined): string {
  if (!isMeasured(value)) return NOT_MEASURED;
  return Math.abs(value) >= 10_000 ? compact.format(value) : plain.format(value);
}

export function formatExactCount(value: number | null | undefined): string {
  return isMeasured(value) ? plain.format(value) : NOT_MEASURED;
}

/**
 * A 0..1 model score as a percentage. 0 is a real score; null is not.
 *
 * Only for fields the contract declares as 0..1. The composite risk numbers
 * (`AuthorOut.risk_score`, `DomainOut.risk_score`, `NarrativeScorecard.fusion_score`)
 * are 0..100 and must use `formatScore100` -- passing one of those here renders
 * "3320%".
 */
export function formatScore(value: number | null | undefined, digits = 0): string {
  if (!isMeasured(value)) return NOT_MEASURED;
  return `${(value * 100).toFixed(digits)}%`;
}

/** A 0..100 composite risk score, shown on its own scale rather than as a percentage. */
export function formatScore100(value: number | null | undefined, digits = 1): string {
  if (!isMeasured(value)) return NOT_MEASURED;
  return value.toFixed(digits);
}

/** A value already expressed as a percentage (`pct`, `share_pct`, `delta_pct`). */
export function formatPct(value: number | null | undefined, digits = 1): string {
  if (!isMeasured(value)) return NOT_MEASURED;
  return `${value.toFixed(digits)}%`;
}

export function formatDelta(value: number | null | undefined): string | null {
  if (!isMeasured(value)) return null;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatDecimal(value: number | null | undefined, digits = 2): string {
  return isMeasured(value) ? value.toFixed(digits) : NOT_MEASURED;
}

/** Renders a `Metric.value` with its unit, honouring the null contract. */
export function formatMetricValue(
  value: number | null | undefined,
  unit?: string | null,
): string {
  if (!isMeasured(value)) return NOT_MEASURED;
  if (unit === '%') return formatPct(value);
  if (unit === 'score') return formatDecimal(value, 2);
  const base = formatCount(value);
  return unit && unit !== 'count' ? `${base} ${unit}` : base;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!isMeasured(bytes)) return NOT_MEASURED;
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// --- time ------------------------------------------------------------------
// The analyst's timezone is explicit everywhere. `tz` comes from the FilterSpec and
// is rendered next to every timestamp, so a screenshot is never ambiguous about when
// something happened.

function fmt(tz: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: tz });
  } catch {
    return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' });
  }
}

export function formatDateTime(iso: string | null | undefined, tz = 'UTC'): string {
  if (!iso) return NOT_MEASURED;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NOT_MEASURED;
  return fmt(tz, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export function formatDate(iso: string | null | undefined, tz = 'UTC'): string {
  if (!iso) return NOT_MEASURED;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NOT_MEASURED;
  return fmt(tz, { year: 'numeric', month: 'short', day: '2-digit' }).format(d);
}

export function formatTime(iso: string | null | undefined, tz = 'UTC'): string {
  if (!iso) return NOT_MEASURED;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NOT_MEASURED;
  return fmt(tz, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

/** `2026-01-04 – 2026-02-11`, or a single date when both ends match. */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  tz = 'UTC',
): string {
  const a = formatDate(start, tz);
  const b = formatDate(end, tz);
  if (a === NOT_MEASURED && b === NOT_MEASURED) return NOT_MEASURED;
  if (a === b) return a;
  return `${a} – ${b}`;
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.35],
  ['month', 12],
  ['year', Number.POSITIVE_INFINITY],
];

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return NOT_MEASURED;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return NOT_MEASURED;
  let delta = (then - Date.now()) / 1000;
  for (const [unit, span] of RELATIVE_STEPS) {
    if (Math.abs(delta) < span) return rtf.format(Math.round(delta), unit);
    delta /= span;
  }
  return rtf.format(Math.round(delta), 'year');
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!isMeasured(seconds)) return NOT_MEASURED;
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function elapsedSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : (Date.now() - t) / 1000;
}

// --- text ------------------------------------------------------------------

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** `insufficient_evidence` -> `Insufficient evidence`. Used for every backend enum. */
export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return NOT_MEASURED;
  const spaced = value.replace(/[_.]/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function platformLabel(source: string): string {
  const known: Record<string, string> = {
    reddit: 'Reddit',
    mastodon: 'Mastodon',
    news: 'News',
    gdelt: 'GDELT',
    youtube: 'YouTube',
  };
  return known[source] ?? humanizeEnum(source);
}
