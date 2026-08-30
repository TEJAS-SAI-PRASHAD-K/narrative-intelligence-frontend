/**
 * Resolves a design token to a concrete `rgba()` colour.
 *
 * Everything in the app styles through `hsl(var(--token))`, which the browser resolves
 * in CSS. WebGL does not: Sigma parses colours with its own parser, which accepts hex
 * and `rgb()`/`rgba()` but not the space-separated `hsl(H S% L% / A)` form the tokens
 * are stored in. Anything it cannot parse renders black, which is how a 155-node graph
 * first drew as a dark disc.
 *
 * So the graph — and only the graph — resolves tokens up front, against the live
 * computed style, into a form Sigma can actually read. Results are cached because this
 * runs once per node and once per edge.
 */
const cache = new Map<string, string>();

export function resolveToken(token: string, alpha = 1): string {
  const key = `${token}@${alpha}`;
  const hit = cache.get(key);
  if (hit) return hit;

  let raw = '';
  try {
    raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  } catch {
    raw = '';
  }

  // A missing token falls back to a mid grey rather than to black, so a typo reads as
  // "wrong colour" rather than as "node not rendered".
  const resolved = raw ? hslTripletToRgba(raw, alpha) : `rgba(122, 130, 145, ${alpha})`;
  cache.set(key, resolved);
  return resolved;
}

/** `"205 90% 60%"` -> `"rgba(41, 158, 245, 1)"`. */
function hslTripletToRgba(triplet: string, alpha: number): string {
  const parts = triplet.split(/\s+/);
  const h = Number.parseFloat(parts[0] ?? '0');
  const s = Number.parseFloat((parts[1] ?? '0').replace('%', '')) / 100;
  const l = Number.parseFloat((parts[2] ?? '0').replace('%', '')) / 100;

  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) {
    return `rgba(122, 130, 145, ${alpha})`;
  }

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));

  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const m = l - c / 2;
  const to255 = (v: number) => Math.round(Math.min(255, Math.max(0, (v + m) * 255)));

  return `rgba(${to255(r)}, ${to255(g)}, ${to255(b)}, ${alpha})`;
}

/** Clears the cache; only needed if the theme ever becomes switchable. */
export function clearTokenCache(): void {
  cache.clear();
}
