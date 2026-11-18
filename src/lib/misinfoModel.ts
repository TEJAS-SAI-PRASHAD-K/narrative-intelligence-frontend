import type { LanguageCoverage, PostScores } from '@/api/types';

export type MisinfoModel = 'laya' | 'roberta';

/** Why a Laya value is not comparable with an English one, shown beside every Laya chip. */
export const LAYA_MISINFO_NOTE =
  'Scored by Laya, a separate multilingual model, on the post title only. Its calibrator was fitted on English labels, so this value is a rank among Hindi posts and is not comparable with English misinfo values.';

/** Shown where a misinfo aggregate spans Hindi and English posts. */
export const MIXED_MISINFO_NOTE =
  'The misinfo figures combine two models: roberta-base for English and Laya for Hindi. The values are not comparable across the two languages.';

/**
 * Fallback only: the `laya=<version>` entry in a `scoring_version` that is a comma,
 * semicolon or whitespace separated list of `module=version` stamps. Matches the key
 * exactly, so `nonlaya=` and `laya_v2=` do not count, and requires a non-empty version.
 */
const LAYA_STAMP = /(?:^|[\s,;])laya=[^\s,;]+/i;

type StampSource = Pick<PostScores, 'scoring_version'> &
  Partial<Pick<PostScores, 'model_versions'>>;

/**
 * True when the row says the Laya module ran. `model_versions` is the source of truth:
 * a `laya` key means Laya ran. The `scoring_version` parse is a fallback for rows from a
 * backend that does not send the map.
 *
 * A map that exists but has no `laya` key is an answer ("Laya did not run"), so this does
 * not fall back to the stamp then. Only a null or absent map falls back.
 */
export function hasLayaStamp(scores: StampSource | null | undefined): boolean {
  if (!scores) return false;
  const versions = scores.model_versions;
  if (versions !== null && versions !== undefined) return 'laya' in versions;
  const sv = scores.scoring_version;
  return typeof sv === 'string' && LAYA_STAMP.test(sv);
}

function isHindi(lang: string | null | undefined): boolean {
  if (typeof lang !== 'string') return false;
  const primary = lang.trim().toLowerCase().split(/[-_]/)[0];
  return primary === 'hi';
}

/**
 * Which model produced a post's `misinfo_likelihood`, or `null` when no value was
 * measured (a missing value has no producer).
 *
 * Laya only scores Hindi, and the stamp on a row says the Laya module ran, not that
 * this value came from it, so the rule needs both: Hindi language and a Laya stamp (see
 * `hasLayaStamp`). Everything else, including a `misinfo` key, is the English roberta-base
 * classifier. A post with neither key keeps this default.
 */
export function misinfoModelOf(
  scores: (Pick<PostScores, 'misinfo_likelihood'> & StampSource) | null | undefined,
  lang: string | null | undefined,
): MisinfoModel | null {
  if (!scores) return null;
  if (scores.misinfo_likelihood === null || scores.misinfo_likelihood === undefined) return null;
  return isHindi(lang) && hasLayaStamp(scores) ? 'laya' : 'roberta';
}

function primaryLang(lang: string | null): string | null {
  return lang === null ? null : (lang.trim().toLowerCase().split(/[-_]/)[0] ?? null);
}

function misinfoScored(coverage: readonly LanguageCoverage[], code: string): boolean {
  return coverage.some(
    (entry) => primaryLang(entry.lang) === code && (entry.scored['misinfo'] ?? 0) > 0,
  );
}

/** True when Hindi and English both have scored misinfo values, so an aggregate mixes models. */
export function mixesMisinfoModels(
  coverage: readonly LanguageCoverage[] | null | undefined,
): boolean {
  if (!coverage) return false;
  return misinfoScored(coverage, 'hi') && misinfoScored(coverage, 'en');
}
