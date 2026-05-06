import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefix?: string
  suffix?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, prefix, suffix, ...props }, ref) => {
    if (prefix || suffix) {
      const affixPadding = getAffixPadding(prefix, suffix)
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
              affixPadding,
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

function getAffixPadding(prefix?: string, suffix?: string) {
  const leftPadding = prefix
    ? prefix.length >= 4
      ? 'pl-16'
      : prefix.length >= 3
        ? 'pl-12'
        : 'pl-8'
    : 'pl-3'

  const rightPadding = suffix
    ? suffix.length >= 3
      ? 'pr-14'
      : 'pr-10'
    : 'pr-3'

  return `${leftPadding} ${rightPadding}`
}

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
