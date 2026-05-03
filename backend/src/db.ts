import pg from 'pg'
import type { ExpenseType, Item, ItemCategory, ItemExpense, ItemStatus } from './types.js'

const { Pool, types } = pg

types.setTypeParser(1700, value => Number.parseFloat(value))

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: Number.parseInt(process.env.DB_POOL_SIZE ?? '10', 10),
})

export function mapItem(row: Record<string, unknown>): Item {
  return omitUndefined({
    id: String(row.id),
    name: String(row.name),
    category: row.category as ItemCategory,
    purchase_price: Number(row.purchase_price),
    purchase_date: toDateOnly(row.purchase_date),
    expected_years: optionalNumber(row.expected_years),
    residual_value: Number(row.residual_value ?? 0),
    purchase_channel: optionalString(row.purchase_channel),
    status: row.status as ItemStatus,
    retired_at: optionalDateOnly(row.retired_at),
    sold_at: optionalDateOnly(row.sold_at),
    sold_price: optionalNumber(row.sold_price),
    notes: optionalString(row.notes),
    image_url: optionalString(row.image_url),
    expense_total: Number(row.expense_total ?? 0),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  })
}

export function mapExpense(row: Record<string, unknown>): ItemExpense {
  return omitUndefined({
    id: String(row.id),
    item_id: String(row.item_id),
    type: row.type as ExpenseType,
    amount: Number(row.amount),
    expense_date: toDateOnly(row.expense_date),
    description: optionalString(row.description),
    counts_in_cost: Boolean(row.counts_in_cost),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  })
}

function optionalString(value: unknown): string | undefined {
  return value == null || value === '' ? undefined : String(value)
}

function optionalNumber(value: unknown): number | undefined {
  return value == null ? undefined : Number(value)
}

function optionalDateOnly(value: unknown): string | undefined {
  return value == null ? undefined : toDateOnly(value)
}

function toDateOnly(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  return new Date(String(value)).toISOString()
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T
}
