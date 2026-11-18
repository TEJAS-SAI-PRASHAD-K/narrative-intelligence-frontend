import { useKeyScopes } from '@/api/queries/ops';
import { writeDisabledReason } from './writeAccess';

/** `disabledReason` is set only when the key is known to lack the write scope. */
export function useWriteAccess(): { disabledReason: string | undefined } {
  const { data } = useKeyScopes();
  return { disabledReason: writeDisabledReason(data) };
}
