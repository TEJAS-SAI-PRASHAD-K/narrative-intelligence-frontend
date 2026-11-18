import { describe, expect, it } from 'vitest';
import { languageCoverage } from '@/components/__fixtures__';
import { hasLayaStamp, misinfoModelOf, mixesMisinfoModels } from './misinfoModel';

const sv = (scoring_version: string | null, model_versions?: Record<string, string> | null) => ({
  misinfo_likelihood: 0.4,
  scoring_version,
  model_versions,
});
const legacyLaya = 'anomaly=v0.1.0,laya=v0.2.1+x@1a2b';
const legacyNone = 'phase2:abcdef123456';

describe('hasLayaStamp', () => {
  it('reads the laya key of the map', () => {
    expect(hasLayaStamp(sv(null, { laya: 'v0.2.1+finetuned:d+m@1a2b' }))).toBe(true);
    expect(hasLayaStamp(sv(null, { misinfo: 'v1' }))).toBe(false);
  });
  it('does not fall back to the stamp when the map exists', () => {
    expect(hasLayaStamp(sv(legacyLaya, { misinfo: 'v1' }))).toBe(false);
    expect(hasLayaStamp(sv(legacyLaya, {}))).toBe(false);
  });
  it('falls back to the stamp when the map is null or absent', () => {
    expect(hasLayaStamp(sv('laya=v0.1.0', null))).toBe(true);
    expect(hasLayaStamp(sv('laya=v0.1.0'))).toBe(true);
    expect(hasLayaStamp(sv('misinfo=v1, laya=v0.1.0; emotion=v2'))).toBe(true);
  });
  it('rejects look-alikes, empty versions and missing values in the fallback', () => {
    expect(hasLayaStamp(sv('nonlaya=v1'))).toBe(false);
    expect(hasLayaStamp(sv('laya_v2=1'))).toBe(false);
    expect(hasLayaStamp(sv('laya='))).toBe(false);
    expect(hasLayaStamp(sv(null))).toBe(false);
    expect(hasLayaStamp(null)).toBe(false);
    expect(hasLayaStamp(undefined)).toBe(false);
  });
});

describe('misinfoModelOf', () => {
  it('is laya for a Hindi post whose map has a laya key', () => {
    const scores = sv(legacyNone, { laya: 'v0.2.1+x@1a2b', anomaly: 'v0.1.0' });
    expect(misinfoModelOf(scores, 'hi')).toBe('laya');
    expect(misinfoModelOf(scores, 'hi-IN')).toBe('laya');
  });
  it('is roberta for a Hindi post whose map has a misinfo key', () => {
    expect(misinfoModelOf(sv(null, { misinfo: 'v0.3.0+3f9a1c2e' }), 'hi')).toBe('roberta');
  });
  it('is roberta for an English post, whatever the map holds', () => {
    expect(misinfoModelOf(sv(null, { laya: 'v1' }), 'en')).toBe('roberta');
    expect(misinfoModelOf(sv(null, { misinfo: 'v1' }), 'en')).toBe('roberta');
    expect(misinfoModelOf(sv(null, { laya: 'v1' }), null)).toBe('roberta');
  });
  it('falls back to the scoring_version stamp when the map is null or absent', () => {
    expect(misinfoModelOf(sv(legacyLaya, null), 'hi')).toBe('laya');
    expect(misinfoModelOf(sv(legacyLaya), 'hi')).toBe('laya');
    expect(misinfoModelOf(sv(legacyNone, null), 'hi')).toBe('roberta');
    expect(misinfoModelOf(sv(legacyLaya, null), 'en')).toBe('roberta');
  });
  it('does not read the stamp when the map exists without a laya key', () => {
    expect(misinfoModelOf(sv(legacyLaya, { toxicity: 'v1' }), 'hi')).toBe('roberta');
    expect(misinfoModelOf(sv(legacyLaya, {}), 'hi')).toBe('roberta');
  });
  it('is roberta when neither the map nor the stamp names a model', () => {
    expect(misinfoModelOf(sv(null, null), 'hi')).toBe('roberta');
    expect(misinfoModelOf(sv(null), 'hi')).toBe('roberta');
  });
  it('is null when no value was measured', () => {
    expect(
      misinfoModelOf({ ...sv(legacyLaya, { laya: 'v1' }), misinfo_likelihood: null }, 'hi'),
    ).toBeNull();
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
