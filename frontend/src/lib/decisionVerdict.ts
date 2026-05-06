import type { ItemWithStats } from '@/types'

export type DecisionPreference = 'rational' | 'latte' | 'enthusiast'
export type VerdictLevel = 'green' | 'yellow' | 'red'
export type VerdictReason = 'lower' | 'painless' | 'premium' | 'expensive'

const STORAGE_KEY = 'mileage_decision_preference'
const DAYS_IN_YEAR = 365
const OPPORTUNITY_DAYS = 90

const PREFERENCES: Record<
  DecisionPreference,
  {
    painlessDelta: number
    yellowRatio: number
    redRatio: number
    redDelta: number
    waitDropRatio: number
  }
> = {
  rational: {
    painlessDelta: 0,
    yellowRatio: 1.1,
    redRatio: 1.25,
    redDelta: 1,
    waitDropRatio: 0.85,
  },
  latte: {
    painlessDelta: 3,
    yellowRatio: 1.2,
    redRatio: 1.5,
    redDelta: 6,
    waitDropRatio: 0.8,
  },
  enthusiast: {
    painlessDelta: 5,
    yellowRatio: 1.5,
    redRatio: 2,
    redDelta: 10,
    waitDropRatio: 0.75,
  },
}

export interface UpgradeVerdictInput {
  item: ItemWithStats
  newNetCost: number
  breakEvenDay: number | null
  preference: DecisionPreference
  baselineDaily?: number
}

export interface UpgradeVerdict {
  level: VerdictLevel
  reason: VerdictReason
  preference: DecisionPreference
  currentDaily: number
  baselineDaily: number
  currentDailyAfterYear: number
  newFirstYearDaily: number
  newAnnualCost: number
  dailyDelta: number
  ratio: number
  breakEvenDay: number | null
  waitDays: number | null
  waitTargetDaily: number | null
  opportunityDays: number
  opportunitySavings: number
  expenseTotal: number
}

export function loadDecisionPreference(): DecisionPreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isDecisionPreference(saved)) return saved
  } catch {}
  return 'latte'
}

export function saveDecisionPreference(preference: DecisionPreference) {
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {}
}

export function buildUpgradeVerdict({
  item,
  newNetCost,
  breakEvenDay,
  preference,
  baselineDaily: baselineDailyOverride,
}: UpgradeVerdictInput): UpgradeVerdict {
  const expenseTotal = item.expense_total ?? 0
  const currentNetCost = Math.max(
    0,
    item.purchase_price + expenseTotal - (item.residual_value ?? 0),
  )
  const currentDaily = Math.max(0, item.daily_cost)
  const currentDailyAfterYear = currentNetCost / (item.days_owned + DAYS_IN_YEAR)
  const baselineDaily = Math.max(0, baselineDailyOverride ?? currentDailyAfterYear)
  const newAnnualCost = Math.max(0, newNetCost)
  const newFirstYearDaily = newAnnualCost / DAYS_IN_YEAR
  const dailyDelta = newFirstYearDaily - baselineDaily
  const ratio = baselineDaily > 0
    ? newFirstYearDaily / baselineDaily
    : newFirstYearDaily > 0
      ? Number.POSITIVE_INFINITY
      : 0

  const thresholds = PREFERENCES[preference]
  const level = verdictLevel(dailyDelta, ratio, thresholds)
  const reason = verdictReason(level, dailyDelta, thresholds)
  const waitTargetDaily = baselineDailyOverride == null && level === 'red' && baselineDaily > 0
    ? baselineDaily * thresholds.waitDropRatio
    : null
  const waitDays = waitTargetDaily
    ? Math.max(0, Math.ceil(currentNetCost / waitTargetDaily - item.days_owned))
    : null
  const opportunitySavings = Math.max(
    0,
    (newFirstYearDaily - baselineDaily) * OPPORTUNITY_DAYS,
  )

  return {
    level,
    reason,
    preference,
    currentDaily,
    baselineDaily,
    currentDailyAfterYear,
    newFirstYearDaily,
    newAnnualCost,
    dailyDelta,
    ratio,
    breakEvenDay,
    waitDays,
    waitTargetDaily,
    opportunityDays: OPPORTUNITY_DAYS,
    opportunitySavings,
    expenseTotal,
  }
}

function verdictLevel(
  dailyDelta: number,
  ratio: number,
  thresholds: (typeof PREFERENCES)[DecisionPreference],
): VerdictLevel {
  if (dailyDelta <= 0) return 'green'
  if (dailyDelta <= thresholds.painlessDelta && ratio <= thresholds.yellowRatio) {
    return 'green'
  }
  if (ratio >= thresholds.redRatio || dailyDelta >= thresholds.redDelta) return 'red'
  return 'yellow'
}

function verdictReason(
  level: VerdictLevel,
  dailyDelta: number,
  thresholds: (typeof PREFERENCES)[DecisionPreference],
): VerdictReason {
  if (dailyDelta <= 0) return 'lower'
  if (level === 'red') return 'expensive'
  if (dailyDelta <= thresholds.painlessDelta) return 'painless'
  return 'premium'
}

function isDecisionPreference(value: unknown): value is DecisionPreference {
  return value === 'rational' || value === 'latte' || value === 'enthusiast'
}
