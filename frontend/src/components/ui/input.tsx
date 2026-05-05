import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefix?: string
  suffix?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, prefix, suffix, ...props }, ref) => {
    if (prefix || suffix) {
      return (
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-sm text-muted pointer-events-none select-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full rounded-lg bg-surface-3/60 border border-border-strong',
              'text-primary placeholder:text-muted',
              'text-sm h-10',
              'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60',
              'transition-colors duration-100',
              prefix ? 'pl-7' : 'px-3',
              suffix ? 'pr-10' : 'px-3',
              className,
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-sm text-muted pointer-events-none select-none">
              {suffix}
            </span>
          )}
        </div>
      )
    }

    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-lg bg-surface-3/60 border border-border-strong px-3',
          'text-primary placeholder:text-muted',
          'text-sm h-10',
          'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60',
          'transition-colors duration-100',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-lg bg-surface-3/60 border border-border-strong px-3 py-2.5',
      'text-primary placeholder:text-muted',
      'text-sm resize-none',
      'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60',
      'transition-colors duration-100',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'
