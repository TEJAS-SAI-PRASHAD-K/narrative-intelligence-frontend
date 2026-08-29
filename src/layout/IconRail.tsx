import {
  CircleHelp,
  FileBarChart,
  Home,
  LayoutDashboard,
  Network,
  Newspaper,
  PenLine,
  Plug,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RailItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  end?: boolean;
}

function items(slug: string): RailItem[] {
  return [
    { to: '/', label: 'Home', Icon: Home, end: true },
    { to: `/p/${slug}/overview`, label: 'Overview', Icon: LayoutDashboard },
    { to: `/p/${slug}/narratives`, label: 'Narratives', Icon: Newspaper },
    { to: `/p/${slug}/curate`, label: 'Curate', Icon: PenLine },
    { to: `/p/${slug}/drivers`, label: 'Drivers', Icon: TrendingUp },
    { to: `/p/${slug}/network`, label: 'Network', Icon: Network },
    { to: `/p/${slug}/reports`, label: 'Reports', Icon: FileBarChart },
    { to: `/p/${slug}/sources`, label: 'Sources', Icon: Plug },
  ];
}

/**
 * Icon-only rail that expands on hover. Every control here is an icon with no visible
 * text, so every one carries an `aria-label` and a tooltip -- without them the entire
 * primary navigation is unusable with a screen reader.
 */
export function IconRail({ slug }: { slug: string }) {
  return (
    <nav
      aria-label="Primary"
      className="group/rail flex w-12 shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-150 hover:w-44"
    >
      <ul className="flex flex-1 flex-col gap-0.5 p-1.5">
        {items(slug).map(({ to, label, Icon, end }) => (
          <RailLink key={to} to={to} label={label} Icon={Icon} end={end} />
        ))}
      </ul>
      <ul className="flex flex-col gap-0.5 border-t border-border p-1.5">
        <RailLink to="/jobs" label="Jobs" Icon={CircleHelp} />
      </ul>
    </nav>
  );
}

function RailLink({ to, label, Icon, end }: RailItem) {
  return (
    <li>
      <Tooltip>
        <TooltipTrigger asChild>
          <NavLink
            to={to}
            end={end}
            aria-label={label}
            className={({ isActive }) =>
              cn(
                'flex h-9 items-center gap-2.5 overflow-hidden rounded-md px-2 text-muted-foreground transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive && 'bg-accent text-accent-foreground',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {/* Revealed on hover; the aria-label carries the name regardless. */}
            <span className="whitespace-nowrap text-xs opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100">
              {label}
            </span>
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right" className="group-hover/rail:hidden">
          {label}
        </TooltipContent>
      </Tooltip>
    </li>
  );
}
