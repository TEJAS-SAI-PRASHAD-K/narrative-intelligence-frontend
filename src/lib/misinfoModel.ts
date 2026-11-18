import type { LanguageCoverage, PostScores } from '@/api/types';

export type MisinfoModel = 'laya' | 'roberta' | 'unknown';

/** Why a Laya value is not comparable with an English one, shown beside every Laya chip. */
export const LAYA_MISINFO_NOTE =
  'Scored by Laya, a separate multilingual model, on the post title only. Its calibrator was fitted on English labels, so this value is a rank among Hindi posts and is not comparable with English misinfo values.';

/** Why a misinfo value has no model name: the row has a stamp map that names neither model. */
export const UNKNOWN_MISINFO_NOTE =
  'The API does not state which model produced this value, so it is not labelled and is not comparable with values from either model.';

/** Shown where a misinfo aggregate spans Hindi and English posts. */
export const MIXED_MISINFO_NOTE =
  'The misinfo figures combine two models: roberta-base for English and Laya for Hindi. The values are not comparable across the two languages.';

/**
 * The `laya=<version>` entry in a `scoring_version` that is a comma, semicolon or
 * whitespace separated list of `module=version` stamps. Matches the key exactly, so
 * `nonlaya=` and `laya_v2=` do not count, and requires a non-empty version.
 *
 * Current backend versions do not emit `laya=` in `scoring_version`. This parse only
 * serves old exports that predate `model_versions`.
 */
const LAYA_STAMP = /(?:^|[\s,;])laya=[^\s,;]+/i;

type StampSource = Pick<PostScores, 'scoring_version' | 'model_versions'>;

/** The map when it names at least one module. An empty map says nothing, like a null one. */
function stampMap(scores: StampSource): Record<string, string> | null {
  const map = scores.model_versions;
  return map && Object.keys(map).length > 0 ? map : null;
}

/** True when the map has an own key with a non-empty stamp. */
function hasStamp(map: Record<string, string>, key: string): boolean {
  return Object.hasOwn(map, key) && Boolean(map[key]);
}

/** Legacy check: the Laya entry in `scoring_version`. */
function legacyLayaRan(scoringVersion: string | null | undefined): boolean {
  return typeof scoringVersion === 'string' && LAYA_STAMP.test(scoringVersion);
}

/**
 * True when the row says the Laya module ran. A non-empty map is the source of truth: a
 * non-empty `laya` stamp means it ran. Only a null, absent or empty map falls back to the
 * `scoring_version` parse. A map that names modules but not Laya means Laya did not run,
 * so the stamp is not read then.
 */
export function layaRan(scores: StampSource | null | undefined): boolean {
  if (!scores) return false;
  const map = stampMap(scores);
  return map ? hasStamp(map, 'laya') : legacyLayaRan(scores.scoring_version);
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
 * Laya only scores Hindi, and a stamp says the Laya module ran, not that this value came
 * from it, so `laya` needs both: Hindi language and a Laya stamp. With a non-empty
 * `model_versions` map:
 * - a Hindi post with a `laya` stamp is `laya`, also when `misinfo` is stamped too
 * - a post with a `misinfo` stamp is `roberta`
 * - anything else is `unknown`: the API names neither producer and this code does not
 *   guess. This includes a non-Hindi post with only a `laya` stamp.
 *
 * With a null, absent or empty map, the old rule applies: Hindi with a `laya=` stamp in
 * `scoring_version` is `laya`, everything else is `roberta`.
 */
export function misinfoModelOf(
  scores: (Pick<PostScores, 'misinfo_likelihood'> & StampSource) | null | undefined,
  lang: string | null | undefined,
): MisinfoModel | null {
  if (!scores) return null;
  if (scores.misinfo_likelihood === null || scores.misinfo_likelihood === undefined) return null;
  const hindi = isHindi(lang);
  const map = stampMap(scores);
  if (!map) return hindi && legacyLayaRan(scores.scoring_version) ? 'laya' : 'roberta';
  if (hindi && hasStamp(map, 'laya')) return 'laya';
  return hasStamp(map, 'misinfo') ? 'roberta' : 'unknown';
}

function primaryLang(lang: string | null): string | null {
  return lang === null ? null : (lang.trim().toLowerCase().split(/[-_]/)[0] ?? null);
}

function misinfoScored(coverage: readonly LanguageCoverage[], code: string): boolean {
  return coverage.some(
    (entry) => primaryLang(entry.lang) === code && (entry.scored['misinfo'] ?? 0) > 0,
  );
}

/**
 * True when Hindi and English both have scored misinfo values, so an aggregate mixes models.
 * This infers the mix from language coverage because the API has no aggregate
 * `model_versions` map to read.
 */
export function mixesMisinfoModels(
  coverage: readonly LanguageCoverage[] | null | undefined,
): boolean {
  if (!coverage) return false;
  return misinfoScored(coverage, 'hi') && misinfoScored(coverage, 'en');
}
