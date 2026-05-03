import { useState, useEffect, useCallback } from 'react'
import { ExpenseFormData, Item, ItemWithStats, DashboardStats, ItemFormData } from '@/types'
import { api } from '@/lib/api'
import { computeItemStats } from '@/lib/calculations'
import { MOCK_ITEMS } from '@/lib/mock'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

/** Compute dashboard stats client-side from raw items */
function buildDashboardStats(items: Item[]): DashboardStats {
  const withStats = items.map(computeItemStats)
  const active = withStats.filter(i => i.status === 'active')

  return {
    total_items: items.length,
    active_count: active.length,
    retired_count: items.filter(i => i.status === 'retired').length,
    sold_count: items.filter(i => i.status === 'sold').length,
    total_invested: withStats.reduce(
      (sum, i) => sum + i.purchase_price + (i.expense_total ?? 0),
      0,
    ),
    total_expenses: withStats.reduce((sum, i) => sum + (i.expense_total ?? 0), 0),
    avg_daily_cost: active.length
      ? active.reduce((sum, i) => sum + i.daily_cost, 0) / active.length
      : 0,
    items: withStats,
  }
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (USE_MOCK) {
        await delay(300)
        setStats(buildDashboardStats(MOCK_ITEMS))
      } else {
        try {
          const data = await api.getDashboard()
          setStats(data)
        } catch {
          // Fallback: fetch items and compute stats client-side
          const items = await api.getItems()
          setStats(buildDashboardStats(items))
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { stats, loading, error, reload: load }
}

export function useItem(id: string) {
  const [item, setItem] = useState<ItemWithStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (USE_MOCK) {
        await delay(200)
        const found = MOCK_ITEMS.find(i => i.id === id)
        setItem(found ? computeItemStats(found) : null)
      } else {
        const data = await api.getItem(id)
        setItem(computeItemStats(data))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  return { item, loading, error, reload: load }
}

export function useArchivedItems() {
  const [items, setItems] = useState<ItemWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        let raw: Item[]
        if (USE_MOCK) {
          await delay(200)
          raw = MOCK_ITEMS.filter(i => i.status !== 'active')
        } else {
          const [retired, sold] = await Promise.all([
            api.getItems('retired'),
            api.getItems('sold'),
          ])
          raw = [...retired, ...sold]
        }
        if (!cancelled) setItems(raw.map(computeItemStats))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return { items, loading, error }
}

/** Mutations — always hit real API */
export function useItemMutations(onSuccess?: () => void) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setSaving(true)
    setError(null)
    try {
      const result = await fn()
      onSuccess?.()
      return result
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation failed')
    } finally {
      setSaving(false)
    }
  }

  return {
    saving,
    error,
    createItem: (data: ItemFormData) => run(() => api.createItem(data)),
    updateItem: (id: string, data: Partial<ItemFormData>) => run(() => api.updateItem(id, data)),
    deleteItem: (id: string) => run(() => api.deleteItem(id)),
    retireItem: (id: string, retired_at: string) => run(() => api.retireItem(id, retired_at)),
    sellItem: (id: string, sold_price: number) => run(() => api.sellItem(id, sold_price)),
    createExpense: (id: string, data: ExpenseFormData) => run(() => api.createExpense(id, data)),
    deleteExpense: (id: string, expenseId: string) => run(() => api.deleteExpense(id, expenseId)),
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
