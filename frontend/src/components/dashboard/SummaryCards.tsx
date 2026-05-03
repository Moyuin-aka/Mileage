import { Package, Zap, Wallet, TrendingDown } from 'lucide-react'
import { DashboardStats } from '@/types'
import { formatCNY, formatDailyCost } from '@/lib/calculations'
import { cn } from '@/lib/utils'

interface SummaryCardsProps {
  stats: DashboardStats
}

export function SummaryCards({ stats }: SummaryCardsProps) {
  const cards = [
    {
      icon: Package,
      label: '使用中资产',
      value: `${stats.active_count}`,
      unit: '件',
      sub: `共 ${stats.total_items} 件记录`,
      accent: false,
    },
    {
      icon: Wallet,
      label: '总投入',
      value: formatCNY(stats.total_invested, 0),
      unit: '',
      sub: stats.total_expenses
        ? `含后续支出 ${formatCNY(stats.total_expenses, 0)}`
        : '历史购入总价',
      accent: false,
    },
    {
      icon: TrendingDown,
      label: '平均日均成本',
      value: formatDailyCost(stats.avg_daily_cost),
      unit: '元/天',
      sub: '所有使用中资产均值',
      accent: true,
    },
    {
      icon: Zap,
      label: '已归档',
      value: `${stats.retired_count + stats.sold_count}`,
      unit: '件',
      sub: `退役 ${stats.retired_count} · 转手 ${stats.sold_count}`,
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
              : 'bg-zinc-900 border-zinc-800',
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <p className={cn('text-2xs font-medium uppercase tracking-widest', accent ? 'text-accent/70' : 'text-zinc-600')}>
              {label}
            </p>
            <Icon className={cn('h-3.5 w-3.5', accent ? 'text-accent/50' : 'text-zinc-700')} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn('font-mono font-bold text-2xl leading-none', accent ? 'text-accent' : 'text-zinc-100')}>
              {value}
            </span>
            {unit && (
              <span className={cn('text-xs', accent ? 'text-accent/60' : 'text-zinc-500')}>{unit}</span>
            )}
          </div>
          <p className="text-2xs text-zinc-600 mt-2">{sub}</p>
        </div>
      ))}
    </div>
  )
}
