import { describe, expect, it } from 'vitest';
import spec from '../../openapi.json';
import { platformLabel } from '@/lib/format';
import { PLATFORMS } from './sources';

describe('PLATFORMS', () => {
  it('matches the source enum in the contract', () => {
    const schemas = spec.components.schemas as unknown as Record<
      string,
      { properties: { source: { enum: string[] } } }
    >;
    expect([...PLATFORMS]).toEqual(schemas.SourceHealth?.properties.source.enum);
  });

  it('includes telegram and labels it without a hand-written entry', () => {
    expect(PLATFORMS).toContain('telegram');
    expect(platformLabel('telegram')).toBe('Telegram');
  });
});
