import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal, PlusCircle, TrendingDown } from 'lucide-react'
import { ItemWithStats, SortKey, ItemCategory } from '@/types'
import { useDashboard } from '@/hooks/useItems'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { ItemCard } from '@/components/items/ItemCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/i18n'

const ALL_CATEGORIES: ItemCategory[] = [
  'electronics', 'appliances', 'furniture', 'transportation', 'other',
]

function Skeleton() {
  return (
    <div className="rounded-xl border border-app-border bg-surface-2 p-5 animate-pulse">
      <div className="h-4 w-1/2 bg-surface-3 rounded mb-3" />
      <div className="h-3 w-1/4 bg-surface-3 rounded mb-6" />
      <div className="h-8 w-1/3 bg-surface-3 rounded mb-4" />
      <div className="flex justify-between">
        <div className="h-3 w-1/4 bg-surface-3 rounded" />
        <div className="h-3 w-1/4 bg-surface-3 rounded" />
      </div>
    </div>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const { t, categoryLabels } = useLanguage()
  const { stats, loading, error } = useDashboard()
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('daily_cost')
  const [activeCategory, setActiveCategory] = useState<ItemCategory | 'all'>('all')

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'daily_cost', label: t('sort.dailyCost') },
    { key: 'purchase_date', label: t('sort.purchaseDate') },
    { key: 'purchase_price', label: t('sort.purchasePrice') },
  ]

  const filtered = useMemo<ItemWithStats[]>(() => {
    if (!stats) return []
    let items = stats.items.filter(i => i.status === 'active')

    if (activeCategory !== 'all') {
      items = items.filter(i => i.category === activeCategory)
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      items = items.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.purchase_channel?.toLowerCase().includes(q) ||
          i.notes?.toLowerCase().includes(q),
      )
    }

    return [...items].sort((a, b) => {
      if (sortKey === 'daily_cost') return b.daily_cost - a.daily_cost
      if (sortKey === 'purchase_price') return b.purchase_price - a.purchase_price
      return new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
    })
  }, [stats, query, sortKey, activeCategory])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl text-primary">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted mt-0.5">{t('dashboard.subtitle')}</p>
        </div>
        <Button
          variant="accent"
          size="sm"
          className="shrink-0 lg:hidden"
          onClick={() => navigate('/add')}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          {t('dashboard.new')}
        </Button>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-app-border bg-surface-2 p-4 animate-pulse">
              <div className="h-3 w-2/3 bg-surface-3 rounded mb-4" />
              <div className="h-7 w-1/2 bg-surface-3 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-danger-border bg-danger-bg p-4 text-danger text-sm">
          {error}
        </div>
      ) : stats ? (
        <SummaryCards stats={stats} />
      ) : null}

      {/* Filter & sort controls */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
          <Input
            placeholder={t('dashboard.search')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              activeCategory === 'all'
                ? 'bg-surface-hover border-border-strong text-primary'
                : 'border-app-border text-muted hover:border-border-strong hover:text-secondary',
            )}
          >
            {t('dashboard.all')}
          </button>
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                activeCategory === cat
                  ? 'bg-surface-hover border-border-strong text-primary'
                  : 'border-app-border text-muted hover:border-border-strong hover:text-secondary',
              )}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted shrink-0" />
          <div className="flex gap-1.5">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setSortKey(opt.key)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs transition-colors',
                  sortKey === opt.key
                    ? 'bg-surface-3 text-primary'
                    : 'text-muted hover:text-secondary',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Item grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState query={query} onAdd={() => navigate('/add')} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ query, onAdd }: { query: string; onAdd: () => void }) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-12 w-12 rounded-2xl bg-accent-bg border border-accent-muted flex items-center justify-center mb-4">
        <TrendingDown className="h-6 w-6 text-accent" />
      </div>
      {query ? (
        <>
          <p className="font-serif text-secondary text-lg mb-1">{t('dashboard.emptyNoMatch')}</p>
          <p className="text-muted text-sm">{t('dashboard.emptyNoMatchHint')}</p>
        </>
      ) : (
        <>
          <p className="font-serif text-secondary text-lg mb-1">{t('dashboard.emptyNoItems')}</p>
          <p className="text-muted text-sm mb-6">{t('dashboard.emptyNoItemsHint')}</p>
          <Button variant="accent" onClick={onAdd}>
            <PlusCircle className="h-4 w-4" />
            {t('dashboard.addItem')}
          </Button>
        </>
      )}
    </div>
  )
}
