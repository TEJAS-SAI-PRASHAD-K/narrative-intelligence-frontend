import { AlertTriangle, KeyRound, RefreshCw } from 'lucide-react';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { explainError } from './explainError';
import { TechnicalDetails } from './TechnicalDetails';

/**
 * A failure an analyst can act on.
 *
 * The plain-language explanation leads; the backend's own message, its `error.code`,
 * the HTTP status and the `request_id` sit one click away in the technical disclosure,
 * still selectable, because a bug report has to be able to quote them. What changed is
 * which of those an analyst reads first.
 */
export function ErrorState({
  error,
  onRetry,
  title,
  compact,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  /** Overrides the headline. The explanation and details are unaffected. */
  title?: string;
  compact?: boolean;
  className?: string;
}) {
  const api = error instanceof ApiError ? error : null;
  const raw = api?.message ?? (error instanceof Error ? error.message : 'Unexpected error');
  const explained = explainError(error);
  const isAuth = api?.isAuth ?? false;

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-2 rounded-xl border border-destructive/35 bg-destructive/[0.07] p-4 shadow-card',
        compact ? 'text-xs' : '',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {isAuth ? (
          <KeyRound className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
        )}
        <p className="text-sm font-medium text-destructive">
          {title ?? explained?.title ?? 'Could not load this view'}
        </p>
      </div>

      {/* With no translation for this code, the backend's message is more informative
          than any sentence written here would be. */}
      <p className="text-xs text-foreground/90">{explained?.lead ?? raw}</p>

      {explained?.next && <p className="text-xs text-muted-foreground">{explained.next}</p>}

      {isAuth && (
        <p className="text-2xs text-muted-foreground">
          For a local setup: put a key with the <code className="rounded bg-muted px-1">read</code>{' '}
          scope in <code className="rounded bg-muted px-1">VITE_API_KEY</code> in{' '}
          <code className="rounded bg-muted px-1">.env.local</code>, then restart the dev server.
        </p>
      )}

      {api && (
        <TechnicalDetails>
          {/* Shown here rather than above when a translation replaced it. */}
          {explained && (
            <p className="break-words text-2xs text-muted-foreground">
              <span className="font-medium text-foreground/80">Server said: </span>
              <span className="select-all">{raw}</span>
            </p>
          )}
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-2xs text-muted-foreground">
            <div className="flex gap-1.5">
              <dt>code</dt>
              <dd className="select-all text-foreground/80">{api.code}</dd>
            </div>
            {api.status > 0 && (
              <div className="flex gap-1.5">
                <dt>status</dt>
                <dd className="select-all text-foreground/80">{api.status}</dd>
              </div>
            )}
            {api.requestId && (
              <div className="flex gap-1.5">
                <dt>request_id</dt>
                <dd className="select-all text-foreground/80">{api.requestId}</dd>
              </div>
            )}
          </dl>
        </TechnicalDetails>
      )}

      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-0.5">
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          Retry
        </Button>
      )}
    </div>
  );
}
