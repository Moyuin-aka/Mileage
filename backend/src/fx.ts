import { todayDateOnly } from './stats.js'
import { ValidationError } from './validation.js'
import type { FxConversionInput, FxConversionResult, MoneyCurrency } from './types.js'

export const MONEY_CURRENCIES = [
  'CNY',
  'USD',
  'HKD',
  'JPY',
  'EUR',
  'GBP',
  'TWD',
  'MOP',
] as const

const CURRENCY_SET = new Set<MoneyCurrency>(MONEY_CURRENCIES)

const FRANKFURTER_FX_BASE_URL =
  process.env.FRANKFURTER_FX_BASE_URL ?? 'https://api.frankfurter.dev'

export interface NormalizedFxInput {
  amount: number
  from_currency: MoneyCurrency
  to_currency: MoneyCurrency
  date: string
  bank_fee: number
}

export function normalizeFxInput(input: FxConversionInput): NormalizedFxInput {
  const issues: string[] = []
  const amount = Number(input.amount)
  const from = parseCurrency(input.from_currency, 'from_currency', issues)
  const to = parseCurrency(input.to_currency ?? 'CNY', 'to_currency', issues)
  const date = parseDateOnly(input.date ?? todayDateOnly(), 'date', issues)
  const bankFee = input.bank_fee == null || input.bank_fee === ''
    ? 0
    : Number(input.bank_fee)

  if (!Number.isFinite(amount) || amount <= 0) {
    issues.push('amount must be > 0')
  }

  if (!Number.isFinite(bankFee) || bankFee < 0) {
    issues.push('bank_fee must be >= 0')
  }

  if (date && date > todayDateOnly()) {
    issues.push('date cannot be in the future')
  }

  if (issues.length > 0) throw new ValidationError(issues)

  return {
    amount,
    from_currency: from!,
    to_currency: to!,
    date: date!,
    bank_fee: bankFee,
  }
}

export async function convertFx(
  input: NormalizedFxInput,
): Promise<FxConversionResult> {
  return convertWithFrankfurter(input)
}

export async function convertWithFrankfurter(
  input: NormalizedFxInput,
): Promise<FxConversionResult> {
  if (input.from_currency === input.to_currency) {
    return {
      source: 'frankfurter',
      amount: input.amount,
      from_currency: input.from_currency,
      converted_amount: input.amount,
      to_currency: input.to_currency,
      rate: 1,
      date: input.date,
      bank_fee: input.bank_fee,
      fetched_at: new Date().toISOString(),
      indicative: true,
    }
  }

  const url = new URL(
    `${FRANKFURTER_FX_BASE_URL.replace(/\/$/, '')}/v2/rate/${input.from_currency}/${input.to_currency}`,
  )
  url.searchParams.set('date', input.date)

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'Mileage/0.2 FX proxy',
    },
  })

  if (!response.ok) {
    throw new Error(`Frankfurter FX request failed with ${response.status}`)
  }

  const payload = await response.json() as FrankfurterRateResponse
  if (payload.message) {
    throw new Error(payload.message)
  }

  const baseRate = Number(payload.rate)
  const rate = baseRate * (1 + input.bank_fee / 100)
  const convertedAmount = roundMoney(input.amount * rate)

  if (!Number.isFinite(convertedAmount) || convertedAmount < 0 || !Number.isFinite(rate) || rate <= 0) {
    throw new Error('Frankfurter FX response did not include a usable conversion rate')
  }

  return {
    source: 'frankfurter',
    amount: input.amount,
    from_currency: input.from_currency,
    converted_amount: convertedAmount,
    to_currency: input.to_currency,
    rate,
    date: String(payload.date ?? input.date).slice(0, 10),
    bank_fee: input.bank_fee,
    fetched_at: new Date().toISOString(),
    indicative: true,
  }
}

function parseCurrency(value: unknown, field: string, issues: string[]): MoneyCurrency | null {
  if (typeof value === 'string' && CURRENCY_SET.has(value as MoneyCurrency)) {
    return value as MoneyCurrency
  }
  issues.push(`${field} is invalid`)
  return null
}

function parseDateOnly(value: unknown, field: string, issues: string[]): string | null {
  if (typeof value !== 'string') {
    issues.push(`${field} is invalid`)
    return null
  }
  const parsed = value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
    issues.push(`${field} is invalid`)
    return null
  }
  const date = new Date(`${parsed}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== parsed) {
    issues.push(`${field} is invalid`)
    return null
  }
  return parsed
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

interface FrankfurterRateResponse {
  date?: string
  base?: string
  quote?: string
  rate?: number | string
  message?: string
}
