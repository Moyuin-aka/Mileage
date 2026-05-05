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

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
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
          {t('chart.newDeviceLabel')}: {formatCNY(compare.value as number)} {t('chart.perDay')}
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

  const merged = data.map(pt => {
    const cmp = compareData?.find(c => c.day === pt.day)
    return { ...pt, compare_cost: cmp?.daily_cost }
  })

  const referenceValues = referenceBand ? [referenceBand.min, referenceBand.max] : []
  const minCost = Math.min(...data.map(d => d.daily_cost), ...referenceValues)
  const maxCost = Math.max(...data.map(d => d.daily_cost), ...referenceValues)

  return (
    <div className="w-full">
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
          <Tooltip content={<CustomTooltip />} />

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
