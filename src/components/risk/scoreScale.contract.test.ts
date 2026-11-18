import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every `<ScoreCell scale="...">` call site renders one contract field. The scale
 * must match the range the schema declares for that field: `"hundred"` for 0 to 100,
 * `"unit"` for 0 to 1. Getting it wrong renders `risk_score: 33.2` as "3320%".
 *
 * The rendered field is not derivable from source (rows are untyped callback
 * parameters), so SITES maps each call site to its schema property. The test fails
 * when source has a call site that is not listed, or a listed one that is gone.
 */

type Scale = 'unit' | 'hundred';

/** key: `<file relative to src>|<value expression>`, value: `Schema.property`. */
const SITES: Record<string, string> = {
  'pages/narratives/components/ContentHighlights.tsx|a.risk_score': 'AuthorOut.risk_score',
  'pages/narratives/components/ContentHighlights.tsx|a.bot_score': 'AuthorOut.bot_score',
  'pages/network/components/InspectPanel.tsx|n.bot_score': 'GraphNode.bot_score',
  'pages/domains/DomainsPage.tsx|d.risk_score': 'DomainOut.risk_score',
  'pages/domains/DomainsPage.tsx|d.sharing_author_bot_ratio': 'DomainOut.sharing_author_bot_ratio',
  'pages/domains/DomainDetailPage.tsx|d.risk_score': 'DomainOut.risk_score',
  'pages/domains/DomainDetailPage.tsx|d.sharing_author_bot_ratio':
    'DomainOut.sharing_author_bot_ratio',
  'pages/authors/components/AuthorPanel.tsx|author.risk_score': 'AuthorOut.risk_score',
  'pages/authors/components/AuthorPanel.tsx|author.bot_score': 'AuthorOut.bot_score',
  'pages/authors/components/AuthorPanel.tsx|author.anomalous_score': 'AuthorOut.anomalous_score',
  'pages/authors/components/AuthorPanel.tsx|author.toxicity_score': 'AuthorOut.toxicity_score',
  'pages/authors/components/AuthorPanel.tsx|author.coordination_score':
    'AuthorOut.coordination_score',
  'pages/cohorts/CohortsPage.tsx|a.risk_score': 'AuthorOut.risk_score',
  'pages/cohorts/CohortsPage.tsx|a.bot_score': 'AuthorOut.bot_score',
};

const SRC = join(__dirname, '..', '..');
const CALL_SITE = /<ScoreCell\s+value=\{([^}]+)\}\s+scale="(unit|hundred)"/g;

interface Schema {
  properties?: Record<string, SchemaProperty>;
}
interface SchemaProperty {
  minimum?: number;
  maximum?: number;
  anyOf?: SchemaProperty[];
}

const schemas = (
  JSON.parse(readFileSync(join(SRC, '..', 'openapi.json'), 'utf8')) as {
    components: { schemas: Record<string, Schema> };
  }
).components.schemas;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return path.endsWith('.tsx') && !path.endsWith('.test.tsx') ? [path] : [];
  });
}

function findCallSites(): { key: string; scale: Scale }[] {
  const found: { key: string; scale: Scale }[] = [];
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(CALL_SITE)) {
      found.push({
        key: `${relative(SRC, file)}|${match[1]!.trim()}`,
        scale: match[2] as Scale,
      });
    }
  }
  return found;
}

/** The declared range of a property, looking through a nullable `anyOf`. */
function declaredRange(path: string): [number, number] | null {
  const [schemaName, field] = path.split('.') as [string, string];
  const prop = schemas[schemaName]?.properties?.[field];
  if (!prop) throw new Error(`${path} is not in openapi.json`);
  for (const branch of [prop, ...(prop.anyOf ?? [])]) {
    if (branch.minimum !== undefined && branch.maximum !== undefined) {
      return [branch.minimum, branch.maximum];
    }
  }
  return null;
}

describe('ScoreCell scale matches the declared range', () => {
  const sites = findCallSites();

  it('finds call sites in source', () => {
    expect(sites.length).toBeGreaterThan(0);
  });

  it('lists every call site found in source, and nothing stale', () => {
    expect(sites.map((s) => s.key).sort()).toEqual(Object.keys(SITES).sort());
  });

  it.each(sites)('$key uses scale "$scale"', ({ key, scale }) => {
    const path = SITES[key];
    expect(path, `${key} is not listed in SITES`).toBeDefined();
    const range = declaredRange(path!);
    expect(range, `${path} is declared with a different range than scale "${scale}"`).toEqual([
      0,
      scale === 'hundred' ? 100 : 1,
    ]);
  });
});
