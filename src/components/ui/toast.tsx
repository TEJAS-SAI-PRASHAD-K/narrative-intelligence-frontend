import * as ToastPrimitive from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ToastSpec {
  id: string;
  title: string;
  description?: string | undefined;
  variant?: 'default' | 'success' | 'error' | undefined;
  /** Rendered as an action button inside the toast, e.g. "View" on a finished job. */
  action?: { label: string; onSelect: () => void } | undefined;
  durationMs?: number | undefined;
}

interface ToastContextValue {
  toast: (spec: Omit<ToastSpec, 'id'>) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const VARIANT_CLASS: Record<NonNullable<ToastSpec['variant']>, string> = {
  default: 'border-border',
  success: 'border-risk-low/50',
  error: 'border-destructive/60',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastSpec[]>([]);

  const toast = React.useCallback((spec: Omit<ToastSpec, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev.slice(-3), { ...spec, id }]);
  }, []);

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            duration={t.durationMs ?? 6000}
            onOpenChange={(open) => {
              if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id));
            }}
            className={cn(
              'flex items-start gap-3 rounded-md border bg-popover p-3 shadow-xl',
              'data-[state=open]:animate-in data-[state=open]:slide-in-from-right-4',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
              VARIANT_CLASS[t.variant ?? 'default'],
            )}
          >
            <div className="min-w-0 flex-1">
              <ToastPrimitive.Title className="text-xs font-semibold">{t.title}</ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="mt-0.5 break-words text-2xs text-muted-foreground">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            {t.action && (
              <ToastPrimitive.Action asChild altText={t.action.label}>
                <button
                  type="button"
                  onClick={t.action.onSelect}
                  className="shrink-0 rounded-sm px-2 py-1 text-2xs font-medium text-primary hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t.action.label}
                </button>
              </ToastPrimitive.Action>
            )}
            <ToastPrimitive.Close
              aria-label="Dismiss notification"
              className="shrink-0 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
