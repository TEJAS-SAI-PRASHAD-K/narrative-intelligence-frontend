import { AlertTriangle, KeyRound, RefreshCw } from 'lucide-react';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Every failure surfaces the backend's `error.code` and `request_id`. An analyst
 * reporting a bug must be able to quote them, so they are selectable text, not a
 * tooltip and not swallowed into a generic "something went wrong".
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
  title?: string;
  compact?: boolean;
  className?: string;
}) {
  const api = error instanceof ApiError ? error : null;
  const message = api?.message ?? (error instanceof Error ? error.message : 'Unexpected error');
  const isAuth = api?.isAuth ?? false;

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3',
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
          {title ?? (isAuth ? 'Not authorised' : 'Could not load this view')}
        </p>
      </div>

      <p className="text-xs text-foreground/90">{message}</p>

      {isAuth && (
        <p className="text-2xs text-muted-foreground">
          Set <code className="rounded bg-muted px-1">VITE_API_KEY</code> in{' '}
          <code className="rounded bg-muted px-1">.env.local</code> and restart the dev server.
          Reads need the <code className="rounded bg-muted px-1">read</code> scope.
        </p>
      )}

      {api && (
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
