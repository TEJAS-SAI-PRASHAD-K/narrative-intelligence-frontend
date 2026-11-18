import { useChipName } from '@/api/queries/names';
import type { FilterChip } from '@/lib/filters';
import { chipText, type ChipText } from './chipLabel';

/** A chip's label and title, with ids resolved to names where a lookup exists. */
export function useChipText(chip: FilterChip): ChipText {
  return chipText(chip, useChipName(chip.key, chip.value));
}
