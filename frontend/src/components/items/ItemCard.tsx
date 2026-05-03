import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { ItemWithStats, CATEGORY_LABELS } from '@/types'
import { formatDailyCost, formatCNY } from '@/lib/calculations'
import { CategoryBadge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ItemCardProps {
  item: ItemWithStats
}

export function ItemCard({ item }: ItemCardProps) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/item/${item.id}`)}
      className={cn(
        'w-full text-left rounded-xl border transition-all duration-150',
        'bg-zinc-900 hover:bg-zinc-800/80',
        item.is_overdue
          ? 'border-amber-900/60 hover:border-amber-800/80'
          : 'border-zinc-800 hover:border-zinc-700',
        'p-5 group animate-fade-in',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="font-serif text-zinc-100 text-base leading-snug truncate group-hover:text-white transition-colors">
            {item.name}
          </h3>
          <div className="mt-1.5">
            <CategoryBadge category={item.category} label={CATEGORY_LABELS[item.category]} />
          </div>
        </div>

        {item.is_overdue && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-950 border border-amber-900 text-amber-400 text-2xs font-medium shrink-0">
            <AlertTriangle className="h-2.5 w-2.5" />
            超期
          </span>
        )}
      </div>

      {/* Daily cost — the hero metric */}
      <div className="mb-4">
        <p className="text-2xs text-zinc-600 uppercase tracking-widest mb-1">日均成本</p>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-3xl font-bold text-accent leading-none">
            {formatDailyCost(item.daily_cost)}
          </span>
          <span className="text-zinc-500 text-sm">元/天</span>
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between text-xs">
        <div className="text-zinc-500">
          已使用{' '}
          <span className="text-zinc-300 font-medium tabular-nums">{item.days_owned}</span>{' '}
          天
        </div>
        <div className="text-zinc-600">
          购入{' '}
          <span className="text-zinc-400 tabular-nums">{formatCNY(item.purchase_price, 0)}</span>
        </div>
      </div>

      {/* Expected years progress bar */}
      {item.expected_years && (
        <div className="mt-3">
          <div className="h-0.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                item.is_overdue ? 'bg-amber-600' : 'bg-accent/40',
              )}
              style={{
                width: `${Math.min(100, (item.days_owned / (item.expected_years * 365)) * 100).toFixed(1)}%`,
              }}
            />
          </div>
          <p className="text-2xs text-zinc-700 mt-1">
            {item.is_overdue
              ? `已超出预期使用年限 ${(item.days_owned / 365 - item.expected_years).toFixed(1)} 年`
              : `预计还可用 ${(item.expected_years - item.days_owned / 365).toFixed(1)} 年`}
          </p>
        </div>
      )}
    </button>
  )
}
