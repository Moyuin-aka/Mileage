import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Lang, TranslationKey, translations } from './translations'
import type { ItemCategory, ItemStatus, ExpenseType } from '@/types'

const STORAGE_KEY = 'mileage_lang'

function loadLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'zh') return saved
  } catch {}
  return 'zh'
}

interface LanguageContextValue {
  lang: Lang
  toggleLanguage: () => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
  categoryLabels: Record<ItemCategory, string>
  statusLabels: Record<ItemStatus, string>
  expenseTypeLabels: Record<ExpenseType, string>
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(loadLang)

  const toggleLanguage = useCallback(() => {
    setLang(prev => {
      const next: Lang = prev === 'zh' ? 'en' : 'zh'
      try { localStorage.setItem(STORAGE_KEY, next) } catch {}
      return next
    })
  }, [])

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>): string => {
      const str = translations[lang][key] ?? key
      if (!vars) return str
      return str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''))
    },
    [lang],
  )

  const dict = translations[lang]

  const categoryLabels: Record<ItemCategory, string> = {
    electronics: dict['category.electronics'],
    appliances: dict['category.appliances'],
    furniture: dict['category.furniture'],
    transportation: dict['category.transportation'],
    other: dict['category.other'],
  }

  const statusLabels: Record<ItemStatus, string> = {
    active: dict['status.active'],
    retired: dict['status.retired'],
    sold: dict['status.sold'],
  }

  const expenseTypeLabels: Record<ExpenseType, string> = {
    repair: dict['expenseType.repair'],
    battery: dict['expenseType.battery'],
    maintenance: dict['expenseType.maintenance'],
    accessory: dict['expenseType.accessory'],
    warranty: dict['expenseType.warranty'],
    other: dict['expenseType.other'],
  }

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t, categoryLabels, statusLabels, expenseTypeLabels }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
