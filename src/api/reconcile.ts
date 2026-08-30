import type { NarrativeDetail, NarrativeSummary } from './types';

type Narrativeish = Pick<NarrativeSummary, 'id' | 'title' | 'updated_at'>;

/**
 * Reconciles an in-flight analyst edit against data arriving from the server.
 *
 * The race this exists for: an analyst renames a narrative while a recluster job is
 * running. The job finishes, the tray invalidates the feed, and the refetch returns
 * rows written *before* the rename reached the database. Naively taking the server's
 * copy makes the analyst's edit vanish from under them with no error and no
 * explanation.
 *
 * The rule: the server wins whenever it has actually seen the edit, and only then.
 * `updated_at` is the arbiter -- if the incoming row is strictly newer than the one the
 * edit was based on, it reflects the write (or a later one) and is authoritative. If it
 * is the same age or older, it predates the edit and the local text is kept.
 *
 * A row with no `updated_at` cannot be ordered, so it is treated as authoritative:
 * silently preferring stale local text over server data would be the worse failure.
 */
export function shouldKeepLocalEdit(
  local: { updated_at?: string | null | undefined },
  incoming: { updated_at?: string | null | undefined },
): boolean {
  if (!incoming.updated_at) return false;
  if (!local.updated_at) return false;

  const localAt = Date.parse(local.updated_at);
  const incomingAt = Date.parse(incoming.updated_at);
  if (Number.isNaN(localAt) || Number.isNaN(incomingAt)) return false;

  // Strictly newer wins. Equal timestamps mean the server has not seen the edit yet.
  return incomingAt <= localAt;
}

/**
 * Merges one incoming narrative over an optimistically edited local copy, keeping the
 * analyst's title and summary when the server has not caught up.
 */
export function reconcileNarrative<T extends Narrativeish>(local: T | undefined, incoming: T): T {
  if (!local) return incoming;
  if (local.id !== incoming.id) return incoming;
  if (!local.title.provenance.edited_by_user) return incoming;
  if (!shouldKeepLocalEdit(local, incoming)) return incoming;

  return { ...incoming, title: local.title };
}

/** Applies the same rule across a page of feed rows. */
export function reconcileNarrativeList<T extends Narrativeish>(
  locals: readonly T[],
  incoming: readonly T[],
): T[] {
  const byId = new Map(locals.map((n) => [n.id, n]));
  return incoming.map((n) => reconcileNarrative(byId.get(n.id), n));
}

export type { NarrativeDetail };
