export type ItemCategory =
  | 'electronics'     // 电子产品
  | 'appliances'      // 家电
  | 'furniture'       // 家具
  | 'transportation'  // 交通工具
  | 'other'           // 其他

export type ItemStatus =
  | 'active'    // 使用中
  | 'retired'   // 已退役
  | 'sold'      // 已转手

export type ExpenseType =
  | 'repair'       // 维修
  | 'battery'      // 电池
  | 'maintenance'  // 保养
  | 'accessory'    // 配件
  | 'warranty'     // 保修
  | 'other'        // 其他

export type MoneyCurrency = 'CNY' | 'USD' | 'HKD' | 'JPY' | 'EUR' | 'GBP' | 'TWD' | 'MOP'
export type SalvageProfile = 'valueKeeper' | 'steady' | 'fastDrop'

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
  purchase_currency: MoneyCurrency
  purchase_original_amount?: number
  fx_rate?: number
  fx_rate_date?: string
  fx_bank_fee: number
  fx_source?: string
  purchase_date: string       // ISO date: YYYY-MM-DD
  expected_years?: number
  residual_value?: number | null
  salvage_profile?: SalvageProfile | null
  annual_depreciation_rate?: number | null
  purchase_channel?: string
  status: ItemStatus
  retired_at?: string
  sold_at?: string
  sold_price?: number
  notes?: string
  image_url?: string
  expense_total?: number
  expenses?: ItemExpense[]
  created_at: string
  updated_at: string
}

/** Item with computed cost stats, returned from dashboard API or computed client-side */
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
  total_expenses?: number
  avg_daily_cost: number
  items: ItemWithStats[]
}

export interface CostTrendPoint {
  day: number
  date: string
  daily_cost: number
}

/** Form shape used by add/edit forms */
export type ItemFormData = Omit<
  Item,
  'id' | 'created_at' | 'updated_at' | 'expense_total' | 'expenses'
>

export type ExpenseFormData = Pick<
  ItemExpense,
  'type' | 'amount' | 'expense_date' | 'description' | 'counts_in_cost'
>

export type SortKey = 'daily_cost' | 'purchase_date' | 'purchase_price'

export interface OcrLine {
  text: string
  score?: number | null
  box?: number[][] | null
}

export interface OcrCandidate<T> {
  value: T
  confidence: number
  source: string
  label?: string
  currency?: MoneyCurrency
}

export interface OcrParseResult {
  fields: Partial<Pick<ItemFormData, 'name' | 'category' | 'purchase_price' | 'purchase_date' | 'purchase_channel'>> & {
    purchase_currency?: MoneyCurrency
  }
  candidates: {
    name: OcrCandidate<string>[]
    purchase_price: OcrCandidate<number>[]
    purchase_date: OcrCandidate<string>[]
    purchase_channel: OcrCandidate<string>[]
  }
  raw_text: string
  lines: OcrLine[]
}

export interface FxConversionInput {
  amount: number
  from_currency: MoneyCurrency
  to_currency: MoneyCurrency
  date: string
  bank_fee: number
}

export interface FxConversionResult {
  source: 'frankfurter' | 'mastercard'
  amount: number
  from_currency: MoneyCurrency
  converted_amount: number
  to_currency: MoneyCurrency
  rate: number
  date: string
  bank_fee: number
  fetched_at: string
  indicative: boolean
}

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  electronics: '电子产品',
  appliances: '家电',
  furniture: '家具',
  transportation: '交通工具',
  other: '其他',
}

export const STATUS_LABELS: Record<ItemStatus, string> = {
  active: '使用中',
  retired: '已退役',
  sold: '已转手',
}

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  repair: '维修',
  battery: '电池',
  maintenance: '保养',
  accessory: '配件',
  warranty: '保修',
  other: '其他',
}
