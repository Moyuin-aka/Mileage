import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal, PlusCircle, TrendingDown } from 'lucide-react'
import { ItemWithStats, SortKey, ItemCategory, CATEGORY_LABELS } from '@/types'
import { useDashboard } from '@/hooks/useItems'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { ItemCard } from '@/components/items/ItemCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'daily_cost', label: '日均成本' },
  { key: 'purchase_date', label: '购入日期' },
  { key: 'purchase_price', label: '购入价格' },
]

const ALL_CATEGORIES: ItemCategory[] = [
  'electronics', 'appliances', 'furniture', 'transportation', 'other',
]

function Skeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 animate-pulse">
      <div className="h-4 w-1/2 bg-zinc-800 rounded mb-3" />
      <div className="h-3 w-1/4 bg-zinc-800 rounded mb-6" />
      <div className="h-8 w-1/3 bg-zinc-800 rounded mb-4" />
      <div className="flex justify-between">
        <div className="h-3 w-1/4 bg-zinc-800 rounded" />
        <div className="h-3 w-1/4 bg-zinc-800 rounded" />
      </div>
    </div>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const { stats, loading, error } = useDashboard()
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('daily_cost')
  const [activeCategory, setActiveCategory] = useState<ItemCategory | 'all'>('all')

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
      // purchase_date: newest first
      return new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
    })
  }, [stats, query, sortKey, activeCategory])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl text-zinc-100">资产总览</h1>
          <p className="text-sm text-zinc-600 mt-0.5">持续持有，让时间摊薄成本</p>
        </div>
        <Button
          variant="accent"
          size="sm"
          className="shrink-0 lg:hidden"
          onClick={() => navigate('/add')}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          新增
        </Button>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 animate-pulse">
              <div className="h-3 w-2/3 bg-zinc-800 rounded mb-4" />
              <div className="h-7 w-1/2 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-red-400 text-sm">
          {error}
        </div>
      ) : stats ? (
        <SummaryCards stats={stats} />
      ) : null}

      {/* Filter & sort controls */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
          <Input
            placeholder="搜索物品名称、渠道…"
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
                ? 'bg-zinc-700 border-zinc-600 text-zinc-100'
                : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300',
            )}
          >
            全部
          </button>
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                activeCategory === cat
                  ? 'bg-zinc-700 border-zinc-600 text-zinc-100'
                  : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300',
              )}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
          <div className="flex gap-1.5">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setSortKey(opt.key)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs transition-colors',
                  sortKey === opt.key
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-600 hover:text-zinc-400',
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
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-12 w-12 rounded-2xl bg-accent-bg border border-accent-muted flex items-center justify-center mb-4">
        <TrendingDown className="h-6 w-6 text-accent" />
      </div>
      {query ? (
        <>
          <p className="font-serif text-zinc-300 text-lg mb-1">没有找到匹配的物品</p>
          <p className="text-zinc-600 text-sm">试试换个关键词搜索</p>
        </>
      ) : (
        <>
          <p className="font-serif text-zinc-300 text-lg mb-1">还没有记录任何资产</p>
          <p className="text-zinc-600 text-sm mb-6">添加你的第一件物品，开始追踪每日成本</p>
          <Button variant="accent" onClick={onAdd}>
            <PlusCircle className="h-4 w-4" />
            添加物品
          </Button>
        </>
      )}
    </div>
  )
}
