import * as React from 'react'
import { cn } from '@/lib/utils'
import { ItemCategory, ItemStatus } from '@/types'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'warn' | 'muted' | 'active' | 'retired' | 'sold'
}

const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
  accent:  'bg-accent-bg text-accent border border-accent-muted',
  warn:    'bg-warn-bg text-warn border border-amber-800',
  muted:   'bg-zinc-900 text-zinc-500 border border-zinc-800',
  active:  'bg-emerald-950 text-emerald-400 border border-emerald-900',
  retired: 'bg-zinc-800 text-zinc-500 border border-zinc-700',
  sold:    'bg-blue-950 text-blue-400 border border-blue-900',
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium tracking-wide',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

const CATEGORY_COLORS: Record<ItemCategory, BadgeProps['variant']> = {
  electronics: 'default',
  appliances: 'default',
  furniture: 'default',
  transportation: 'default',
  other: 'muted',
}

const STATUS_VARIANTS: Record<ItemStatus, BadgeProps['variant']> = {
  active: 'active',
  retired: 'retired',
  sold: 'sold',
}

export function CategoryBadge({ category, label }: { category: ItemCategory; label: string }) {
  return <Badge variant={CATEGORY_COLORS[category]}>{label}</Badge>
}

export function StatusBadge({ status, label }: { status: ItemStatus; label: string }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{label}</Badge>
}
