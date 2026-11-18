import { describe, expect, it } from 'vitest';
import {
  compassSubstantiated,
  freshnessStale,
  provenanceAi,
  readOnlyKey,
  writeKey,
} from '@/components/__fixtures__';
import { AiBlock } from '@/components/ai/AiBlock';
import { CompassModule } from '@/components/compass/CompassModule';
import { FreshnessBar } from '@/components/freshness/FreshnessBar';
import { renderHtml } from '@/test/renderHtml';
import { writeDisabledReason } from './writeAccess';

/** The attribute, not the `disabled:` utility classes every button carries. */
const DISABLED = / disabled(="")?[ >]/;

function buttonTag(html: string, label: string): string {
  const tags = html.match(/<button[^>]*>[^]*?<\/button>/g) ?? [];
  const tag = tags.find((t) => t.includes(label));
  if (!tag) throw new Error(`no button labelled ${label}`);
  return tag.match(/<button[^>]*>/)![0];
}

describe('writeDisabledReason', () => {
  it('names the missing scope for a read-only key', () => {
    const reason = writeDisabledReason(readOnlyKey);
    expect(reason).toContain('"write"');
    expect(reason).toContain('read');
  });

  it('is undefined for a key that can write', () => {
    expect(writeDisabledReason(writeKey)).toBeUndefined();
  });

  it('is undefined while scopes are unknown (loading or failed)', () => {
    expect(writeDisabledReason(undefined)).toBeUndefined();
  });
});

const aiGenerated = { text: 'A summary.', provenance: provenanceAi };

describe('gated write controls', () => {
  const reason = writeDisabledReason(readOnlyKey);

  it('disables Update Now and wraps it in a focusable gate for a read-only key', () => {
    const html = renderHtml(
      <FreshnessBar
        freshness={freshnessStale}
        onUpdate={() => undefined}
        writeDisabledReason={reason}
      />,
    );
    expect(buttonTag(html, 'Update Now')).toMatch(DISABLED);
    expect(html).toContain('data-write-gate');
  });

  it('keeps Update Now enabled with no reason', () => {
    const html = renderHtml(<FreshnessBar freshness={freshnessStale} onUpdate={() => undefined} />);
    expect(buttonTag(html, 'Update Now')).not.toMatch(DISABLED);
    expect(html).not.toContain('data-write-gate');
  });

  it('disables Regenerate on the Compass module', () => {
    const html = renderHtml(
      <CompassModule
        context={compassSubstantiated}
        onRegenerate={() => undefined}
        onFeedback={() => undefined}
        writeDisabledReason={reason}
      />,
    );
    expect(buttonTag(html, 'Regenerate')).toMatch(DISABLED);
  });

  it('disables Regenerate on an AI block, and not without a reason', () => {
    const gated = renderHtml(
      <AiBlock value={aiGenerated} onRegenerate={() => undefined} writeDisabledReason={reason} />,
    );
    expect(buttonTag(gated, 'Regenerate')).toMatch(DISABLED);
    const open = renderHtml(<AiBlock value={aiGenerated} onRegenerate={() => undefined} />);
    expect(buttonTag(open, 'Regenerate')).not.toMatch(DISABLED);
  });
});
