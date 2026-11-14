import { NOT_MEASURED, NOT_MEASURED_HINT } from '@/lib/format';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * The em dash, with the reason attached.
 *
 * Anywhere the backend says a value is `null` or names a field in `missing[]`, this
 * renders instead of a number. It is a component rather than a string so the
 * explanation ("not measured on this platform") travels with it and an analyst is
 * never left guessing whether they are looking at a zero or an absence.
 */
export function NotMeasured({
  reason,
  className,
}: {
  reason?: string | undefined;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'cursor-help select-none text-muted-foreground underline decoration-dotted underline-offset-2',
            className,
          )}
          tabIndex={0}
        >
          <span aria-hidden="true">{NOT_MEASURED}</span>
          <span className="sr-only">{reason ?? NOT_MEASURED_HINT}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason ?? NOT_MEASURED_HINT}</TooltipContent>
    </Tooltip>
  );
}
