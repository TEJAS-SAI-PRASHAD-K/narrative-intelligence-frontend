import { describe, expect, it } from 'vitest';
import { engagementLabels } from './engagement';

describe('engagementLabels', () => {
  it('renames Telegram counters to the platform terms', () => {
    expect(engagementLabels('telegram', 'shares').label).toBe('Forwards');
    expect(engagementLabels('telegram', 'likes').label).toBe('Reactions');
  });

  it('falls back to the generic labels for an unknown platform', () => {
    expect(engagementLabels('somewhere_new', 'shares').label).toBe('Shares');
    expect(engagementLabels('somewhere_new', 'views').nullReason).toMatch(/does not report/);
  });
});
