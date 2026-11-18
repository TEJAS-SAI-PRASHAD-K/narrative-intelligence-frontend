import { describe, expect, it } from 'vitest';
import { languageCoverage, postHindiLaya } from '@/components/__fixtures__';
import { layaRan, misinfoModelOf, mixesMisinfoModels } from './misinfoModel';

const sv = (scoring_version: string | null, model_versions?: Record<string, string> | null) => ({
  misinfo_likelihood: 0.4,
  scoring_version,
  model_versions,
});
const legacyLaya = 'anomaly=v0.1.0,laya=v0.2.1+x@1a2b';
const legacyNone = 'phase2:abcdef123456';

describe('layaRan', () => {
  it('reads the laya key of the map', () => {
    expect(layaRan(sv(null, { laya: 'v0.2.1+finetuned:d+m@1a2b' }))).toBe(true);
    expect(layaRan(sv(null, { misinfo: 'v1' }))).toBe(false);
  });
  it('ignores an empty laya stamp and inherited keys', () => {
    expect(layaRan(sv(null, { laya: '' }))).toBe(false);
    expect(layaRan(sv(legacyLaya, { toString: 'x' }))).toBe(false);
  });
  it('does not fall back to the stamp when the map names modules', () => {
    expect(layaRan(sv(legacyLaya, { misinfo: 'v1' }))).toBe(false);
  });
  it('falls back to the stamp when the map is null, absent or empty', () => {
    expect(layaRan(sv('laya=v0.1.0', null))).toBe(true);
    expect(layaRan(sv('laya=v0.1.0'))).toBe(true);
    expect(layaRan(sv('laya=v0.1.0', {}))).toBe(true);
    expect(layaRan(sv('misinfo=v1, laya=v0.1.0; emotion=v2'))).toBe(true);
  });
  it('rejects look-alikes, empty versions and missing values in the fallback', () => {
    expect(layaRan(sv('nonlaya=v1'))).toBe(false);
    expect(layaRan(sv('laya_v2=1'))).toBe(false);
    expect(layaRan(sv('laya='))).toBe(false);
    expect(layaRan(sv(null))).toBe(false);
    expect(layaRan(null)).toBe(false);
    expect(layaRan(undefined)).toBe(false);
  });
});

describe('misinfoModelOf', () => {
  it('is laya for a Hindi post whose map has a laya key', () => {
    expect(misinfoModelOf(postHindiLaya.scores, postHindiLaya.lang)).toBe('laya');
    const scores = sv(legacyNone, { laya: 'v0.2.1+x@1a2b', anomaly: 'v0.1.0' });
    expect(misinfoModelOf(scores, 'hi')).toBe('laya');
  });
  it('accepts every spelling of the Hindi language code', () => {
    const scores = sv(null, { laya: 'v1' });
    for (const lang of ['hi', 'HI', 'hi-IN', 'hi_IN', ' hi ']) {
      expect(misinfoModelOf(scores, lang)).toBe('laya');
    }
  });
  it('is laya for a Hindi post with both keys', () => {
    expect(misinfoModelOf(sv(null, { laya: 'v1', misinfo: 'v2' }), 'hi')).toBe('laya');
  });
  it('is roberta for a post with a misinfo key', () => {
    expect(misinfoModelOf(sv(null, { misinfo: 'v0.3.0+3f9a1c2e' }), 'hi')).toBe('roberta');
    expect(misinfoModelOf(sv(null, { misinfo: 'v1' }), 'en')).toBe('roberta');
    expect(misinfoModelOf(sv(null, { laya: 'v1', misinfo: 'v2' }), 'en')).toBe('roberta');
  });
  it('is unknown for a non-Hindi post with only a laya key', () => {
    expect(misinfoModelOf(sv(null, { laya: 'v1' }), 'en')).toBe('unknown');
    expect(misinfoModelOf(sv(null, { laya: 'v1' }), 'mr')).toBe('unknown');
    expect(misinfoModelOf(sv(null, { laya: 'v1' }), null)).toBe('unknown');
  });
  it('is unknown when the map names neither model', () => {
    expect(misinfoModelOf(sv(legacyLaya, { toxicity: 'v1' }), 'hi')).toBe('unknown');
    expect(misinfoModelOf(sv(legacyNone, { toxicity: 'v1' }), 'en')).toBe('unknown');
  });
  it('treats an empty stamp as no stamp', () => {
    expect(misinfoModelOf(sv(null, { laya: '' }), 'hi')).toBe('unknown');
    expect(misinfoModelOf(sv(null, { laya: '', misinfo: 'v1' }), 'hi')).toBe('roberta');
  });
  it('falls back to the scoring_version stamp when the map is null, absent or empty', () => {
    expect(misinfoModelOf(sv(legacyLaya, null), 'hi')).toBe('laya');
    expect(misinfoModelOf(sv(legacyLaya), 'hi')).toBe('laya');
    expect(misinfoModelOf(sv(legacyLaya, {}), 'hi')).toBe('laya');
    expect(misinfoModelOf(sv(legacyNone, null), 'hi')).toBe('roberta');
    expect(misinfoModelOf(sv(legacyLaya, null), 'en')).toBe('roberta');
  });
  it('keeps the English default when neither the map nor the stamp says anything', () => {
    expect(misinfoModelOf(sv(null, null), 'hi')).toBe('roberta');
    expect(misinfoModelOf(sv(null), 'hi')).toBe('roberta');
    expect(misinfoModelOf(sv(null, {}), 'en')).toBe('roberta');
  });
  it('is null when no value was measured', () => {
    const none = { ...sv(null, { laya: 'v1' }), misinfo_likelihood: null };
    expect(misinfoModelOf(none, 'hi')).toBeNull();
    expect(misinfoModelOf({ ...none, misinfo_likelihood: undefined }, 'hi')).toBeNull();
    expect(misinfoModelOf(null, 'hi')).toBeNull();
  });
});

describe('mixesMisinfoModels', () => {
  it('is true when hi and en both have scored misinfo', () => {
    expect(mixesMisinfoModels(languageCoverage)).toBe(true);
  });
  it('is false for one language, no coverage, or an unscored hi', () => {
    expect(mixesMisinfoModels(languageCoverage.filter((e) => e.lang === 'en'))).toBe(false);
    expect(mixesMisinfoModels(null)).toBe(false);
    expect(
      mixesMisinfoModels(
        languageCoverage.map((e) => (e.lang === 'hi' ? { ...e, scored: { misinfo: 0 } } : e)),
      ),
    ).toBe(false);
  });
});
