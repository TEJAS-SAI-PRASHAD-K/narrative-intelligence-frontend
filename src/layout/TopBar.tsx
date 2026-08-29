import { ChevronDown, KeyRound, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNarrativeFeed } from '@/api/queries/narratives';
import type { ProjectOut } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { emptyFilterSpec, type FilterSpec } from '@/lib/filters';
import { platformLabel, truncate } from '@/lib/format';
import { STORAGE_KEYS, writeLocal } from '@/lib/storage';

const PLATFORMS = ['reddit', 'mastodon', 'news', 'gdelt', 'youtube'] as const;

/**
 * Project · platform · narrative · settings · avatar. Platform and narrative write
 * straight to the URL like every other filter -- the top bar owns no state.
 */
export function TopBar({
  project,
  projects,
  filters,
  onFiltersChange,
}: {
  project: ProjectOut | undefined;
  projects: ProjectOut[];
  filters: FilterSpec;
  onFiltersChange: (next: FilterSpec) => void;
}) {
  const navigate = useNavigate();
  const selectedPlatforms = filters.platform ?? [];
  const selectedNarratives = filters.narrative_id ?? [];

  // A short, top-priority slice purely to name the narratives in the picker. The full
  // feed lives on its own page; this never paginates.
  const narrativeOptions = useNarrativeFeed(
    { ...emptyFilterSpec(filters.project_id), tz: filters.tz },
    { sort: 'priority', limit: 25 },
  );
  const narratives = narrativeOptions.data?.pages[0]?.items ?? [];

  function togglePlatform(platform: string) {
    const next = selectedPlatforms.includes(platform)
      ? selectedPlatforms.filter((p) => p !== platform)
      : [...selectedPlatforms, platform];
    onFiltersChange({ ...filters, platform: next.length > 0 ? next : undefined });
  }

  function toggleNarrative(id: string) {
    const next = selectedNarratives.includes(id)
      ? selectedNarratives.filter((n) => n !== id)
      : [...selectedNarratives, id];
    onFiltersChange({ ...filters, narrative_id: next.length > 0 ? next : undefined });
  }

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
      <span className="mr-1 text-xs font-semibold tracking-tight">Narrative Intelligence</span>

      {/* Project selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
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
              {p.id === project?.id && <span className="ml-auto text-2xs text-primary">current</span>}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate('/')}>All projects…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Platform filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            Platform
            {selectedPlatforms.length > 0 && (
              <Badge variant="default" className="ml-0.5">
                {selectedPlatforms.length}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Platforms</DropdownMenuLabel>
          {PLATFORMS.map((p) => (
            <DropdownMenuCheckboxItem
              key={p}
              checked={selectedPlatforms.includes(p)}
              onCheckedChange={() => togglePlatform(p)}
              onSelect={(e) => e.preventDefault()}
            >
              {platformLabel(p)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Narrative filter -- also what puts Overview into narrative-scoped mode. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            Narrative
            {selectedNarratives.length > 0 && (
              <Badge variant="default" className="ml-0.5">
                {selectedNarratives.length}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-96 w-80 overflow-y-auto">
          <DropdownMenuLabel>Narratives (top 25 by priority)</DropdownMenuLabel>
          {narrativeOptions.isLoading && (
            <p className="px-2 py-1.5 text-2xs text-muted-foreground">Loading…</p>
          )}
          {!narrativeOptions.isLoading && narratives.length === 0 && (
            <p className="px-2 py-1.5 text-2xs text-muted-foreground">
              No narratives in this project yet.
            </p>
          )}
          {narratives.map((n) => (
            <DropdownMenuCheckboxItem
              key={n.id}
              checked={selectedNarratives.includes(n.id)}
              onCheckedChange={() => toggleNarrative(n.id)}
              onSelect={(e) => e.preventDefault()}
            >
              <span className="mr-1.5 font-mono text-2xs text-muted-foreground">
                #{n.display_id}
              </span>
              {truncate(n.title.text ?? 'Untitled narrative', 48)}
            </DropdownMenuCheckboxItem>
          ))}
          {selectedNarratives.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => onFiltersChange({ ...filters, narrative_id: undefined })}
              >
                Clear narrative filter
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="API keys" onClick={() => navigate('/settings/keys')}>
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>API keys</TooltipContent>
      </Tooltip>

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
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate('/kitchen-sink')}>
            Component kitchen sink
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-label="Signed in via API key"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary"
          >
            <User className="h-3.5 w-3.5 text-secondary-foreground" aria-hidden="true" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Authenticated by <code>X-API-Key</code>. Phase 5 has no user accounts.
        </TooltipContent>
      </Tooltip>
    </header>
  );
}
