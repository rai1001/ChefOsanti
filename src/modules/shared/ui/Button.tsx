
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-500 text-bg shadow-[0_12px_30px_rgb(var(--accent)/0.32)] hover:bg-brand-600 active:scale-[0.99]',
        secondary:
          'bg-surface2 text-foreground border border-border/30 hover:border-border/50 hover:bg-surface2/80',
        outline:
          'border border-border/40 bg-transparent text-foreground hover:border-brand-500 hover:text-foreground hover:bg-surface/50',
        ghost: 'bg-transparent text-foreground hover:bg-surface/60 border border-transparent',
        danger:
          'bg-danger/80 text-white shadow-[0_10px_28px_rgb(var(--danger)/0.3)] hover:bg-danger active:scale-[0.99]',
        link: 'text-brand-500 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 rounded-md',
        md: 'h-11 px-4',
        lg: 'h-12 px-6 rounded-xl',
        icon: 'h-10 w-10 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button }
