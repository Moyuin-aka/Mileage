import type { ItemWithStats, SalvageProfile } from '@/types'
import { calculateDynamicSalvageValue } from '@/lib/calculations'

export type { SalvageProfile } from '@/types'

export const SALVAGE_PROFILE_RATES: Record<SalvageProfile, number> = {
  valueKeeper: 0.12,
  steady: 0.23,
  fastDrop: 0.38,
}

const FLOOR_VALUE = 100
const LOOKAHEAD_DAYS = 365
const PLATEAU_DROP_THRESHOLD = 0.05

export interface DynamicSalvageAnalysis {
  profile: SalvageProfile
  annualRate: number
  floorValue: number
  dynamicResidual: number
  staticResidual: number
  residualGap: number
  dynamicDailyCost: number
  futureResidual: number
  futureDailyCost: number
  dropNext30: number
  isFlattening: boolean
}

export function inferSalvageProfile(item: ItemWithStats): SalvageProfile {
  const text = `${item.name} ${item.purchase_channel ?? ''} ${item.notes ?? ''}`.toLowerCase()

  if (/(switch|steam deck|playstation|ps5|xbox|rog ally|legion go)/i.test(text)) {
    return 'valueKeeper'
  }

  if (/(iphone|ipad|macbook|mac mini|imac|airpods|apple watch|sony|bose|kindle)/i.test(text)) {
    return 'steady'
  }

  if (/(xiaomi|redmi|oppo|vivo|oneplus|realme|honor|huawei|pixel|samsung|android|fold|ultra)/i.test(text)) {
    return 'fastDrop'
  }

  return 'steady'
}

export function buildDynamicSalvageAnalysis(
  item: ItemWithStats,
  profile: SalvageProfile,
  annualRateOverride?: number,
): DynamicSalvageAnalysis {
  const annualRate = annualRateOverride ?? item.annual_depreciation_rate ?? SALVAGE_PROFILE_RATES[profile]
  const expenseTotal = item.expense_total ?? 0
  const dynamicResidual = calculateDynamicSalvageValue(
    item.purchase_price,
    item.days_owned,
    annualRate,
    FLOOR_VALUE,
  )
  const futureResidual = calculateDynamicSalvageValue(
    item.purchase_price,
    item.days_owned + LOOKAHEAD_DAYS,
    annualRate,
    FLOOR_VALUE,
  )
  const next30Residual = calculateDynamicSalvageValue(
    item.purchase_price,
    item.days_owned + 30,
    annualRate,
    FLOOR_VALUE,
  )
  const dynamicDailyCost = dynamicCostAtDay(
    item.purchase_price,
    expenseTotal,
    dynamicResidual,
    item.days_owned,
  )
  const next30DailyCost = dynamicCostAtDay(
    item.purchase_price,
    expenseTotal,
    next30Residual,
    item.days_owned + 30,
  )

  return {
    profile,
    annualRate,
    floorValue: FLOOR_VALUE,
    dynamicResidual,
    staticResidual: item.residual_value ?? 0,
    residualGap: dynamicResidual - (item.residual_value ?? 0),
    dynamicDailyCost,
    futureResidual,
    futureDailyCost: dynamicCostAtDay(
      item.purchase_price,
      expenseTotal,
      futureResidual,
      item.days_owned + LOOKAHEAD_DAYS,
    ),
    dropNext30: Math.max(0, dynamicDailyCost - next30DailyCost),
    isFlattening: Math.max(0, dynamicDailyCost - next30DailyCost) < PLATEAU_DROP_THRESHOLD,
  }
}

function dynamicCostAtDay(
  purchasePrice: number,
  expenseTotal: number,
  residual: number,
  day: number,
) {
  return Math.max(0, purchasePrice + expenseTotal - residual) / Math.max(1, day)
}
