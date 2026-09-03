import { ChevronRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The disclosure that keeps build vocabulary off the analyst's screen without throwing
 * it away.
 *
 * A failure used to render the backend's own message as the headline, which meant an
 * analyst read sentences like "reports.list_reports is not wired to real data yet; it
 * lands at build step 13. Set DEMO_MODE=1 to develop against the fixture data." Every
 * word of that is true and none of it is addressed to them.
 *
 * So the plain-language explanation leads, and this holds what a bug report needs: the
 * raw message, the error code, the HTTP status and the request id, all selectable.
 */
export function TechnicalDetails({
  children,
  label = 'Technical details',
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('w-full', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-sm text-2xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight
          className={cn('h-3 w-3 transition-transform', open && 'rotate-90')}
          aria-hidden="true"
        />
        {label}
      </button>

      {open && <div className="mt-1.5 space-y-1.5">{children}</div>}
    </div>
  );
}
