import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { ItemWithStats } from '@/types'
import { formatDailyCost, formatCNY } from '@/lib/calculations'
import {
  inferCostBenchmark,
  isPeripheralProfile,
  loadCostBenchmarkKeywords,
} from '@/lib/costBenchmarks'
import { CategoryBadge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/i18n'

interface ItemCardProps {
  item: ItemWithStats
}

export function ItemCard({ item }: ItemCardProps) {
  const navigate = useNavigate()
  const { t, categoryLabels } = useLanguage()

  // Detect if this is a peripheral in over-service (bonus) mode
  const benchmark = inferCostBenchmark(item, loadCostBenchmarkKeywords())
  const isPeripheral = benchmark != null && isPeripheralProfile(benchmark.profile)
  const expectedDays = item.expected_years ? item.expected_years * 365 : null
  const isOverService = isPeripheral && expectedDays != null && item.days_owned > expectedDays
  const overServiceDays = isOverService ? Math.round(item.days_owned - expectedDays!) : 0

  return (
    <button
      onClick={() => navigate(`/item/${item.id}`)}
      className={cn(
        'w-full text-left rounded-xl border transition-all duration-150',
        'bg-surface-2 hover:bg-surface-3/80',
        isOverService
          ? 'border-warn/30 hover:border-warn/50'
          : item.is_overdue
          ? 'border-warn-border hover:border-warn'
          : 'border-app-border hover:border-border-strong',
        'p-5 group animate-fade-in',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="font-serif text-primary text-base leading-snug truncate group-hover:text-primary transition-colors">
            {item.name}
          </h3>
          <div className="mt-1.5">
            <CategoryBadge category={item.category} label={categoryLabels[item.category]} />
          </div>
        </div>

        {isOverService ? (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-warn-bg border border-warn-border text-warn text-2xs font-medium shrink-0">
            {t('peripheral.overService')}
          </span>
        ) : item.is_overdue ? (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-warn-bg border border-warn-border text-warn text-2xs font-medium shrink-0">
            <AlertTriangle className="h-2.5 w-2.5" />
            {t('item.overdue')}
          </span>
        ) : null}
      </div>

      {/* Daily cost — the hero metric */}
      <div className="mb-4">
        <p className="text-2xs text-muted uppercase tracking-widest mb-1">{t('item.dailyCost')}</p>
        <div className="flex items-baseline gap-1.5">
          <span className={cn(
            'font-mono text-3xl font-bold leading-none',
            isOverService ? 'text-warn' : 'text-accent',
          )}>
            {formatDailyCost(item.daily_cost)}
          </span>
          <span className="text-muted text-sm">{t('item.perDay')}</span>
        </div>
        {isOverService && (
          <p className="text-2xs text-warn/80 mt-1">
            {t('peripheral.bonusDays', { days: overServiceDays })}
          </p>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between text-xs">
        <div className="text-muted">
          {t('item.usedDays')}{' '}
          <span className="text-secondary font-medium tabular-nums">{item.days_owned}</span>{' '}
          {t('item.days')}
        </div>
        <div className="text-muted">
          {t('item.purchased')}{' '}
          <span className="text-muted tabular-nums">{formatCNY(item.purchase_price, 0)}</span>
        </div>
      </div>

      {/* Expected years progress bar */}
      {item.expected_years && (
        <div className="mt-3">
          <div className="h-0.5 w-full bg-surface-3 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                item.is_overdue ? 'bg-warn' : 'bg-accent/40',
              )}
              style={{
                width: `${Math.min(100, (item.days_owned / (item.expected_years * 365)) * 100).toFixed(1)}%`,
              }}
            />
          </div>
          <p className="text-2xs text-muted mt-1">
            {item.is_overdue
              ? t('item.overExpected', { years: (item.days_owned / 365 - item.expected_years).toFixed(1) })
              : t('item.remaining', { years: (item.expected_years - item.days_owned / 365).toFixed(1) })}
          </p>
        </div>
      )}
    </button>
  )
}
