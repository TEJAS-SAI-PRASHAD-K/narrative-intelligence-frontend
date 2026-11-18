import type { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Explains a disabled write control. A disabled button receives no pointer or focus
 * events, so the tooltip hangs off a focusable wrapper instead. With no `reason` the
 * child renders untouched.
 */
export function WriteGate({
  reason,
  children,
}: {
  reason: string | undefined;
  children: ReactNode;
}) {
  if (!reason) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex rounded-md" data-write-gate="">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
