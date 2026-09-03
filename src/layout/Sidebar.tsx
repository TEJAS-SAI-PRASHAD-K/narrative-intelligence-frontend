import { PanelLeftClose, Pin } from 'lucide-react';
import { useState } from 'react';
import { Link, useMatch, useResolvedPath } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useJobs } from '@/jobs/JobStore';
import { cn } from '@/lib/utils';
import { NAV_SECTIONS, navPath, type NavItem } from './navItems';

const RAIL_W = 'w-[3.75rem]';
const PANEL_W = 'w-60';

/**
 * Primary navigation. Two modes, and the difference between them is what the page is
 * allowed to do underneath.
 *
 * **Pinned** — the panel is a normal flex child; the page lays out beside it.
 * **Collapsed** — a 60px rail holds the layout, and hovering it floats the full panel
 * *over* the page on its own layer.
 *
 * That overlay is the whole point. The rail this replaces was a flex child that grew on
 * hover, so the page slid sideways under the pointer every time an analyst crossed it.
 * Reveal-on-hover is the right interaction; moving the page to pay for it was not.
 */
export function Sidebar({
  slug,
  collapsed,
  onCollapsedChange,
  onOpenJobs,
  /** Set when rendered inside the mobile sheet: navigating closes the sheet. */
  onNavigate,
}: {
  slug: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onOpenJobs: () => void;
  onNavigate?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const expanded = !collapsed || hovered;

  return (
    <div
      className={cn('relative z-40 shrink-0', collapsed ? RAIL_W : PANEL_W)}
      onMouseEnter={() => collapsed && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Keyboard users get the same reveal: focus anywhere inside opens the panel.
      onFocusCapture={() => collapsed && setHovered(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovered(false);
      }}
    >
      <nav
        aria-label="Primary"
        className={cn(
          'absolute inset-y-0 left-0 flex flex-col border-r border-border bg-surface',
          'transition-[width] duration-200 ease-out',
          expanded ? PANEL_W : RAIL_W,
          // Only the floating state casts a shadow; pinned, it is part of the page.
          collapsed && hovered && 'shadow-rail',
        )}
      >
        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-4 transition-[padding] duration-200',
            expanded ? 'px-3' : 'px-2',
          )}
        >
          {NAV_SECTIONS.map((section, index) => (
            <div
              key={section.title ?? `section-${index}`}
              className={index > 0 ? 'mt-6' : undefined}
            >
              {section.title !== null && (
                <h2
                  className={cn(
                    'mb-2 px-2 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70',
                    'transition-opacity duration-150',
                    // The heading fades rather than truncating to two illegible letters.
                    expanded ? 'opacity-100' : 'opacity-0',
                  )}
                >
                  {section.title}
                </h2>
              )}
              {section.title !== null && !expanded && (
                <div className="mx-1.5 mb-2 h-px bg-border" aria-hidden="true" />
              )}

              <ul className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <SidebarLink
                    key={item.path}
                    item={item}
                    slug={slug}
                    expanded={expanded}
                    showTooltip={!expanded}
                    onOpenJobs={onOpenJobs}
                    onNavigate={onNavigate}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className={cn(
            'shrink-0 border-t border-border py-3 transition-[padding] duration-200',
            expanded ? 'px-3' : 'px-2',
          )}
        >
          <button
            type="button"
            onClick={() => {
              onCollapsedChange(!collapsed);
              setHovered(false);
            }}
            aria-label={collapsed ? 'Keep sidebar open' : 'Collapse sidebar to icons'}
            aria-pressed={!collapsed}
            className={cn(
              'flex h-9 w-full items-center rounded-lg text-muted-foreground',
              'transition-colors hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              expanded ? 'gap-3 px-2.5' : 'justify-center gap-0 px-0',
            )}
          >
            {collapsed ? (
              <Pin className="h-[1.125rem] w-[1.125rem] shrink-0" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-[1.125rem] w-[1.125rem] shrink-0" aria-hidden="true" />
            )}
            <span
              className={cn(
                'overflow-hidden whitespace-nowrap text-xs transition-opacity duration-150',
                expanded ? 'opacity-100' : 'w-0 opacity-0',
              )}
            >
              {collapsed ? 'Keep open' : 'Collapse'}
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function SidebarLink({
  item,
  slug,
  expanded,
  showTooltip,
  onOpenJobs,
  onNavigate,
}: {
  item: NavItem;
  slug: string;
  expanded: boolean;
  showTooltip: boolean;
  onOpenJobs: () => void;
  onNavigate?: () => void;
}) {
  const { Icon, label, hint } = item;
  const { active } = useJobs();

  /*
   * Active state is resolved here rather than by `NavLink`'s render-prop `className`.
   *
   * Collapsed, each row is wrapped in `<TooltipTrigger asChild>`, and Radix's `Slot`
   * merges className by string-joining whatever it is handed. Handed a function, it
   * joins the function's *source text* -- so the row rendered with
   * `class="({ isActive }) => cn(rowClass, ...)"` and every Tailwind class on it was
   * silently dropped. That is what left the icons hard against the rail's left edge:
   * the `justify-center` was never in the DOM. Plain strings cannot fail that way.
   */
  const resolved = useResolvedPath(navPath(item.path, slug));
  const match = useMatch({ path: resolved.pathname, end: item.end ?? false });
  const isActive = !item.opensPanel && match !== null;
  // Jobs is the one item whose state matters before you open it: work queued by a 202
  // is invisible otherwise. This badge is what replaces the tray floating over the page.
  const badge = item.opensPanel === 'jobs' && active.length > 0 ? active.length : null;

  const body = (
    <>
      {/* The active marker is a bar at the rail's edge, so it reads the same collapsed
          as expanded -- a highlight that only exists behind a label disappears with it. */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-opacity',
          isActive ? 'opacity-100' : 'opacity-0',
        )}
      />
      <span className="relative flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center">
        <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
        {!expanded && badge !== null && (
          <span
            className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-state-running ring-2 ring-surface"
            aria-hidden="true"
          />
        )}
      </span>
      <span
        className={cn(
          'min-w-0 truncate text-left text-xs transition-opacity duration-150',
          expanded ? 'flex-1 opacity-100' : 'pointer-events-none w-0 flex-none opacity-0',
        )}
      >
        {label}
      </span>
      {expanded && badge !== null && (
        <Badge variant="default" className="shrink-0">
          {badge}
        </Badge>
      )}
    </>
  );

  const rowClass = cn(
    'relative flex h-9 w-full items-center rounded-lg text-muted-foreground transition-colors',
    'hover:bg-accent hover:text-accent-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    // Collapsed there is nothing to sit beside, so the icon centres and the gap goes.
    expanded ? 'gap-3 px-2.5' : 'justify-center gap-0 px-0',
  );

  const control = item.opensPanel ? (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="dialog"
      onClick={() => {
        onOpenJobs();
        onNavigate?.();
      }}
      className={rowClass}
    >
      {body}
    </button>
  ) : (
    <Link
      to={navPath(item.path, slug)}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(rowClass, isActive && 'bg-accent font-medium text-accent-foreground')}
    >
      {body}
    </Link>
  );

  return (
    <li>
      {showTooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>{control}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            <p className="font-medium">
              {label}
              {badge !== null && ` — ${badge} running`}
            </p>
            <p className="mt-0.5 text-muted-foreground">{hint}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        control
      )}
    </li>
  );
}
