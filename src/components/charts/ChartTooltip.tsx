import { formatCount, NOT_MEASURED } from '@/lib/format';

/**
 * Shape Recharts hands to a custom tooltip `content`. Declared locally rather than
 * imported: recharts' own `TooltipProps` moved these fields behind a context type in
 * v3, and this is the contract the component actually consumes.
 */
export interface ChartTooltipEntry {
  dataKey?: string | number;
  name?: string;
  value?: number | string | null;
  color?: string;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string | number;
  labelFormatter?: (label: string) => string;
}

/**
 * Shared tooltip. A `null` value is labelled with the em dash rather than coerced --
 * the point is dropped from the line, but the reader still deserves to know the
 * bucket exists with no measurement in it.
 */
export function ChartTooltip({ active, payload, label, labelFormatter }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const labelText = String(label ?? '');

  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-2 shadow-lg">
      <p className="mb-1 text-2xs font-medium text-muted-foreground">
        {labelFormatter ? labelFormatter(labelText) : labelText}
      </p>
      <ul className="space-y-0.5">
        {payload.map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center gap-2 text-2xs">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ background: entry.color }}
            />
            <span className="min-w-0 flex-1 truncate">{entry.name}</span>
            <span className="tabular font-medium">
              {entry.value === null || entry.value === undefined
                ? NOT_MEASURED
                : formatCount(Number(entry.value))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
