import { useState } from 'react'
import { ArrowRight, TrendingDown } from 'lucide-react'
import { ItemWithStats } from '@/types'
import { generateCostTrend, findBreakEvenDay, formatCNY, formatDailyCost } from '@/lib/calculations'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CostTrendChart } from './CostTrendChart'
import { useLanguage } from '@/i18n'

interface ComparisonCalculatorProps {
  item: ItemWithStats
}

export function ComparisonCalculator({ item }: ComparisonCalculatorProps) {
  const { t } = useLanguage()
  const [newPrice, setNewPrice] = useState('')
  const [newResidual, setNewResidual] = useState('')

  const newPriceNum = parseFloat(newPrice) || 0
  const newResidualNum = parseFloat(newResidual) || 0

  const currentTrend = generateCostTrend(item, 365, 90)

  const breakEvenDay = newPriceNum > 0
    ? findBreakEvenDay(item, newPriceNum, newResidualNum)
    : null

  const newDeviceTrend =
    newPriceNum > 0
      ? currentTrend.map(pt => ({
          ...pt,
          daily_cost: (newPriceNum - newResidualNum) / pt.day,
        }))
      : undefined

  const currentFutureCost =
    (item.purchase_price + (item.expense_total ?? 0) - (item.residual_value ?? 0)) /
    (item.days_owned + 365)
  const newAnnualCost = newPriceNum > 0 ? ((newPriceNum - newResidualNum) / 365) : null

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-serif text-zinc-100 text-sm mb-1">{t('calc.title')}</h3>
        <p className="text-2xs text-zinc-600">{t('calc.hint')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="new-price">{t('calc.newPrice')}</Label>
          <Input
            id="new-price"
            type="number"
            placeholder="0"
            prefix="¥"
            value={newPrice}
            onChange={e => setNewPrice(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-residual">{t('calc.newResidual')}</Label>
          <Input
            id="new-residual"
            type="number"
            placeholder="0"
            prefix="¥"
            value={newResidual}
            onChange={e => setNewResidual(e.target.value)}
          />
        </div>
      </div>

      {newPriceNum > 0 && (
        <>
          {/* Comparison result */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="text-zinc-500 text-xs mb-0.5">{t('calc.keepCurrent')}</p>
                <p className="font-mono font-semibold text-zinc-100">
                  {formatDailyCost(currentFutureCost)}{' '}
                  <span className="text-zinc-500 text-xs font-normal">{t('calc.perDay')}</span>
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-700" />
              <div className="text-right">
                <p className="text-zinc-500 text-xs mb-0.5">{t('calc.buyNew')}</p>
                <p className="font-mono font-semibold text-zinc-100">
                  {formatDailyCost(newAnnualCost! / 365)}{' '}
                  <span className="text-zinc-500 text-xs font-normal">{t('calc.perDay')}</span>
                </p>
              </div>
            </div>

            {breakEvenDay !== null ? (
              <div className="pt-3 border-t border-zinc-800 flex items-start gap-2">
                <TrendingDown className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <p className="text-sm text-zinc-300">
                  {t('calc.breakEvenPrefix')}{' '}
                  <span className="font-mono font-bold text-accent">{breakEvenDay}</span>{' '}
                  {t('calc.breakEvenDays')}{' '}
                  {t('calc.breakEvenMonthsPrefix')}{(breakEvenDay / 30).toFixed(1)}{t('calc.breakEvenMonthsSuffix')}{' '}
                  <span className="text-zinc-400">{t('calc.breakEvenSuffix')}</span>
                </p>
              </div>
            ) : (
              <div className="pt-3 border-t border-zinc-800">
                <p className="text-sm text-zinc-500">{t('calc.noBreakEven')}</p>
              </div>
            )}
          </div>

          {/* Chart comparison */}
          <div>
            <p className="text-xs text-zinc-600 mb-3">{t('calc.chartTitle')}</p>
            <CostTrendChart
              data={currentTrend}
              todayDay={item.days_owned}
              compareData={newDeviceTrend}
              compareLabel={newPrice ? `${t('chart.newDeviceLabel')} ${formatCNY(newPriceNum, 0)}` : t('chart.newDeviceLabel')}
            />
          </div>

          {/* Annual cost comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-accent-bg border border-accent-muted p-3">
              <p className="text-2xs text-accent/70 mb-1">{t('calc.keepAnnual')}</p>
              <p className="font-mono font-bold text-accent text-lg">
                {formatCNY(currentFutureCost * 365, 0)}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
              <p className="text-2xs text-zinc-500 mb-1">{t('calc.buyAnnual')}</p>
              <p className="font-mono font-bold text-zinc-100 text-lg">
                {formatCNY(newAnnualCost!, 0)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
