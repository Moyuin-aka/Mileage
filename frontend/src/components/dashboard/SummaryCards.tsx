import { Package, Zap, Wallet, TrendingDown } from 'lucide-react'
import { DashboardStats } from '@/types'
import { formatCNY, formatDailyCost } from '@/lib/calculations'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/i18n'

interface SummaryCardsProps {
  stats: DashboardStats
}

export function SummaryCards({ stats }: SummaryCardsProps) {
  const { t } = useLanguage()

  const cards = [
    {
      icon: Package,
      label: t('summary.activeAssets'),
      value: `${stats.active_count}`,
      unit: t('summary.unit'),
      sub: t('summary.totalItems', { n: stats.total_items }),
      accent: false,
    },
    {
      icon: Wallet,
      label: t('summary.totalInvested'),
      value: formatCNY(stats.total_invested, 0),
      unit: '',
      sub: stats.total_expenses
        ? t('summary.inclExpenses', { amount: formatCNY(stats.total_expenses, 0) })
        : t('summary.totalPurchase'),
      accent: false,
    },
    {
      icon: TrendingDown,
      label: t('summary.avgDailyCost'),
      value: formatDailyCost(stats.avg_daily_cost),
      unit: t('summary.perDay'),
      sub: t('summary.avgAllActive'),
      accent: true,
    },
    {
      icon: Zap,
      label: t('summary.archived'),
      value: `${stats.retired_count + stats.sold_count}`,
      unit: t('summary.unit'),
      sub: t('summary.retiredSold', { retired: stats.retired_count, sold: stats.sold_count }),
      accent: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ icon: Icon, label, value, unit, sub, accent }) => (
        <div
          key={label}
          className={cn(
            'rounded-xl border p-4',
            accent
              ? 'bg-accent-bg border-accent-muted'
              : 'bg-surface-2 border-app-border',
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <p className={cn('text-2xs font-medium uppercase tracking-widest', accent ? 'text-accent/70' : 'text-muted')}>
              {label}
            </p>
            <Icon className={cn('h-3.5 w-3.5', accent ? 'text-accent/50' : 'text-muted')} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn('font-mono font-bold text-2xl leading-none', accent ? 'text-accent' : 'text-primary')}>
              {value}
            </span>
            {unit && (
              <span className={cn('text-xs', accent ? 'text-accent/60' : 'text-muted')}>{unit}</span>
            )}
          </div>
          <p className="text-2xs text-muted mt-2">{sub}</p>
        </div>
      ))}
    </div>
  )
}
