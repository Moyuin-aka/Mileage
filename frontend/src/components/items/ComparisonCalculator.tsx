import { useState } from 'react'
import { ArrowRight, TrendingDown } from 'lucide-react'
import { ItemWithStats } from '@/types'
import { generateCostTrend, findBreakEvenDay, formatCNY, formatDailyCost } from '@/lib/calculations'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CostTrendChart } from './CostTrendChart'

interface ComparisonCalculatorProps {
  item: ItemWithStats
}

export function ComparisonCalculator({ item }: ComparisonCalculatorProps) {
  const [newPrice, setNewPrice] = useState('')
  const [newResidual, setNewResidual] = useState('')

  const newPriceNum = parseFloat(newPrice) || 0
  const newResidualNum = parseFloat(newResidual) || 0

  const currentTrend = generateCostTrend(item, 365, 90)

  const breakEvenDay = newPriceNum > 0
    ? findBreakEvenDay(item, newPriceNum, newResidualNum)
    : null

  // New device cost trend (from day 1)
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
        <h3 className="font-serif text-zinc-100 text-sm mb-1">换购对比计算器</h3>
        <p className="text-2xs text-zinc-600">输入新设备价格，查看两条成本曲线的交叉点</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="new-price">新设备价格</Label>
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
          <Label htmlFor="new-residual">预期残值（可选）</Label>
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
                <p className="text-zinc-500 text-xs mb-0.5">继续用当前设备（明年均）</p>
                <p className="font-mono font-semibold text-zinc-100">
                  {formatDailyCost(currentFutureCost)}{' '}
                  <span className="text-zinc-500 text-xs font-normal">元/天</span>
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-700" />
              <div className="text-right">
                <p className="text-zinc-500 text-xs mb-0.5">换新设备（首年均）</p>
                <p className="font-mono font-semibold text-zinc-100">
                  {formatDailyCost(newAnnualCost! / 365)}{' '}
                  <span className="text-zinc-500 text-xs font-normal">元/天</span>
                </p>
              </div>
            </div>

            {breakEvenDay !== null ? (
              <div className="pt-3 border-t border-zinc-800 flex items-start gap-2">
                <TrendingDown className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <p className="text-sm">
                  <span className="text-zinc-300">
                    新设备使用 <span className="font-mono font-bold text-accent">{breakEvenDay}</span> 天
                    （约 {(breakEvenDay / 30).toFixed(1)} 个月）后，
                  </span>
                  <span className="text-zinc-400"> 日均成本将低于继续使用当前设备。</span>
                </p>
              </div>
            ) : (
              <div className="pt-3 border-t border-zinc-800">
                <p className="text-sm text-zinc-500">
                  在计算周期内（10年），新设备的日均成本始终高于当前设备——
                  <span className="text-zinc-400">继续用当前设备更划算。</span>
                </p>
              </div>
            )}
          </div>

          {/* Chart comparison */}
          <div>
            <p className="text-xs text-zinc-600 mb-3">成本曲线对比</p>
            <CostTrendChart
              data={currentTrend}
              todayDay={item.days_owned}
              compareData={newDeviceTrend}
              compareLabel={newPrice ? `新设备 ${formatCNY(newPriceNum, 0)}` : '新设备'}
            />
          </div>

          {/* Annual cost comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-accent-bg border border-accent-muted p-3">
              <p className="text-2xs text-accent/70 mb-1">继续使用年均成本</p>
              <p className="font-mono font-bold text-accent text-lg">
                {formatCNY(currentFutureCost * 365, 0)}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
              <p className="text-2xs text-zinc-500 mb-1">换新设备年均成本</p>
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
