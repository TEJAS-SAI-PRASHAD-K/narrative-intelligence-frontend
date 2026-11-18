import type { ApiKeySelf } from '@/api/types';

/**
 * Why a write control is disabled, or `undefined` when it should stay usable.
 *
 * Only a loaded answer that says `can_write: false` disables anything. While the scopes
 * are loading, or if the lookup failed, the control stays enabled and a real rejection
 * surfaces through the normal error path: disabling on an unknown would lock out a key
 * that can write whenever `/keys/me` is slow or down.
 */
export function writeDisabledReason(self: ApiKeySelf | undefined): string | undefined {
  if (!self || self.can_write) return undefined;
  const held = self.effective_scopes.length > 0 ? self.effective_scopes.join(', ') : 'none';
  return `This API key is read-only. It needs the "write" scope for this action (scopes held: ${held}).`;
}
