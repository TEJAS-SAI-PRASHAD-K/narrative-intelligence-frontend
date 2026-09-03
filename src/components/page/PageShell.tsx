import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The frame every page renders inside.
 *
 * Before this existed, each page assembled its own header: `h1` at `text-sm` -- the
 * same size and weight as body text -- placed above the filter bar on five routes and
 * below it on six, with the primary action sometimes beside the title and sometimes
 * inside a grid column. Nothing told an analyst which screen they were on or what it
 * was for.
 *
 * The order is fixed here rather than at the call site, because a page that can choose
 * its own order will eventually choose a different one:
 *
 *     breadcrumb → title + meta → description → actions
 *     ────────────────────────────────────────────────
 *     filter bar   (sticky, optional)
 *     body
 *
 * `description` is not decoration. It is the one sentence that says what question the
 * screen answers, and it is why a stranger can open any route and know where they are.
 */

export interface Crumb {
  label: string;
  /** Omitted on the final crumb, which is the page itself. */
  to?: string;
}

/** One horizontal gutter for every page, so headings and content share a left edge. */
export const PAGE_GUTTER = 'px-4 lg:px-6';

export function PageShell({
  breadcrumb,
  title,
  titleSlot,
  description,
  meta,
  actions,
  filterBar,
  children,
  bodyClassName,
}: {
  breadcrumb?: Crumb[];
  /** Always required: it is the accessible name of the page even when `titleSlot` renders. */
  title: string;
  /**
   * Replaces the title's rendered content while keeping its typography and its `h1`.
   * Only for a title the analyst can edit in place, which is the narrative detail page.
   */
  titleSlot?: ReactNode;
  /** One sentence, plain language, aimed at someone who has not used this screen. */
  description: string;
  /** Counts, freshness, scope — anything that qualifies the title. */
  meta?: ReactNode;
  /** Export, Update now, Create. Right-aligned, primary action last. */
  actions?: ReactNode;
  /** The page's `<FilterBar>`, if it has one. Sticks under the header on scroll. */
  filterBar?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className={cn('pb-5 pt-6', PAGE_GUTTER)}>
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1.5">
            <ol className="flex flex-wrap items-center gap-1 text-2xs text-muted-foreground">
              {breadcrumb.map((crumb, i) => (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3 opacity-50" aria-hidden="true" />}
                  {crumb.to ? (
                    <Link
                      to={crumb.to}
                      className="rounded-sm hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="min-w-0 text-[1.375rem] font-semibold leading-tight tracking-tight">
                {titleSlot ?? title}
              </h1>
              {meta}
            </div>
            <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </header>

      {filterBar}

      <div className={cn('flex min-h-0 flex-1 flex-col pb-8 pt-5', PAGE_GUTTER, bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
