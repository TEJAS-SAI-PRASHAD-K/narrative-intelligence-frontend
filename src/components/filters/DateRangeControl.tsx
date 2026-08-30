import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FilterSpec } from '@/lib/filters';

/**
 * Date range with the timezone rendered explicitly, always.
 *
 * "Last 7 days" means nothing without a zone -- a burst that looks like Tuesday
 * evening in UTC is Tuesday afternoon in New York, and an analyst comparing two
 * screenshots needs to know which. The zone label sits on the trigger itself, not
 * hidden in a settings panel.
 */

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Australia/Sydney',
] as const;

const PRESETS: { label: string; days: number }[] = [
  { label: 'Last 24 hours', days: 1 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DateRangeControl({
  filters,
  onChange,
}: {
  filters: FilterSpec;
  onChange: (patch: Partial<FilterSpec>) => void;
}) {
  const label =
    filters.date_from || filters.date_to
      ? `${filters.date_from ?? 'start'} → ${filters.date_to ?? 'now'}`
      : 'All time';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <CalendarDays className="h-3 w-3 opacity-70" aria-hidden="true" />
          <span className="tabular">{label}</span>
          {/* The zone, on the control, never implied. */}
          <span className="rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground">
            {filters.tz}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 space-y-3">
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              variant="secondary"
              size="sm"
              onClick={() => onChange({ date_from: isoDaysAgo(p.days), date_to: today() })}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="date-from">From</Label>
            <Input
              id="date-from"
              type="date"
              value={filters.date_from ?? ''}
              onChange={(e) => onChange({ date_from: e.target.value || undefined })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="date-to">To</Label>
            <Input
              id="date-to"
              type="date"
              value={filters.date_to ?? ''}
              onChange={(e) => onChange({ date_to: e.target.value || undefined })}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="tz-select">Timezone</Label>
          <Select value={filters.tz} onValueChange={(tz) => onChange({ tz })}>
            <SelectTrigger id="tz-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-2xs text-muted-foreground">
            Bucketing and every timestamp on screen are rendered in this zone.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => onChange({ date_from: undefined, date_to: undefined })}
        >
          Clear date range
        </Button>
      </PopoverContent>
    </Popover>
  );
}
