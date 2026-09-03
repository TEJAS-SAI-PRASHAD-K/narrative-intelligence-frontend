import { ChevronDown, Menu, Radar, Settings, User, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ProjectOut } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { activeChips, removeChip, type FilterSpec } from '@/lib/filters';
import { STORAGE_KEYS, writeLocal } from '@/lib/storage';

/**
 * Identity and scope: what product this is, which project you are in, and what is
 * currently filtering the view.
 *
 * It used to carry three permanently-open dropdowns -- project, platform, narrative --
 * so the API keys page offered a Platform picker that filtered nothing, and the filter
 * set was split across two places. Platform and narrative moved into `AdvancedFilters`
 * with every other filter; what stays here is the summary of what is in force, as
 * removable chips.
 *
 * The bar owns no state. Chips are derived from the `FilterSpec` and removal writes the
 * URL, exactly as the filter bar does.
 */
export function TopBar({
  project,
  projects,
  filters,
  onFiltersChange,
  onOpenNav,
}: {
  project: ProjectOut | undefined;
  projects: ProjectOut[];
  filters: FilterSpec;
  onFiltersChange: (next: FilterSpec) => void;
  /** Opens the navigation sheet on viewports too narrow for the sidebar. */
  onOpenNav: () => void;
}) {
  const navigate = useNavigate();
  const chips = activeChips(filters);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-3 shadow-card">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open navigation"
        onClick={onOpenNav}
        className="lg:hidden"
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
      </Button>

      {/* Brand mark. A product with a name and no mark reads as an internal tool. */}
      <div className="flex shrink-0 items-center gap-2.5 pl-1">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-inset ring-primary/30"
        >
          <Radar className="h-4 w-4 text-primary" />
        </span>
        <span className="hidden text-sm font-semibold tracking-tight sm:block">
          Narrative Intelligence
        </span>
      </div>

      <span className="h-5 w-px shrink-0 bg-border" aria-hidden="true" />

      {/* Project selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-2 rounded-lg border border-border bg-surface-raised px-2.5 hover:border-border-strong"
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-risk-low"
            />
            <span className="max-w-[14rem] truncate">{project?.name ?? 'Select project'}</span>
            <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-80 overflow-y-auto">
          <DropdownMenuLabel>Projects</DropdownMenuLabel>
          {projects.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onSelect={() => {
                writeLocal(STORAGE_KEYS.lastProjectSlug, p.slug);
                // Switching project drops every filter: ids from one project are
                // meaningless in another.
                navigate(`/p/${p.slug}/overview`);
              }}
            >
              <span className="truncate">{p.name}</span>
              {p.id === project?.id && (
                <span className="ml-auto pl-3 text-2xs text-primary">current</span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate('/')}>All projects…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FilterSummary chips={chips} filters={filters} onFiltersChange={onFiltersChange} />

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => navigate('/settings/keys')}>
            API key management
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate('/jobs')}>Job history</DropdownMenuItem>
          {project && (
            <DropdownMenuItem onSelect={() => navigate(`/p/${project.slug}/alerts`)}>
              Alerts and rules
            </DropdownMenuItem>
          )}
          {import.meta.env.DEV && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/kitchen-sink')}>
                Component kitchen sink
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-label="Signed in via API key"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-ai/25 ring-1 ring-inset ring-border-strong"
          >
            <User className="h-4 w-4 text-foreground/80" aria-hidden="true" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          You are identified by the API key this browser is configured with. There are no user
          accounts in this build.
        </TooltipContent>
      </Tooltip>
    </header>
  );
}

/**
 * What is filtering the view right now, and one click to drop any of it. Only rendered
 * when something is actually in force -- an empty rail of controls that do nothing is
 * what made the old bar read as chrome.
 */
function FilterSummary({
  chips,
  filters,
  onFiltersChange,
}: {
  chips: ReturnType<typeof activeChips>;
  filters: FilterSpec;
  onFiltersChange: (next: FilterSpec) => void;
}) {
  if (chips.length === 0) return null;

  // Three fit comfortably beside the project name; the rest are counted, and the full
  // set is always visible on the page's own filter bar.
  const shown = chips.slice(0, 3);
  const overflow = chips.length - shown.length;

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="h-4 w-px shrink-0 bg-border" aria-hidden="true" />
      <span className="sr-only">Active filters</span>
      {shown.map((chip) => (
        <Badge
          key={`${chip.key}:${chip.value ?? ''}`}
          variant="outline"
          className="min-w-0 gap-1 py-1 pr-1"
        >
          <span className="truncate">{chip.label}</span>
          <button
            type="button"
            onClick={() => onFiltersChange(removeChip(filters, chip))}
            aria-label={`Remove filter ${chip.label}`}
            className="shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-2.5 w-2.5" aria-hidden="true" />
          </button>
        </Badge>
      ))}
      {overflow > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="muted" className="shrink-0 py-1">
              +{overflow}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="mb-1 font-medium">Also filtering by</p>
            <ul className="space-y-0.5">
              {chips.slice(shown.length).map((chip) => (
                <li key={`${chip.key}:${chip.value ?? ''}`}>{chip.label}</li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
