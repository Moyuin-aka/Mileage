export type ItemCategory =
  | 'electronics'
  | 'appliances'
  | 'furniture'
  | 'transportation'
  | 'other'

export type ItemStatus = 'active' | 'retired' | 'sold'

export type ExpenseType =
  | 'repair'
  | 'battery'
  | 'maintenance'
  | 'accessory'
  | 'warranty'
  | 'other'

export interface ItemExpense {
  id: string
  item_id: string
  type: ExpenseType
  amount: number
  expense_date: string
  description?: string
  counts_in_cost: boolean
  created_at: string
  updated_at: string
}

export interface Item {
  id: string
  name: string
  category: ItemCategory
  purchase_price: number
  purchase_date: string
  expected_years?: number
  residual_value: number
  purchase_channel?: string
  status: ItemStatus
  retired_at?: string
  sold_at?: string
  sold_price?: number
  notes?: string
  image_url?: string
  expense_total: number
  expenses?: ItemExpense[]
  created_at: string
  updated_at: string
}

export interface ItemWithStats extends Item {
  days_owned: number
  base_daily_cost: number
  daily_cost: number
  annual_cost: number
  total_cost: number
  is_overdue: boolean
}

export interface DashboardStats {
  total_items: number
  active_count: number
  retired_count: number
  sold_count: number
  total_invested: number
  total_expenses: number
  avg_daily_cost: number
  items: ItemWithStats[]
}

export interface CostTrendPoint {
  day: number
  date: string
  daily_cost: number
}

export interface ItemInput {
  name?: unknown
  category?: unknown
  purchase_price?: unknown
  purchase_date?: unknown
  expected_years?: unknown
  residual_value?: unknown
  purchase_channel?: unknown
  status?: unknown
  retired_at?: unknown
  sold_at?: unknown
  sold_price?: unknown
  notes?: unknown
  image_url?: unknown
}

export interface ExpenseInput {
  type?: unknown
  amount?: unknown
  expense_date?: unknown
  description?: unknown
  counts_in_cost?: unknown
}
