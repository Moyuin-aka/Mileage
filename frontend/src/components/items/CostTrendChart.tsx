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

interface CostTrendChartProps {
  data: CostTrendPoint[]
  todayDay?: number
  /** Optional second series data (new device scenario) */
  compareData?: CostTrendPoint[]
  compareLabel?: string
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const main = payload.find(p => p.dataKey === 'daily_cost')
  const compare = payload.find(p => p.dataKey === 'compare_cost')

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/95 backdrop-blur px-4 py-3 shadow-xl text-sm">
      <p className="text-zinc-500 text-xs mb-2">第 {payload[0]?.payload?.day} 天</p>
      {main && (
        <p className="text-accent font-mono font-semibold">
          {formatCNY(main.value as number)} / 天
        </p>
      )}
      {compare && (
        <p className="text-blue-400 font-mono text-xs mt-1">
          新设备: {formatCNY(compare.value as number)} / 天
        </p>
      )}
    </div>
  )
}

export function CostTrendChart({
  data,
  todayDay,
  compareData,
  compareLabel = '新设备',
}: CostTrendChartProps) {
  // Merge main and compare data by day index
  const merged = data.map(pt => {
    const cmp = compareData?.find(c => c.day === pt.day)
    return { ...pt, compare_cost: cmp?.daily_cost }
  })

  const minCost = Math.min(...data.map(d => d.daily_cost))
  const maxCost = Math.max(...data.map(d => d.daily_cost))

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={merged} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#27272a"
            strokeWidth={1}
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tick={{ fill: '#52525b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}天`}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#52525b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `¥${v.toFixed(0)}`}
            domain={[minCost * 0.8, maxCost * 1.05]}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Today reference line */}
          {todayDay && (
            <ReferenceLine
              x={todayDay}
              stroke="#4ade80"
              strokeDasharray="4 3"
              strokeWidth={1}
              label={{ value: '今天', fill: '#4ade80', fontSize: 11, position: 'insideTopRight' }}
            />
          )}

          {/* Main cost curve */}
          <Line
            type="monotone"
            dataKey="daily_cost"
            stroke="#4ade80"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#4ade80', strokeWidth: 0 }}
          />

          {/* Compare curve */}
          {compareData && (
            <Line
              type="monotone"
              dataKey="compare_cost"
              stroke="#60a5fa"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              name={compareLabel}
              activeDot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {compareData && (
        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500 justify-end">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 bg-accent rounded" />
            当前设备
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 bg-blue-400 rounded opacity-70" style={{ backgroundImage: 'repeating-linear-gradient(to right, #60a5fa 0, #60a5fa 5px, transparent 5px, transparent 8px)' }} />
            {compareLabel}
          </span>
        </div>
      )}
    </div>
  )
}
