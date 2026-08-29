/**
 * Small localStorage helpers for the one category of state the server does not own and
 * the URL should not carry: column visibility, the collapsed KPI strip, the last
 * project. Everything else belongs to the URL or to TanStack Query.
 *
 * Reads and writes are guarded: a private window or a browser with site data blocked
 * throws on access, and a preference must never take a screen down with it.
 */
const PREFIX = 'nip:';

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* preference not persisted; the session still works */
  }
}

export function removeLocal(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* nothing to do */
  }
}

export const STORAGE_KEYS = {
  lastProjectSlug: 'last-project-slug',
  kpiStripCollapsed: 'kpi-strip-collapsed',
  columns: (table: string) => `columns:${table}`,
} as const;
