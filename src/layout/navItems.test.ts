import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { allNavItems, NAV_SECTIONS, NON_NAV_ROUTES, navPath } from './navItems';

/**
 * The guard that keeps the navigation honest.
 *
 * Before the sidebar existed, `App.tsx` registered 18 routes and the rail linked 8 of
 * them: cohorts, domains, alerts and the key manager were reachable only by
 * typing a URL. Nothing failed, because nothing was checking. This test is that check
 * -- a new page must appear in `NAV_SECTIONS` or be listed in `NON_NAV_ROUTES` with a
 * reason, and neither list may name a route that no longer exists.
 */

function declaredRoutes(): string[] {
  const source = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8');
  // Every `<Route path="...">` in the router, in source order.
  return [...source.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1] as string);
}

describe('navigation model', () => {
  it('covers every route declared in App.tsx', () => {
    const navPaths = new Set(allNavItems().map((i) => i.path));
    const orphans = declaredRoutes().filter(
      (route) => !navPaths.has(route) && !(route in NON_NAV_ROUTES),
    );

    expect(
      orphans,
      'Add these to NAV_SECTIONS, or to NON_NAV_ROUTES with the reason they are not navigable',
    ).toEqual([]);
  });

  it('does not point at routes the router no longer declares', () => {
    const routes = new Set(declaredRoutes());
    const stale = [...allNavItems().map((i) => i.path), ...Object.keys(NON_NAV_ROUTES)].filter(
      (path) => !routes.has(path),
    );

    expect(stale, 'These paths are not registered in App.tsx').toEqual([]);
  });

  it('gives every item a label, an icon and a hint', () => {
    for (const item of allNavItems()) {
      expect(item.label.length, `${item.path} needs a label`).toBeGreaterThan(0);
      expect(item.Icon, `${item.path} needs an icon`).toBeTruthy();
      // The hint is the collapsed rail's only explanation of where a glyph leads.
      expect(item.hint.length, `${item.path} needs a hint`).toBeGreaterThan(10);
    }
  });

  it('has no duplicate destinations', () => {
    const paths = allNavItems().map((i) => i.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('substitutes the project slug', () => {
    expect(navPath('/p/:projectSlug/overview', 'demo-election')).toBe('/p/demo-election/overview');
    // Paths outside a project pass through untouched.
    expect(navPath('/jobs', 'demo-election')).toBe('/jobs');
  });

  it('names every section that has one', () => {
    const titled = NAV_SECTIONS.filter((s) => s.title !== null);
    expect(titled.length).toBeGreaterThan(0);
    for (const section of titled) {
      expect(section.items.length).toBeGreaterThan(0);
    }
  });
});
