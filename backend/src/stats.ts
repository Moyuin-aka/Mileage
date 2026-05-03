import type { CostTrendPoint, Item, ItemWithStats } from './types.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * This is the canonical cost calculation used by the API.
 *
 * daily_cost = (purchase_price + expense_total - recovered_value) / days_owned
 * recovered_value is sold_price for sold items, otherwise residual_value.
 * expense_total includes only later expenses that are marked as cost-bearing.
 * Retired and sold items stop accumulating days at retired_at / sold_at.
 */
export function computeItemStats(item: Item): ItemWithStats {
  const endDate =
    item.status === 'retired' && item.retired_at
      ? item.retired_at
      : item.status === 'sold' && item.sold_at
        ? item.sold_at
        : todayDateOnly()

  const daysOwned = Math.max(1, diffDays(item.purchase_date, endDate))
  const recoveredValue =
    item.status === 'sold' && item.sold_price != null
      ? item.sold_price
      : (item.residual_value ?? 0)

  const baseCost = Math.max(0, item.purchase_price - recoveredValue)
  const expenseTotal = item.expense_total ?? 0
  const netCost = Math.max(0, item.purchase_price + expenseTotal - recoveredValue)
  const baseDailyCost = baseCost / daysOwned
  const dailyCost = netCost / daysOwned
  const annualCost = dailyCost * 365
  const expectedDays = item.expected_years ? item.expected_years * 365 : null
  const isOverdue = expectedDays != null && daysOwned > expectedDays

  return {
    ...item,
    days_owned: daysOwned,
    base_daily_cost: baseDailyCost,
    daily_cost: dailyCost,
    annual_cost: annualCost,
    total_cost: netCost,
    is_overdue: isOverdue,
  }
}

export function generateCostTrend(
  item: Item,
  futureDays = 365,
  maxPoints = 120,
): CostTrendPoint[] {
  const current = computeItemStats(item)
  const totalDays = Math.max(1, current.days_owned + Math.max(0, futureDays))
  const recoveredValue =
    item.status === 'sold' && item.sold_price != null
      ? item.sold_price
      : (item.residual_value ?? 0)
  const netCost = Math.max(0, item.purchase_price + (item.expense_total ?? 0) - recoveredValue)
  const step = Math.max(1, Math.floor(totalDays / maxPoints))
  const points: CostTrendPoint[] = []

  for (let day = 1; day <= totalDays; day += step) {
    points.push({
      day,
      date: addDays(item.purchase_date, day),
      daily_cost: netCost / day,
    })
  }

  if (points[points.length - 1]?.day !== totalDays) {
    points.push({
      day: totalDays,
      date: addDays(item.purchase_date, totalDays),
      daily_cost: netCost / totalDays,
    })
  }

  return points
}

export function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10)
}

function diffDays(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate.slice(0, 10)}T00:00:00.000Z`)
  const end = Date.parse(`${endDate.slice(0, 10)}T00:00:00.000Z`)
  return Math.floor((end - start) / MS_PER_DAY)
}

function addDays(startDate: string, days: number): string {
  const start = Date.parse(`${startDate.slice(0, 10)}T00:00:00.000Z`)
  return new Date(start + days * MS_PER_DAY).toISOString().slice(0, 10)
}
