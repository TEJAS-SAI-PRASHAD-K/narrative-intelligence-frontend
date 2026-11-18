import { describe, expect, it } from 'vitest';
import { describeSkipReason } from './skipReasons';

describe('describeSkipReason', () => {
  it.each([
    'misinfo:unsupported_language',
    'misinfo:text_too_short',
    'misinfo:empty_text',
    'laya:no_title',
    'laya:calibrator_missing',
    'stance:no_narrative',
    'stance:no_claim_text',
    'stance:claim_text_too_short',
    'stance:claim_unsupported_language',
    'stance:is_claim',
    'stance:empty_text',
  ])('maps %s to a sentence', (code) => {
    const text = describeSkipReason(code);
    expect(text).not.toBe(code);
    expect(text).toMatch(/\.$/);
  });

  it('explains why a fact-check article has no misinfo score', () => {
    expect(describeSkipReason('misinfo:fact_check_publisher')).toMatch(/fact-checker/);
    expect(describeSkipReason('misinfo:fact_check_publisher')).toMatch(/misinformation score/);
    expect(describeSkipReason('laya:fact_check_publisher')).toMatch(/fact-checker/);
  });

  it('falls back to the bare reason for a module without its own entry', () => {
    expect(describeSkipReason('toxicity:empty_text')).toBe(
      describeSkipReason('misinfo:empty_text'),
    );
  });

  it('shows an unknown code as itself', () => {
    expect(describeSkipReason('misinfo:brand_new_reason')).toBe('misinfo:brand_new_reason');
    expect(describeSkipReason('weird')).toBe('weird');
  });
});
