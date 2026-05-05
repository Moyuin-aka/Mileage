import type { MoneyCurrency } from '@/types'

export const MONEY_CURRENCIES: MoneyCurrency[] = [
  'CNY',
  'USD',
  'HKD',
  'JPY',
  'EUR',
  'GBP',
  'TWD',
  'MOP',
]

export const CURRENCY_PREFIX: Record<MoneyCurrency, string> = {
  CNY: '¥',
  USD: '$',
  HKD: 'HK$',
  JPY: '¥',
  EUR: '€',
  GBP: '£',
  TWD: 'NT$',
  MOP: 'MOP$',
}

export function moneyPrefix(currency: MoneyCurrency | '') {
  return currency ? CURRENCY_PREFIX[currency] : '¥'
}

export function formatCurrencyAmount(amount: number, currency: MoneyCurrency, digits = 2) {
  const prefix = CURRENCY_PREFIX[currency]
  const value = amount.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  return `${prefix}${value} ${currency}`
}
