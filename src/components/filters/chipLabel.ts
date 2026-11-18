import type { ChipNameLookup } from '@/api/queries/names';
import { filterLabel, type FilterChip } from '@/lib/filters';

/** First eight characters of an id, enough to tell two apart in a chip. */
export function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

export interface ChipText {
  label: string;
  /** Set only when the chip is not showing a resolved name, and says why. */
  title?: string;
}

/**
 * The text of one chip given what the name lookup has returned. A resolved name reads
 * `Cohort: Verified journalists`. Anything else falls back to the short id and the
 * title says which of loading, unknown or failed it was, so a short id is never
 * mistaken for a name.
 */
export function chipText(chip: FilterChip, lookup: ChipNameLookup): ChipText {
  if (lookup.state === 'none' || chip.value === undefined) return { label: chip.label };
  const prefix = filterLabel(chip.key);
  const short = shortId(chip.value);
  switch (lookup.state) {
    case 'resolved':
      return { label: `${prefix}: ${lookup.name}` };
    case 'loading':
      return { label: `${prefix}: ${short}`, title: 'Loading name, showing short id' };
    case 'not_found':
      return { label: `${prefix}: ${short}`, title: 'Name not found, showing short id' };
    case 'error':
      return { label: `${prefix}: ${short}`, title: 'Name unavailable, showing short id' };
  }
}
