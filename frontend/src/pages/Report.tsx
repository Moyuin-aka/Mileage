import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { useDashboard } from '@/hooks/useItems'
import { useLanguage } from '@/i18n'
import { formatCNY, formatDailyCost } from '@/lib/calculations'
import { ItemWithStats, ItemStatus } from '@/types'
import { BrandMark } from '@/components/layout/BrandMark'

const STATUS_ORDER: Record<ItemStatus, number> = { active: 0, retired: 1, sold: 2 }

export function Report() {
  const navigate = useNavigate()
  const { t, categoryLabels, statusLabels } = useLanguage()
  const { stats, loading } = useDashboard()

  const items = useMemo<ItemWithStats[]>(() => {
    if (!stats) return []
    return [...stats.items].sort((a, b) => {
      if (a.status !== b.status) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      return b.daily_cost - a.daily_cost
    })
  }, [stats])

  const generatedAt = format(new Date(), 'yyyy-MM-dd HH:mm')

  const columns = [
    t('report.col.name'),
    t('report.col.category'),
    t('report.col.status'),
    t('report.col.purchaseDate'),
    t('report.col.purchasePrice'),
    t('report.col.expenses'),
    t('report.col.residual'),
    t('report.col.daysOwned'),
    t('report.col.dailyCost'),
    t('report.col.annualCost'),
    t('report.col.totalCost'),
  ]

  return (
    <div className="min-h-screen bg-surface text-primary">
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 border-b border-app-border bg-surface/95 backdrop-blur px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('report.back')}
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-md bg-accent text-zinc-950 font-medium px-3 py-1.5 text-xs hover:bg-accent-dim transition-colors"
        >
          <Printer className="h-3.5 w-3.5" />
          {t('report.printExport')}
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 print:max-w-none print:px-0 print:py-0">
        {loading || !stats ? (
          <p className="text-muted text-sm">{t('report.loading')}</p>
        ) : (
          <>
            <header className="flex items-center gap-3 mb-8 print:mb-6">
              <BrandMark className="h-9 w-9 print:h-8 print:w-8" />
              <div>
                <h1 className="font-serif text-2xl print:text-xl text-primary">{t('report.title')}</h1>
                <p className="text-xs text-muted mt-0.5">{t('report.generatedOn', { date: generatedAt })}</p>
              </div>
            </header>

            {/* Summary */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 print:gap-2 print:mb-6">
              {[
                { label: t('report.totalItems'), value: `${stats.total_items}` },
                { label: t('report.activeCount'), value: `${stats.active_count}` },
                { label: t('report.totalInvested'), value: formatCNY(stats.total_invested, 0) },
                {
                  label: t('report.avgDailyCost'),
                  value: `${formatDailyCost(stats.avg_daily_cost)} / ${t('summary.perDay')}`,
                },
              ].map(card => (
                <div key={card.label} className="rounded-lg border border-app-border p-3">
                  <p className="text-2xs text-muted uppercase tracking-widest mb-1">{card.label}</p>
                  <p className="font-mono font-semibold text-lg text-primary">{card.value}</p>
                </div>
              ))}
            </section>

            {/* Items table */}
            <section className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-xs border-collapse print:text-[9px]">
                <thead>
                  <tr className="border-b border-app-border">
                    {columns.map(col => (
                      <th
                        key={col}
                        className="text-left font-medium text-muted py-2 pr-3 whitespace-nowrap print:py-1.5"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-app-border/50 break-inside-avoid">
                      <td className="py-2 pr-3 text-primary print:py-1">{item.name}</td>
                      <td className="py-2 pr-3 text-secondary whitespace-nowrap">{categoryLabels[item.category]}</td>
                      <td className="py-2 pr-3 text-secondary whitespace-nowrap">{statusLabels[item.status]}</td>
                      <td className="py-2 pr-3 text-secondary whitespace-nowrap">{item.purchase_date}</td>
                      <td className="py-2 pr-3 font-mono text-secondary whitespace-nowrap">
                        {formatCNY(item.purchase_price, 0)}
                      </td>
                      <td className="py-2 pr-3 font-mono text-secondary whitespace-nowrap">
                        {formatCNY(item.expense_total ?? 0, 0)}
                      </td>
                      <td className="py-2 pr-3 font-mono text-secondary whitespace-nowrap">
                        {item.status === 'sold' && item.sold_price != null
                          ? formatCNY(item.sold_price, 0)
                          : formatCNY(item.residual_value ?? 0, 0)}
                      </td>
                      <td className="py-2 pr-3 font-mono text-secondary whitespace-nowrap">{item.days_owned}</td>
                      <td className="py-2 pr-3 font-mono text-secondary whitespace-nowrap">
                        {formatDailyCost(item.daily_cost)}
                      </td>
                      <td className="py-2 pr-3 font-mono text-secondary whitespace-nowrap">
                        {formatCNY(item.annual_cost, 0)}
                      </td>
                      <td className="py-2 pr-3 font-mono font-semibold text-primary whitespace-nowrap">
                        {formatCNY(item.total_cost, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Footnote */}
            <footer className="mt-8 pt-4 border-t border-app-border text-2xs text-muted print:mt-6 space-y-1">
              <p>{t('report.formula')}</p>
              <p>{t('report.footer')}</p>
            </footer>
          </>
        )}
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 14mm; }
        }
      `}</style>
    </div>
  )
}
