import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
  {
    variants: {
      variant: {
        neutral: 'bg-surface/50 border-border/40 text-foreground',
        success: 'bg-success/15 border-success/40 text-success',
        warning: 'bg-warning/15 border-warning/40 text-warning',
        danger: 'bg-danger/15 border-danger/40 text-danger',
        info: 'bg-accent/10 border-accent/40 text-accent',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
)

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant, ...props }, ref) => {
  return <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
})
Badge.displayName = 'Badge'
