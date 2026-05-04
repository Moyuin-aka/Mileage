import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive as ArchiveIcon } from 'lucide-react'
import { ItemWithStats, ItemStatus } from '@/types'
import { useArchivedItems } from '@/hooks/useItems'
import { formatCNY, formatDailyCost } from '@/lib/calculations'
import { formatDate } from '@/lib/utils'
import { CategoryBadge, StatusBadge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/i18n'

type TabValue = 'all' | 'retired' | 'sold'

export function Archive() {
  const navigate = useNavigate()
  const { t, categoryLabels, statusLabels } = useLanguage()
  const { items, loading, error } = useArchivedItems()
  const [tab, setTab] = useState<TabValue>('all')

  const TABS: { value: TabValue; label: string }[] = [
    { value: 'all', label: t('archive.tabAll') },
    { value: 'retired', label: statusLabels.retired },
    { value: 'sold', label: statusLabels.sold },
  ]

  const filtered = useMemo(() => {
    if (tab === 'all') return items
    return items.filter(i => i.status === tab)
  }, [items, tab])

  const totalDays = items.reduce((sum, i) => sum + i.days_owned, 0)
  const avgDailyCost = totalDays > 0
    ? items.reduce((sum, i) => sum + i.total_cost, 0) / totalDays
    : 0
  const recovered = items
    .filter(i => i.status === 'sold')
    .reduce((sum, i) => sum + (i.sold_price ?? 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl text-zinc-100">{t('archive.title')}</h1>
        <p className="text-sm text-zinc-600 mt-0.5">{t('archive.subtitle')}</p>
      </div>

      {/* Archive summary */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-2xs text-zinc-600 uppercase tracking-widest mb-2">{t('archive.count')}</p>
            <p className="font-mono text-xl font-bold text-zinc-100">{items.length}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-2xs text-zinc-600 uppercase tracking-widest mb-2">{t('archive.avgDaily')}</p>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-xl font-bold text-accent">
                {formatDailyCost(avgDailyCost)}
              </span>
              <span className="text-zinc-600 text-xs">{t('archive.perDay')}</span>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-2xs text-zinc-600 uppercase tracking-widest mb-2">{t('archive.recovered')}</p>
            <p className="font-mono text-xl font-bold text-zinc-100">{formatCNY(recovered, 0)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
        {TABS.map(tab_ => (
          <button
            key={tab_.value}
            onClick={() => setTab(tab_.value)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-sm font-medium transition-colors',
              tab === tab_.value
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            {tab_.label}
            {tab_.value !== 'all' && (
              <span className="ml-1.5 text-2xs text-zinc-600">
                {items.filter(i => i.status === tab_.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-zinc-900 rounded-xl border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-red-400 text-sm">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyArchive status={tab} />
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <ArchivedItemRow
              key={item.id}
              item={item}
              categoryLabel={categoryLabels[item.category]}
              statusLabel={statusLabels[item.status as ItemStatus]}
              onClick={() => navigate(`/item/${item.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ArchivedItemRow({
  item,
  categoryLabel,
  statusLabel,
  onClick,
}: {
  item: ItemWithStats
  categoryLabel: string
  statusLabel: string
  onClick: () => void
}) {
  const { t } = useLanguage()

  const endLabel =
    item.status === 'sold' && item.sold_price != null
      ? t('archive.soldFor', { price: formatCNY(item.sold_price, 0) })
      : item.retired_at
      ? t('archive.retiredOn', { date: formatDate(item.retired_at) })
      : ''

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/80 hover:border-zinc-700 transition-all p-5"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-serif text-zinc-100 text-sm leading-snug truncate">{item.name}</h3>
          <div className="flex items-center gap-2 mt-1.5">
            <CategoryBadge category={item.category} label={categoryLabel} />
            <StatusBadge status={item.status as ItemStatus} label={statusLabel} />
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xs text-zinc-600 mb-0.5">{t('archive.finalDaily')}</p>
          <div className="flex items-baseline gap-1 justify-end">
            <span className="font-mono font-bold text-lg text-accent">
              {formatDailyCost(item.daily_cost)}
            </span>
            <span className="text-zinc-600 text-xs">{t('archive.perDay')}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-600">
        <span>
          {t('archive.held')}{' '}
          <span className="text-zinc-400 tabular-nums font-medium">{item.days_owned}</span>{' '}
          {t('archive.daysUnit')} ·{' '}
          {t('archive.totalCostLabel')}{' '}
          <span className="text-zinc-400 tabular-nums">{formatCNY(item.total_cost, 0)}</span>
        </span>
        {endLabel && <span className="text-zinc-700">{endLabel}</span>}
      </div>
    </button>
  )
}

function EmptyArchive({ status }: { status: TabValue }) {
  const { t } = useLanguage()
  const labels: Record<TabValue, string> = {
    all: t('archive.emptyAll'),
    retired: t('archive.emptyRetired'),
    sold: t('archive.emptySold'),
  }
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
        <ArchiveIcon className="h-5 w-5 text-zinc-600" />
      </div>
      <p className="font-serif text-zinc-400 text-base">{labels[status]}</p>
      <p className="text-zinc-600 text-sm mt-1">{t('archive.emptyHint')}</p>
    </div>
  )
}
