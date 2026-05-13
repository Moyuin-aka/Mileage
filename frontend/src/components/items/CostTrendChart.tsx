import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import { CostTrendPoint } from '@/types'
import { formatCNY } from '@/lib/calculations'
import { useLanguage } from '@/i18n'
import { cn } from '@/lib/utils'

type RangePreset = 'early' | 'current' | 'all'

interface CostTrendChartProps {
  data: CostTrendPoint[]
  todayDay?: number
  compareData?: CostTrendPoint[]
  compareLabel?: string
  referenceBand?: {
    min: number
    max: number
    label: string
  }
}

function CustomTooltip({
  active,
  payload,
  compareLabel,
}: TooltipProps<number, string> & { compareLabel?: string }) {
  const { t } = useLanguage()
  if (!active || !payload?.length) return null
  const main = payload.find(p => p.dataKey === 'daily_cost')
  const compare = payload.find(p => p.dataKey === 'compare_cost')
  const day = payload[0]?.payload?.day

  return (
    <div className="rounded-xl border border-app-border bg-surface-2/95 backdrop-blur px-4 py-3 shadow-xl text-sm">
      <p className="text-muted text-xs mb-2">
        {t('chart.dayPrefix')} {day} {t('chart.daySuffix')}
      </p>
      {main && (
        <p className="text-accent font-mono font-semibold">
          {formatCNY(main.value as number)} {t('chart.perDay')}
        </p>
      )}
      {compare && (
        <p className="text-info font-mono text-xs mt-1">
          {compareLabel ?? t('chart.newDeviceLabel')}: {formatCNY(compare.value as number)} {t('chart.perDay')}
        </p>
      )}
    </div>
  )
}

export function CostTrendChart({
  data,
  todayDay,
  compareData,
  compareLabel,
  referenceBand,
}: CostTrendChartProps) {
  const { t } = useLanguage()

  const totalDays = data[data.length - 1]?.day ?? 0
  const hasEarlyRange = totalDays > 400
  const defaultPreset: RangePreset = hasEarlyRange ? 'current' : 'all'
  const [preset, setPreset] = useState<RangePreset>(defaultPreset)

  function rangeForPreset(p: RangePreset): [number, number] {
    const today = todayDay ?? Math.round(totalDays * 0.7)
    if (p === 'early') return [1, Math.min(365, totalDays)]
    if (p === 'current') return [Math.max(1, today - 90), Math.min(totalDays, today + 365)]
    return [1, totalDays]
  }

  const [rangeStart, rangeEnd] = rangeForPreset(preset)

  const allMerged = data.map(pt => {
    const cmp = compareData?.find(c => c.day === pt.day)
    return { ...pt, compare_cost: cmp?.daily_cost }
  })
  const merged = allMerged.filter(pt => pt.day >= rangeStart && pt.day <= rangeEnd)

  const referenceValues = referenceBand ? [referenceBand.min, referenceBand.max] : []
  const compareValues = merged.flatMap(pt => pt.compare_cost != null ? [pt.compare_cost] : [])
  const minCost = Math.min(...merged.map(d => d.daily_cost), ...compareValues, ...referenceValues)
  const maxCost = Math.max(...merged.map(d => d.daily_cost), ...compareValues, ...referenceValues)

  const presets: Array<{ key: RangePreset; label: string; show: boolean }> = [
    { key: 'early', label: t('chart.rangeEarly'), show: hasEarlyRange },
    { key: 'current', label: t('chart.rangeCurrent'), show: hasEarlyRange },
    { key: 'all', label: t('chart.rangeAll'), show: true },
  ]

  return (
    <div className="w-full">
      {presets.some(p => p.show && p.key !== 'all') && (
        <div className="flex items-center gap-1 mb-3 justify-end">
          {presets.filter(p => p.show).map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPreset(p.key)}
              className={cn(
                'px-2.5 py-1 rounded-md text-2xs font-medium transition-colors',
                preset === p.key
                  ? 'bg-surface-3 text-primary'
                  : 'text-muted hover:text-secondary hover:bg-surface-3/50',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={merged} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgb(var(--color-border))"
            strokeWidth={1}
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tick={{ fill: 'rgb(var(--color-muted))', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}${t('chart.dayUnit')}`}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: 'rgb(var(--color-muted))', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `¥${v.toFixed(0)}`}
            domain={[minCost * 0.8, maxCost * 1.05]}
            width={48}
          />
          <Tooltip content={<CustomTooltip compareLabel={compareLabel} />} />

          {todayDay && (
            <ReferenceLine
              x={todayDay}
              stroke="rgb(var(--color-accent))"
              strokeDasharray="4 3"
              strokeWidth={1}
              label={{ value: t('chart.today'), fill: 'rgb(var(--color-accent))', fontSize: 11, position: 'insideTopRight' }}
            />
          )}

          {referenceBand && (
            <>
              <ReferenceLine
                y={referenceBand.max}
                stroke="rgb(var(--color-warn-muted))"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: referenceBand.label,
                  fill: 'rgb(var(--color-warn))',
                  fontSize: 10,
                  position: 'insideTopLeft',
                }}
              />
              <ReferenceLine
                y={referenceBand.min}
                stroke="rgb(var(--color-warn-muted))"
                strokeDasharray="2 4"
                strokeWidth={1}
              />
            </>
          )}

          <Line
            type="monotone"
            dataKey="daily_cost"
            stroke="rgb(var(--color-accent))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'rgb(var(--color-accent))', strokeWidth: 0 }}
          />

          {compareData && (
            <Line
              type="monotone"
              dataKey="compare_cost"
              stroke="rgb(var(--color-info))"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              name={compareLabel}
              activeDot={{ r: 3, fill: 'rgb(var(--color-info))', strokeWidth: 0 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {compareData && (
        <div className="flex items-center gap-4 mt-2 text-xs text-muted justify-end">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 bg-accent rounded" />
            {t('chart.currentDevice')}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-4 h-0.5 bg-info rounded opacity-70"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(to right, rgb(var(--color-info)) 0, rgb(var(--color-info)) 5px, transparent 5px, transparent 8px)',
              }}
            />
            {compareLabel}
          </span>
        </div>
      )}
    </div>
  )
}
