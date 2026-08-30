import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '@/api/client';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '@/api/queries/ops';
import type { ApiKeyCreated, ApiKeyOut } from '@/api/types';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/states';
import { EntityTable } from '@/components/table/EntityTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { formatDateTime, formatRelative } from '@/lib/format';

const SCOPES = ['read', 'write', 'admin'] as const;

/**
 * API key management. The plaintext key from `POST /keys` is shown exactly once, in a
 * dialog that says so before it is dismissible — the backend stores only a hash, so an
 * analyst who closes this without copying has to mint a new key.
 */
export default function KeysPage() {
  const keys = useApiKeys();
  const revoke = useRevokeApiKey();
  const [createOpen, setCreateOpen] = useState(false);
  const [minted, setMinted] = useState<ApiKeyCreated | null>(null);
  const { toast } = useToast();

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-sm font-semibold">API keys</h1>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3 w-3" aria-hidden="true" />
          Create key
        </Button>
      </div>

      <div className="rounded-md border border-border bg-surface-sunken px-3 py-2 text-2xs text-muted-foreground">
        This dashboard authenticates with <code>X-API-Key</code> from{' '}
        <code>VITE_API_KEY</code> — a local-only, capstone-scoped decision documented in
        the README. There are no user accounts and no login.
      </div>

      {keys.isLoading && <SkeletonCard />}
      {Boolean(keys.error) && <ErrorState error={keys.error} onRetry={() => void keys.refetch()} />}
      {!keys.isLoading && (keys.data?.items.length ?? 0) === 0 && !keys.error && (
        <EmptyState icon={<KeyRound className="h-6 w-6" />} title="No API keys" />
      )}

      {(keys.data?.items.length ?? 0) > 0 && (
        <EntityTable
          tableId="api-keys"
          caption="API keys"
          columns={[
            { id: 'name', header: 'Name', cell: (k: ApiKeyOut) => k.name },
            {
              id: 'prefix',
              header: 'Prefix',
              cell: (k) => <span className="font-mono text-2xs">{k.prefix}…</span>,
            },
            {
              id: 'scopes',
              header: 'Scopes',
              cell: (k) => (
                <div className="flex gap-1">
                  {k.scopes.map((s) => (
                    <Badge key={s} variant="muted">
                      {s}
                    </Badge>
                  ))}
                </div>
              ),
            },
            {
              id: 'status',
              header: 'Status',
              cell: (k) =>
                k.is_active ? (
                  <Badge variant="risk-low">Active</Badge>
                ) : (
                  <Badge variant="risk-none">Revoked</Badge>
                ),
            },
            {
              id: 'last_used',
              header: 'Last used',
              cell: (k) => (
                <span className="tabular">
                  {k.last_used_at ? formatRelative(k.last_used_at) : 'never'}
                </span>
              ),
            },
            {
              id: 'created',
              header: 'Created',
              cell: (k) => (
                <span className="tabular">{formatDateTime(k.created_at, 'UTC')}</span>
              ),
            },
          ]}
          rows={keys.data?.items ?? []}
          rowKey={(k) => k.id}
          rowActions={(k) =>
            k.is_active ? (
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Revoke key ${k.name}`}
                onClick={() =>
                  revoke.mutate(k.id, {
                    onSuccess: () => toast({ title: `Revoked ${k.name}`, variant: 'success' }),
                    onError: (err) =>
                      toast({
                        title: 'Could not revoke',
                        description: err instanceof ApiError ? err.message : String(err),
                        variant: 'error',
                      }),
                  })
                }
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </Button>
            ) : null
          }
          maxHeight="calc(100vh - 16rem)"
        />
      )}

      <CreateKeyDialog open={createOpen} onOpenChange={setCreateOpen} onMinted={setMinted} />
      <ShowKeyOnceDialog minted={minted} onDismiss={() => setMinted(null)} />
    </div>
  );
}

function CreateKeyDialog({
  open,
  onOpenChange,
  onMinted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMinted: (key: ApiKeyCreated) => void;
}) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read']);
  const create = useCreateApiKey();
  const { toast } = useToast();

  async function submit() {
    try {
      const created = await create.mutateAsync({
        name: name.trim(),
        scopes: scopes as ('read' | 'write' | 'admin')[],
      });
      onOpenChange(false);
      setName('');
      setScopes(['read']);
      onMinted(created);
    } catch (err) {
      toast({
        title: 'Could not create the key',
        description: err instanceof ApiError ? `${err.message} (${err.code})` : String(err),
        variant: 'error',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an API key</DialogTitle>
          <DialogDescription>
            The key is shown once, immediately after it is created, and cannot be retrieved
            again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="key-name">Name</Label>
            <Input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Local dashboard"
            />
          </div>

          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
              Scopes
            </legend>
            <div className="flex gap-4">
              {SCOPES.map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`scope-${s}`}
                    checked={scopes.includes(s)}
                    onCheckedChange={() =>
                      setScopes((prev) =>
                        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
                      )
                    }
                  />
                  <Label htmlFor={`scope-${s}`} className="cursor-pointer normal-case tracking-normal">
                    {s}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-2xs text-muted-foreground">
              Reads need <code>read</code>, mutations <code>write</code>, key management{' '}
              <code>admin</code>.
            </p>
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => void submit()}
            disabled={create.isPending || name.trim().length === 0 || scopes.length === 0}
          >
            {create.isPending ? 'Creating…' : 'Create key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Shown exactly once. The dialog says so, and offers copy before dismiss. */
function ShowKeyOnceDialog({
  minted,
  onDismiss,
}: {
  minted: ApiKeyCreated | null;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!minted) return;
    void navigator.clipboard?.writeText(minted.key).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      },
      () => setCopied(false),
    );
  }

  return (
    <Dialog open={minted !== null} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy this key now</DialogTitle>
          <DialogDescription>
            This is the only time the key is shown. The backend stores a hash, not the key —
            once this dialog closes there is no way to recover it and you will have to mint a
            new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 select-all break-all rounded-md border border-border bg-surface-sunken px-2.5 py-2 font-mono text-xs">
              {minted?.key}
            </code>
            <Button size="sm" variant="outline" onClick={copy} aria-label="Copy the API key">
              {copied ? (
                <Check className="h-3 w-3 text-risk-low" aria-hidden="true" />
              ) : (
                <Copy className="h-3 w-3" aria-hidden="true" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <p className="text-2xs text-muted-foreground">
            For local development, paste it into <code>.env.local</code> as{' '}
            <code>VITE_API_KEY</code>. Never commit it.
          </p>
        </div>

        <DialogFooter>
          <Button size="sm" onClick={onDismiss}>
            I have copied it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
