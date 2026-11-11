import type { LanguageCoverage } from '@/api/types';

/** Scoring modules in the order the backend documents them. */
const KNOWN_MODULES = ['toxicity', 'anomaly', 'misinfo', 'stance', 'sentiment', 'emotion'] as const;

export interface CoverageCell {
  module: string;
  /** `null` when the response has no entry for this module: not reported, which is not zero. */
  scored: number | null;
  total: number;
}

export interface CoverageRow {
  /** `null` groups records that carry no language. */
  lang: string | null;
  total: number;
  cells: CoverageCell[];
}

/**
 * The module columns to show: the known ones first, then any module the backend added
 * that this build does not know about, so a new scorer appears instead of vanishing.
 */
export function coverageModules(entries: readonly LanguageCoverage[]): string[] {
  const extra = new Set<string>();
  for (const entry of entries) {
    for (const key of Object.keys(entry.scored)) {
      if (!(KNOWN_MODULES as readonly string[]).includes(key)) extra.add(key);
    }
  }
  return [...KNOWN_MODULES, ...[...extra].sort()];
}

export function coverageRows(entries: readonly LanguageCoverage[]): CoverageRow[] {
  const modules = coverageModules(entries);
  return entries.map((entry) => ({
    lang: entry.lang,
    total: entry.total,
    cells: modules.map((module) => ({
      module,
      scored: Object.prototype.hasOwnProperty.call(entry.scored, module)
        ? (entry.scored[module] ?? null)
        : null,
      total: entry.total,
    })),
  }));
}

/** "Hindi (hi)" when the runtime knows the code, the bare code otherwise. */
export function languageLabel(lang: string | null): string {
  if (lang === null || lang === '') return 'No language';
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'language' }).of(lang);
    return name && name !== lang ? `${name} (${lang})` : lang;
  } catch {
    // An invalid code throws RangeError; the stored code is still the honest label.
    return lang;
  }
}
