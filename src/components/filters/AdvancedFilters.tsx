import { SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { countActiveFilters, type ArrayFilterKey, type FilterSpec } from '@/lib/filters';
import { humanizeEnum } from '@/lib/format';

/** Vocabularies the contract fixes. Nothing here is invented by the frontend. */
const SENTIMENTS = ['positive', 'neutral', 'negative'] as const;
const EMOTIONS = ['fear', 'anger', 'disgust', 'happiness', 'surprise', 'sadness', 'neutral'] as const;
const CONTENT_TYPES = ['post', 'comment', 'article', 'video', 'video_comment'] as const;
const LANGS = ['en', 'es', 'fr', 'de', 'pt', 'ru', 'ar', 'hi'] as const;

/**
 * The advanced builder behind the "Filters" button. Writes the same URL as every
 * other control; the sheet holds no draft state of its own, so a change applies
 * immediately and the back button undoes it.
 */
export function AdvancedFilters({
  filters,
  onChange,
  onReset,
}: {
  filters: FilterSpec;
  onChange: (patch: Partial<FilterSpec>) => void;
  onReset: () => void;
}) {
  const count = countActiveFilters(filters);

  function toggle(key: ArrayFilterKey, value: string) {
    const current = filters[key] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ [key]: next.length > 0 ? next : undefined });
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <SlidersHorizontal className="h-3 w-3 opacity-70" aria-hidden="true" />
          Filters
          {count > 0 && <Badge variant="default">{count}</Badge>}
        </Button>
      </SheetTrigger>

      <SheetContent aria-describedby="advanced-filters-desc">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription id="advanced-filters-desc">
            Every filter here is written to the URL. Copy the address bar to share this exact
            view.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-5">
          <Group label="Search">
            <Input
              aria-label="Free-text search"
              placeholder="Search post text…"
              value={filters.q ?? ''}
              onChange={(e) => onChange({ q: e.target.value || undefined })}
            />
          </Group>

          <CheckGroup
            label="Sentiment"
            values={SENTIMENTS}
            selected={filters.sentiment ?? []}
            onToggle={(v) => toggle('sentiment', v)}
          />

          <CheckGroup
            label="Emotion"
            values={EMOTIONS}
            selected={filters.emotion ?? []}
            onToggle={(v) => toggle('emotion', v)}
          />

          <CheckGroup
            label="Content type"
            values={CONTENT_TYPES}
            selected={filters.content_type ?? []}
            onToggle={(v) => toggle('content_type', v)}
          />

          <CheckGroup
            label="Language"
            values={LANGS}
            selected={filters.lang ?? []}
            onToggle={(v) => toggle('lang', v)}
          />

          <ThresholdGroup
            label="Minimum toxicity"
            value={filters.min_toxicity}
            onChange={(v) => onChange({ min_toxicity: v })}
            hint="Posts whose toxicity was not measured are excluded by any floor, including 0."
          />

          <ThresholdGroup
            label="Minimum risk"
            value={filters.min_risk}
            onChange={(v) => onChange({ min_risk: v })}
            hint="Applies to the subject's risk score, not to individual posts."
          />

          <Group label="Flags">
            <TriToggle
              id="is-anomalous"
              label="Anomalous"
              value={filters.is_anomalous}
              onChange={(v) => onChange({ is_anomalous: v })}
            />
            <TriToggle
              id="is-bot-like"
              label="Bot-like"
              value={filters.is_bot_like}
              onChange={(v) => onChange({ is_bot_like: v })}
            />
            <div className="flex items-center justify-between gap-3 py-1">
              <Label htmlFor="include-shared" className="normal-case tracking-normal">
                Include shared content
              </Label>
              <Switch
                id="include-shared"
                checked={filters.include_shared}
                onCheckedChange={(checked) => onChange({ include_shared: checked })}
              />
            </div>
          </Group>
        </SheetBody>

        <SheetFooter>
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset all
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </legend>
      {children}
    </fieldset>
  );
}

function CheckGroup({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <Group label={label}>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {values.map((v) => {
          const id = `${label}-${v}`.replace(/\s+/g, '-').toLowerCase();
          return (
            <div key={v} className="flex items-center gap-1.5">
              <Checkbox
                id={id}
                checked={selected.includes(v)}
                onCheckedChange={() => onToggle(v)}
              />
              <Label htmlFor={id} className="cursor-pointer normal-case tracking-normal">
                {humanizeEnum(v)}
              </Label>
            </div>
          );
        })}
      </div>
    </Group>
  );
}

function ThresholdGroup({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  hint: string;
}) {
  const active = value !== undefined;
  return (
    <Group label={label}>
      <div className="flex items-center gap-3">
        <Slider
          aria-label={label}
          min={0}
          max={1}
          step={0.05}
          value={[value ?? 0]}
          onValueChange={([v]) => onChange(v)}
          className="flex-1"
        />
        <span className="w-10 shrink-0 tabular text-xs">
          {active ? (value as number).toFixed(2) : '—'}
        </span>
        {active && (
          <Button variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            Clear
          </Button>
        )}
      </div>
      <p className="text-2xs text-muted-foreground">{hint}</p>
    </Group>
  );
}

/**
 * Three states, not two: yes / no / unset. `is_anomalous=false` is a real filter
 * ("show me the ones that are not flagged") and is not the same as not filtering.
 */
function TriToggle({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
}) {
  const options: { label: string; value: boolean | undefined }[] = [
    { label: 'Any', value: undefined },
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span id={`${id}-label`} className="text-xs">
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex gap-1">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={
              value === opt.value
                ? 'rounded-sm bg-primary px-2 py-0.5 text-2xs text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring'
                : 'rounded-sm bg-secondary px-2 py-0.5 text-2xs text-secondary-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
