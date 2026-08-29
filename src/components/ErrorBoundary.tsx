import { AlertOctagon } from 'lucide-react';
import * as React from 'react';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';

interface State {
  error: Error | null;
}

/**
 * Last line of defence. A render crash must never leave a white screen -- an analyst
 * needs something quotable and a way back.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[error-boundary]', error, info.componentStack);
  }

  override render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const api = error instanceof ApiError ? error : null;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div
          role="alert"
          className="w-full max-w-lg rounded-lg border border-destructive/40 bg-destructive/5 p-4"
        >
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-destructive" aria-hidden="true" />
            <h1 className="text-sm font-semibold text-destructive">This screen crashed</h1>
          </div>
          <p className="mt-2 text-xs text-foreground/90">{error.message}</p>
          {api?.requestId && (
            <p className="mt-2 font-mono text-2xs text-muted-foreground">
              request_id <span className="select-all text-foreground/80">{api.requestId}</span>
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
