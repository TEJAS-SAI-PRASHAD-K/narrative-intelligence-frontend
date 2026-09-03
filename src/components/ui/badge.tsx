import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-1.5 py-[0.1875rem] text-2xs font-medium leading-none transition-colors',
  {
    variants: {
      variant: {
        default: 'border-primary/30 bg-primary/15 text-primary',
        outline: 'border-border text-foreground',
        muted: 'border-transparent bg-muted text-muted-foreground',
        // Risk roles resolve to the same tokens on every page, by construction.
        'risk-high': 'border-risk-high/40 bg-risk-high-bg text-risk-high',
        'risk-med': 'border-risk-med/40 bg-risk-med-bg text-risk-med',
        'risk-low': 'border-risk-low/40 bg-risk-low-bg text-risk-low',
        'risk-none': 'border-risk-none/40 bg-risk-none-bg text-risk-none',
        ai: 'border-ai/40 bg-ai-bg text-ai',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/** forwardRef so a Radix `asChild` trigger (tooltip, popover) can attach to it. */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
  ),
);
Badge.displayName = 'Badge';

export { badgeVariants };
