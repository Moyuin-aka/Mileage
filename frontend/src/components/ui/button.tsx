import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'accent'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  asChild?: boolean
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  default:
    'bg-surface-3 text-primary hover:bg-surface-hover border border-app-border',
  accent:
    'bg-accent text-zinc-950 font-medium hover:bg-accent-dim',
  outline:
    'border border-border-strong text-secondary hover:bg-surface-3 hover:text-primary',
  ghost:
    'text-muted hover:text-primary hover:bg-surface-3',
  destructive:
    'bg-danger-bg text-danger hover:bg-danger-bg-hover border border-danger-border',
}

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  md: 'h-9 px-4 text-sm rounded-lg gap-2',
  lg: 'h-11 px-6 text-base rounded-lg gap-2',
  icon: 'h-9 w-9 rounded-lg',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center',
          'transition-colors duration-100',
          'disabled:opacity-50 disabled:pointer-events-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
