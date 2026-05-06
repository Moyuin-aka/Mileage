import type {
  ExpenseInput,
  ExpenseType,
  Item,
  ItemCategory,
  ItemInput,
  ItemStatus,
  MoneyCurrency,
  SalvageProfile,
} from './types.js'
import { todayDateOnly } from './stats.js'

const CATEGORIES = new Set<ItemCategory>([
  'electronics',
  'appliances',
  'furniture',
  'transportation',
  'other',
])

const STATUSES = new Set<ItemStatus>(['active', 'retired', 'sold'])
const CURRENCIES = new Set<MoneyCurrency>(['CNY', 'USD', 'HKD', 'JPY', 'EUR', 'GBP', 'TWD', 'MOP'])
const SALVAGE_PROFILES = new Set<SalvageProfile>(['valueKeeper', 'steady', 'fastDrop'])
const SALVAGE_PROFILE_RATES: Record<SalvageProfile, number> = {
  valueKeeper: 0.12,
  steady: 0.23,
  fastDrop: 0.38,
}

const EXPENSE_TYPES = new Set<ExpenseType>([
  'repair',
  'battery',
  'maintenance',
  'accessory',
  'warranty',
  'other',
])

export interface NormalizedItemInput {
  name: string
  category: ItemCategory
  purchase_price: number
  purchase_currency: MoneyCurrency
  purchase_original_amount: number | null
  fx_rate: number | null
  fx_rate_date: string | null
  fx_bank_fee: number
  fx_source: string | null
  purchase_date: string
  expected_years: number | null
  residual_value: number | null
  salvage_profile: SalvageProfile | null
  annual_depreciation_rate: number | null
  purchase_channel: string | null
  status: ItemStatus
  retired_at: string | null
  sold_at: string | null
  sold_price: number | null
  notes: string | null
  image_url: string | null
}

export class ValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(issues.join('; '))
  }
}

export interface NormalizedExpenseInput {
  type: ExpenseType
  amount: number
  expense_date: string
  description: string | null
  counts_in_cost: boolean
}

export function normalizeItemInput(input: ItemInput, existing?: Item): NormalizedItemInput {
  const issues: string[] = []

  const name = requiredString(input.name ?? existing?.name, 'name', issues)
  const category = parseCategory(input.category ?? existing?.category, issues)
  const purchasePrice = requiredNumber(
    input.purchase_price ?? existing?.purchase_price,
    'purchase_price',
    issues,
  )
  const purchaseCurrency = parseCurrency(input.purchase_currency ?? existing?.purchase_currency ?? 'CNY', issues)
  let purchaseOriginalAmount = optionalNumber(
    input.purchase_original_amount ?? existing?.purchase_original_amount,
  )
  let fxRate = optionalNumber(input.fx_rate ?? existing?.fx_rate)
  let fxRateDate = optionalDateOnly(input.fx_rate_date ?? existing?.fx_rate_date)
  let fxBankFee = optionalNumber(input.fx_bank_fee ?? existing?.fx_bank_fee) ?? 0
  let fxSource = optionalString(input.fx_source ?? existing?.fx_source)
  const purchaseDate = requiredDateOnly(
    input.purchase_date ?? existing?.purchase_date,
    'purchase_date',
    issues,
  )
  const expectedYears = optionalNumber(input.expected_years ?? existing?.expected_years)
  const residualValue = optionalNumber(
    hasInputKey(input, 'residual_value')
      ? input.residual_value
      : existing?.residual_value,
  )
  const salvageProfileValue = hasInputKey(input, 'salvage_profile')
    ? input.salvage_profile
    : existing?.salvage_profile
  const annualDepreciationRateValue = hasInputKey(input, 'annual_depreciation_rate')
    ? input.annual_depreciation_rate
    : existing?.annual_depreciation_rate
  let salvageProfile = parseSalvageProfile(salvageProfileValue, issues)
  let annualDepreciationRate = optionalNumber(
    annualDepreciationRateValue,
  )
  const purchaseChannel = optionalString(input.purchase_channel ?? existing?.purchase_channel)
  const status = parseStatus(input.status ?? existing?.status ?? 'active', issues)
  const notes = optionalString(input.notes ?? existing?.notes)
  const imageUrl = optionalString(input.image_url ?? existing?.image_url)

  let retiredAt = optionalDateOnly(input.retired_at ?? existing?.retired_at)
  let soldAt = optionalDateOnly(input.sold_at ?? existing?.sold_at)
  let soldPrice = optionalNumber(input.sold_price ?? existing?.sold_price)

  if (purchasePrice != null && purchasePrice < 0) issues.push('purchase_price must be >= 0')
  if (purchaseOriginalAmount != null && purchaseOriginalAmount < 0) {
    issues.push('purchase_original_amount must be >= 0')
  }
  if (fxRate != null && fxRate <= 0) issues.push('fx_rate must be > 0')
  if (fxBankFee < 0) issues.push('fx_bank_fee must be >= 0')
  if (expectedYears != null && expectedYears <= 0) issues.push('expected_years must be > 0')
  if (residualValue != null && residualValue < 0) issues.push('residual_value must be >= 0')
  if (
    annualDepreciationRate != null &&
    (annualDepreciationRate < 0 || annualDepreciationRate >= 1)
  ) {
    issues.push('annual_depreciation_rate must be >= 0 and < 1')
  }
  if (soldPrice != null && soldPrice < 0) issues.push('sold_price must be >= 0')

  if (purchaseDate && purchaseDate > todayDateOnly()) {
    issues.push('purchase_date cannot be in the future')
  }

  if (retiredAt && purchaseDate && retiredAt < purchaseDate) {
    issues.push('retired_at cannot be before purchase_date')
  }
  if (soldAt && purchaseDate && soldAt < purchaseDate) {
    issues.push('sold_at cannot be before purchase_date')
  }
  if (fxRateDate && purchaseDate && fxRateDate > todayDateOnly()) {
    issues.push('fx_rate_date cannot be in the future')
  }

  if (purchaseCurrency === 'CNY') {
    purchaseOriginalAmount = null
    fxRate = null
    fxRateDate = null
    fxBankFee = 0
    fxSource = null
  }

  if (category !== 'electronics') {
    salvageProfile = null
    annualDepreciationRate = null
  } else if (salvageProfile && annualDepreciationRate == null) {
    annualDepreciationRate = SALVAGE_PROFILE_RATES[salvageProfile]
  }

  if (status === 'active') {
    retiredAt = null
    soldAt = null
    soldPrice = null
  }

  if (status === 'retired') {
    retiredAt ??= todayDateOnly()
    soldAt = null
    soldPrice = null
  }

  if (status === 'sold') {
    retiredAt = null
    soldAt ??= todayDateOnly()
    if (soldPrice == null) issues.push('sold_price is required when status is sold')
  }

  if (issues.length > 0) throw new ValidationError(issues)

  return {
    name: name!,
    category: category!,
    purchase_price: purchasePrice!,
    purchase_currency: purchaseCurrency!,
    purchase_original_amount: purchaseOriginalAmount,
    fx_rate: fxRate,
    fx_rate_date: fxRateDate,
    fx_bank_fee: fxBankFee,
    fx_source: fxSource,
    purchase_date: purchaseDate!,
    expected_years: expectedYears,
    residual_value: residualValue,
    salvage_profile: salvageProfile,
    annual_depreciation_rate: annualDepreciationRate,
    purchase_channel: purchaseChannel,
    status: status!,
    retired_at: retiredAt,
    sold_at: soldAt,
    sold_price: soldPrice ?? null,
    notes,
    image_url: imageUrl,
  }
}

export function normalizeExpenseInput(input: ExpenseInput): NormalizedExpenseInput {
  const issues: string[] = []

  const type = parseExpenseType(input.type ?? 'repair', issues)
  const amount = requiredNumber(input.amount, 'amount', issues)
  const expenseDate = requiredDateOnly(input.expense_date, 'expense_date', issues)
  const description = optionalString(input.description)
  const countsInCost = input.counts_in_cost == null ? true : Boolean(input.counts_in_cost)

  if (amount != null && amount < 0) issues.push('amount must be >= 0')
  if (expenseDate && expenseDate > todayDateOnly()) {
    issues.push('expense_date cannot be in the future')
  }

  if (issues.length > 0) throw new ValidationError(issues)

  return {
    type: type!,
    amount: amount!,
    expense_date: expenseDate!,
    description,
    counts_in_cost: countsInCost,
  }
}

function requiredString(value: unknown, field: string, issues: string[]): string | null {
  const parsed = optionalString(value)
  if (!parsed) {
    issues.push(`${field} is required`)
    return null
  }
  return parsed
}

function optionalString(value: unknown): string | null {
  if (value == null) return null
  const parsed = String(value).trim()
  return parsed === '' ? null : parsed
}

function requiredNumber(value: unknown, field: string, issues: string[]): number | null {
  const parsed = optionalNumber(value)
  if (parsed == null) {
    issues.push(`${field} is required`)
    return null
  }
  return parsed
}

function optionalNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function hasInputKey(input: ItemInput, key: keyof ItemInput): boolean {
  return Object.prototype.hasOwnProperty.call(input, key)
}

function requiredDateOnly(value: unknown, field: string, issues: string[]): string | null {
  const parsed = optionalDateOnly(value)
  if (!parsed) {
    issues.push(`${field} is required`)
    return null
  }
  return parsed
}

function optionalDateOnly(value: unknown): string | null {
  if (value == null || value === '') return null
  const parsed = String(value).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed)) return null
  const date = new Date(`${parsed}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10) === parsed ? parsed : null
}

function parseCategory(value: unknown, issues: string[]): ItemCategory | null {
  if (typeof value === 'string' && CATEGORIES.has(value as ItemCategory)) {
    return value as ItemCategory
  }
  issues.push('category is invalid')
  return null
}

function parseStatus(value: unknown, issues: string[]): ItemStatus | null {
  if (typeof value === 'string' && STATUSES.has(value as ItemStatus)) {
    return value as ItemStatus
  }
  issues.push('status is invalid')
  return null
}

function parseSalvageProfile(value: unknown, issues: string[]): SalvageProfile | null {
  if (value == null || value === '') return null
  if (typeof value === 'string' && SALVAGE_PROFILES.has(value as SalvageProfile)) {
    return value as SalvageProfile
  }
  issues.push('salvage_profile is invalid')
  return null
}

function parseCurrency(value: unknown, issues: string[]): MoneyCurrency | null {
  if (typeof value === 'string' && CURRENCIES.has(value as MoneyCurrency)) {
    return value as MoneyCurrency
  }
  issues.push('purchase_currency is invalid')
  return null
}

function parseExpenseType(value: unknown, issues: string[]): ExpenseType | null {
  if (typeof value === 'string' && EXPENSE_TYPES.has(value as ExpenseType)) {
    return value as ExpenseType
  }
  issues.push('type is invalid')
  return null
}
