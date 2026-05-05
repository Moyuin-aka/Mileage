import * as React from 'react'
import { cn } from '@/lib/utils'
import { ItemCategory, ItemStatus } from '@/types'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'warn' | 'muted' | 'active' | 'retired' | 'sold'
}

const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-surface-3 text-muted border border-border-strong',
  accent:  'bg-accent-bg text-accent border border-accent-muted',
  warn:    'bg-warn-bg text-warn border border-warn-border',
  muted:   'bg-surface-2 text-muted border border-app-border',
  active:  'bg-success-bg text-success border border-success-border',
  retired: 'bg-surface-3 text-muted border border-border-strong',
  sold:    'bg-info-bg text-info border border-info-border',
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
