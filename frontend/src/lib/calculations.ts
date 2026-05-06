import { Item, ItemWithStats, CostTrendPoint } from '@/types'
import { differenceInDays, addDays, format } from 'date-fns'

/**
 * Compute cost statistics for an item.
 * daily_cost = (purchase_price + later expenses - residual_value) / days_owned
 * For sold items, uses sold_price as the actual residual value.
 */
export function computeItemStats(item: Item): ItemWithStats {
  const purchaseDate = new Date(item.purchase_date)
  const endDate = (() => {
    if (item.status === 'active') return new Date()
    if (item.status === 'retired' && item.retired_at) return new Date(item.retired_at)
    if (item.status === 'sold' && item.sold_at) return new Date(item.sold_at)
    return new Date()
  })()

  const daysOwned = Math.max(1, differenceInDays(endDate, purchaseDate))

  const recoveredValue =
    item.status === 'sold' && item.sold_price != null
      ? item.sold_price
      : (item.residual_value ?? 0)

  const expenseTotal =
    item.expense_total ??
    item.expenses?.reduce((sum, expense) => (
      expense.counts_in_cost ? sum + expense.amount : sum
    ), 0) ??
    0

  const baseCost = Math.max(0, item.purchase_price - recoveredValue)
  const netCost = Math.max(0, item.purchase_price + expenseTotal - recoveredValue)
  const baseDailyCost = baseCost / daysOwned
  const dailyCost = netCost / daysOwned
  const annualCost = dailyCost * 365

  const expectedDays = item.expected_years ? item.expected_years * 365 : null
  const isOverdue = expectedDays != null && daysOwned > expectedDays

  return {
    ...item,
    expense_total: expenseTotal,
    days_owned: daysOwned,
    base_daily_cost: baseDailyCost,
    daily_cost: dailyCost,
    annual_cost: annualCost,
    total_cost: netCost,
    is_overdue: isOverdue,
  }
}

/**
 * Generate daily-cost trend data points for a chart.
 * Samples up to maxPoints evenly-spaced days from day 1 to today (+ futureDays).
 */
export function generateCostTrend(
  item: Item,
  futureDays = 0,
  maxPoints = 120,
): CostTrendPoint[] {
  const purchaseDate = new Date(item.purchase_date)
  const today = new Date()
  const totalDays = Math.max(1, differenceInDays(today, purchaseDate)) + futureDays

  const expenseTotal =
    item.expense_total ??
    item.expenses?.reduce((sum, expense) => (
      expense.counts_in_cost ? sum + expense.amount : sum
    ), 0) ??
    0
  const netCost = Math.max(0, item.purchase_price + expenseTotal - (item.residual_value ?? 0))

  const step = Math.max(1, Math.floor(totalDays / maxPoints))
  const points: CostTrendPoint[] = []

  for (let day = 1; day <= totalDays; day += step) {
    const date = addDays(purchaseDate, day)
    points.push({
      day,
      date: format(date, 'yyyy-MM-dd'),
      daily_cost: netCost / day,
    })
  }

  // Always include the last day
  if (points[points.length - 1]?.day !== totalDays) {
    points.push({
      day: totalDays,
      date: format(addDays(purchaseDate, totalDays), 'yyyy-MM-dd'),
      daily_cost: netCost / totalDays,
    })
  }

  return points
}

/**
 * Calculate dynamic salvage value with an exponential decay model.
 *
 * V(t) = P * (1 - r) ^ (t / 365)
 */
export function calculateDynamicSalvageValue(
  purchasePrice: number,
  daysUsed: number,
  annualDepreciationRate = 0.3,
  floorValue = 100,
): number {
  if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) return 0
  const rate = Math.min(0.95, Math.max(0, annualDepreciationRate))
  const yearsUsed = Math.max(0, daysUsed) / 365
  const currentResidual = purchasePrice * Math.pow(1 - rate, yearsUsed)
  return Math.min(purchasePrice, Math.max(currentResidual, floorValue))
}

export function calculateFutureSalvageValue(
  currentSalvageValue: number,
  daysAhead: number,
  annualDepreciationRate = 0.3,
  floorValue = 100,
): number {
  if (!Number.isFinite(currentSalvageValue) || currentSalvageValue <= 0) return 0
  const currentValue = Math.max(0, currentSalvageValue)
  const rate = Math.min(0.95, Math.max(0, annualDepreciationRate))
  const yearsAhead = Math.max(0, daysAhead) / 365
  const futureValue = currentValue * Math.pow(1 - rate, yearsAhead)
  const effectiveFloor = Math.min(currentValue, Math.max(0, floorValue))
  return Math.min(currentValue, Math.max(futureValue, effectiveFloor))
}

export function calculateMarginalDailyCost(
  currentSalvageValue: number,
  daysAhead = 365,
  annualDepreciationRate = 0.3,
  floorValue = 100,
): number {
  const days = Math.max(1, daysAhead)
  const currentValue = Math.max(0, currentSalvageValue)
  const futureValue = calculateFutureSalvageValue(
    currentValue,
    days,
    annualDepreciationRate,
    floorValue,
  )
  return Math.max(0, currentValue - futureValue) / days
}

export function generateMarginalCostTrend(
  currentSalvageValue: number,
  futureDays = 365,
  annualDepreciationRate = 0.3,
  floorValue = 100,
  maxPoints = 120,
): CostTrendPoint[] {
  const today = new Date()
  const totalDays = Math.max(1, futureDays)
  const step = Math.max(1, Math.floor(totalDays / maxPoints))
  const points: CostTrendPoint[] = []

  for (let day = 1; day <= totalDays; day += step) {
    points.push({
      day,
      date: format(addDays(today, day), 'yyyy-MM-dd'),
      daily_cost: calculateMarginalDailyCost(
        currentSalvageValue,
        day,
        annualDepreciationRate,
        floorValue,
      ),
    })
  }

  if (points[points.length - 1]?.day !== totalDays) {
    points.push({
      day: totalDays,
      date: format(addDays(today, totalDays), 'yyyy-MM-dd'),
      daily_cost: calculateMarginalDailyCost(
        currentSalvageValue,
        totalDays,
        annualDepreciationRate,
        floorValue,
      ),
    })
  }

  return points
}

export function generateDynamicCostTrend(
  item: Item,
  futureDays = 0,
  annualDepreciationRate = 0.3,
  floorValue = 100,
  maxPoints = 120,
): CostTrendPoint[] {
  const purchaseDate = new Date(item.purchase_date)
  const today = new Date()
  const totalDays = Math.max(1, differenceInDays(today, purchaseDate)) + futureDays
  const expenseTotal =
    item.expense_total ??
    item.expenses?.reduce((sum, expense) => (
      expense.counts_in_cost ? sum + expense.amount : sum
    ), 0) ??
    0
  const step = Math.max(1, Math.floor(totalDays / maxPoints))
  const points: CostTrendPoint[] = []

  for (let day = 1; day <= totalDays; day += step) {
    const date = addDays(purchaseDate, day)
    const dynamicResidual = calculateDynamicSalvageValue(
      item.purchase_price,
      day,
      annualDepreciationRate,
      floorValue,
    )
    points.push({
      day,
      date: format(date, 'yyyy-MM-dd'),
      daily_cost: Math.max(0, item.purchase_price + expenseTotal - dynamicResidual) / day,
    })
  }

  if (points[points.length - 1]?.day !== totalDays) {
    const dynamicResidual = calculateDynamicSalvageValue(
      item.purchase_price,
      totalDays,
      annualDepreciationRate,
      floorValue,
    )
    points.push({
      day: totalDays,
      date: format(addDays(purchaseDate, totalDays), 'yyyy-MM-dd'),
      daily_cost: Math.max(0, item.purchase_price + expenseTotal - dynamicResidual) / totalDays,
    })
  }

  return points
}

/**
 * Calculate the break-even point in days where keeping the old item
 * becomes cheaper than buying a new one.
 *
 * Old item: already paid, future cost = 0 (sunk cost), daily avg continues falling
 * New item: new upfront cost → new daily cost curve starts fresh
 *
 * We find the crossing day N where:
 *   oldItem.netCost / (daysOwned + N) < newPrice / N
 */
export function findBreakEvenDay(
  currentItem: ItemWithStats,
  newPrice: number,
  newResidual = 0,
  maxDays = 3650,
): number | null {
  const oldNetCost =
    currentItem.purchase_price +
    (currentItem.expense_total ?? 0) -
    (currentItem.residual_value ?? 0)

  for (let n = 1; n <= maxDays; n++) {
    const oldDailyCost = oldNetCost / (currentItem.days_owned + n)
    const newDailyCost = (newPrice - newResidual) / n
    if (newDailyCost <= oldDailyCost) return n
  }
  return null
}

export function findDynamicBreakEvenDay(
  currentItem: ItemWithStats,
  newPrice: number,
  annualDepreciationRate = 0.3,
  floorValue = 100,
  maxDays = 3650,
): number | null {
  const oldNetCost =
    currentItem.purchase_price +
    (currentItem.expense_total ?? 0) -
    (currentItem.residual_value ?? 0)

  for (let n = 1; n <= maxDays; n++) {
    const oldDailyCost = oldNetCost / (currentItem.days_owned + n)
    const dynamicResidual = calculateDynamicSalvageValue(
      newPrice,
      n,
      annualDepreciationRate,
      floorValue,
    )
    const newDailyCost = Math.max(0, newPrice - dynamicResidual) / n
    if (newDailyCost <= oldDailyCost) return n
  }
  return null
}

/** Format a number as Chinese currency */
export function formatCNY(value: number, decimals = 2): string {
  return `¥${value.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

/** Format daily cost with up to 2 decimal places */
export function formatDailyCost(value: number): string {
  if (value >= 100) return value.toFixed(0)
  if (value >= 10) return value.toFixed(1)
  return value.toFixed(2)
}
