import { Link2, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { PAGE_GUTTER } from '@/components/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { activeChips, type FilterChip, type FilterKey, type FilterSpec } from '@/lib/filters';
import { cn } from '@/lib/utils';
import { AdvancedFilters } from './AdvancedFilters';
import { DateRangeControl } from './DateRangeControl';

/**
 * Sticky filter bar. It owns nothing -- it reads the FilterSpec it is handed and calls
 * back with a patch, and the URL is what actually changes. Copying the address bar
 * reproduces this exact view, chips included.
 */
export function FilterBar({
  filters,
  onChange,
  onReset,
  resolveChipLabel,
  children,
  className,
}: {
  filters: FilterSpec;
  onChange: (patch: Partial<FilterSpec>) => void;
  onReset: () => void;
  /** Turns an id chip into a readable name, e.g. narrative id -> title. */
  resolveChipLabel?: (key: FilterKey, value: string) => string | undefined;
  /** Page-specific controls (sort, group-by) sit inline with the shared ones. */
  children?: ReactNode;
  className?: string;
}) {
  const chips = activeChips(filters, resolveChipLabel);
  const [copied, setCopied] = useState(false);

  function copyLink() {
    void navigator.clipboard?.writeText(window.location.href).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => setCopied(false),
    );
  }

  return (
    <div
      className={cn(
        // Sticks under the page header once the header scrolls away, so the controls
        // that shape the rows below are always in reach.
        'sticky top-0 z-30 border-y border-border bg-background/80 py-2.5 backdrop-blur-md',
        PAGE_GUTTER,
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeControl filters={filters} onChange={onChange} />

        <Input
          aria-label="Search"
          placeholder="Search…"
          value={filters.q ?? ''}
          onChange={(e) => onChange({ q: e.target.value || undefined })}
          className="h-8 w-48"
        />

        <AdvancedFilters filters={filters} onChange={onChange} onReset={onReset} />

        {children}

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={copyLink}>
              <Link2 className="h-3 w-3" aria-hidden="true" />
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Copies this exact view — every filter is in the URL, so a colleague opening the link
            sees the same rows.
          </TooltipContent>
        </Tooltip>
      </div>

      {chips.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="sr-only">Active filters</span>
          {chips.map((chip) => (
            <ChipButton
              key={`${chip.key}:${chip.value ?? ''}`}
              chip={chip}
              onChange={onChange}
              filters={filters}
            />
          ))}
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset all
          </Button>
        </div>
      )}
    </div>
  );
}

function ChipButton({
  chip,
  filters,
  onChange,
}: {
  chip: FilterChip;
  filters: FilterSpec;
  onChange: (patch: Partial<FilterSpec>) => void;
}) {
  function remove() {
    if (chip.key === 'include_shared') {
      onChange({ include_shared: true });
      return;
    }
    if (chip.value !== undefined) {
      const current = (filters[chip.key] as string[] | undefined) ?? [];
      const next = current.filter((v) => v !== chip.value);
      onChange({ [chip.key]: next.length > 0 ? next : undefined });
      return;
    }
    onChange({ [chip.key]: undefined });
  }

  return (
    <Badge variant="outline" className="gap-1 py-1 pr-1">
      <span className="max-w-[18rem] truncate">{chip.label}</span>
      <button
        type="button"
        onClick={remove}
        aria-label={`Remove filter ${chip.label}`}
        className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-2.5 w-2.5" aria-hidden="true" />
      </button>
    </Badge>
  );
}
