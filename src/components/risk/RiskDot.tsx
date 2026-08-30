import { cn } from '@/lib/utils';
import type { RiskLevel } from './riskLevel';

/**
 * Risk level as colour AND shape AND text. Never colour alone.
 *
 * Analysts print these screens and read them in grayscale, so each level gets a
 * distinct glyph (filled / half / hollow / dash) that survives desaturation, and the
 * text label is always rendered next to it.
 */

const GLYPH: Record<RiskLevel, string> = {
  high: '●',
  medium: '◐',
  low: '○',
  none: '–',
};

const COLOUR: Record<RiskLevel, string> = {
  high: 'text-risk-high',
  medium: 'text-risk-med',
  low: 'text-risk-low',
  none: 'text-risk-none',
};

const LABEL: Record<RiskLevel, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'Not measured',
};

export function RiskDot({
  level,
  label,
  className,
  showLabel = true,
}: {
  level: RiskLevel;
  /** Overrides the default word, e.g. the numeric score. The glyph still encodes level. */
  label?: string;
  className?: string;
  showLabel?: boolean;
}) {
  const text = label ?? LABEL[level];
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap', className)}>
      <span aria-hidden="true" className={cn('text-[10px] leading-none', COLOUR[level])}>
        {GLYPH[level]}
      </span>
      {showLabel ? (
        <span className={cn('text-xs', level === 'none' && 'text-muted-foreground')}>{text}</span>
      ) : (
        <span className="sr-only">{text}</span>
      )}
    </span>
  );
}
