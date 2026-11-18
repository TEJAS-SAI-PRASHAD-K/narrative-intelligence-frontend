import { describe, expect, it } from 'vitest';
import { languageCoverage } from '@/components/__fixtures__';
import { hasLayaStamp, misinfoModelOf, mixesMisinfoModels } from './misinfoModel';

const stamped = { misinfo_likelihood: 0.4, scoring_version: 'anomaly=v0.1.0,laya=v0.2.1+x@1a2b' };
const unstamped = { misinfo_likelihood: 0.4, scoring_version: 'phase2:abcdef123456' };

describe('hasLayaStamp', () => {
  it('finds the laya key in a stamp list', () => {
    expect(hasLayaStamp('laya=v0.1.0')).toBe(true);
    expect(hasLayaStamp('misinfo=v1, laya=v0.1.0; emotion=v2')).toBe(true);
  });
  it('rejects look-alikes, empty versions and missing values', () => {
    expect(hasLayaStamp('nonlaya=v1')).toBe(false);
    expect(hasLayaStamp('laya_v2=1')).toBe(false);
    expect(hasLayaStamp('laya=')).toBe(false);
    expect(hasLayaStamp(null)).toBe(false);
    expect(hasLayaStamp(undefined)).toBe(false);
  });
});

describe('misinfoModelOf', () => {
  it('is laya for a stamped Hindi post', () => {
    expect(misinfoModelOf(stamped, 'hi')).toBe('laya');
    expect(misinfoModelOf(stamped, 'hi-IN')).toBe('laya');
  });
  it('is roberta for an unstamped Hindi post and for a stamped English post', () => {
    expect(misinfoModelOf(unstamped, 'hi')).toBe('roberta');
    expect(misinfoModelOf(stamped, 'en')).toBe('roberta');
    expect(misinfoModelOf(stamped, null)).toBe('roberta');
  });
  it('is null when no value was measured', () => {
    expect(misinfoModelOf({ ...stamped, misinfo_likelihood: null }, 'hi')).toBeNull();
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
