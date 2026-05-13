import { useState } from 'react'
import { Archive, DollarSign } from 'lucide-react'
import { ItemWithStats } from '@/types'
import {
  calculateDynamicSalvageValue,
  formatCNY,
  formatDailyCost,
} from '@/lib/calculations'
import {
  inferSalvageProfile,
  SALVAGE_PROFILE_RATES,
} from '@/lib/dynamicSalvage'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/i18n'
import { cn } from '@/lib/utils'

interface ComparisonCalculatorProps {
  item: ItemWithStats
}

type DispositionMode = 'sell' | 'keep'
type LangCode = ReturnType<typeof useLanguage>['lang']
const HORIZON_DAYS = 730
const HORIZON_YEARS = 2

export function ComparisonCalculator({ item }: ComparisonCalculatorProps) {
  const { lang } = useLanguage()
  const [newPrice, setNewPrice] = useState('')
  const [dispositionMode, setDispositionMode] = useState<DispositionMode>('sell')

  const newPriceNum = parseNonNegative(newPrice)
  const currentSalvageProfile = item.salvage_profile ?? inferSalvageProfile(item)
  const currentSalvageRate =
    item.annual_depreciation_rate ?? SALVAGE_PROFILE_RATES[currentSalvageProfile]
  const currentModelValue = calculateDynamicSalvageValue(
    item.purchase_price,
    item.days_owned,
    currentSalvageRate,
  )
  const currentValue = Math.max(0, item.residual_value ?? currentModelValue)
  const currentValueAfterHorizon = calculateDynamicSalvageValue(
    currentValue,
    HORIZON_DAYS,
    currentSalvageRate,
  )
  const continueTotalCost = Math.max(0, currentValue - currentValueAfterHorizon)

  const newValueAfterHorizon = newPriceNum > 0
    ? calculateDynamicSalvageValue(newPriceNum, HORIZON_DAYS, currentSalvageRate)
    : 0
  const newExperienceCost = Math.max(0, newPriceNum - newValueAfterHorizon)
  const keptOldCost = dispositionMode === 'keep' ? continueTotalCost : 0
  const replaceTotalCost = newPriceNum > 0
    ? newExperienceCost + keptOldCost
    : null
  const experienceDelta = replaceTotalCost == null
    ? null
    : replaceTotalCost - continueTotalCost

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="new-price">{copy(lang, '新设备价格', 'New device price')}</Label>
          <Input
            id="new-price"
            type="number"
            min={0}
            placeholder="0"
            prefix="¥"
            value={newPrice}
            onChange={event => setNewPrice(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="old-device-disposition">
            {copy(lang, '旧设备处理方式', 'Old device disposition')}
          </Label>
          <Select
            value={dispositionMode}
            onValueChange={value => setDispositionMode(value as DispositionMode)}
          >
            <SelectTrigger id="old-device-disposition">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sell">
                <span className="inline-flex items-center gap-2">
                  <DollarSign className="h-3.5 w-3.5" />
                  {copy(lang, '卖掉', 'Sell')}
                </span>
              </SelectItem>
              <SelectItem value="keep">
                <span className="inline-flex items-center gap-2">
                  <Archive className="h-3.5 w-3.5" />
                  {copy(lang, '留用', 'Keep as spare')}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-app-border bg-surface/50 px-4 py-3">
          <p className="text-2xs uppercase tracking-widest text-muted">
            {copy(lang, '旧设备估价', 'Old device value')}
          </p>
          <p className="mt-1 font-mono text-lg font-semibold leading-none text-primary">
            {formatCNY(currentValue, 0)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {copy(lang, '已自动带入，不需要手动填写。', 'Filled automatically; no manual input needed.')}
          </p>
        </div>

        <div className="rounded-lg border border-app-border bg-surface/50 px-4 py-3">
          <p className="text-2xs uppercase tracking-widest text-muted">
            {copy(lang, '继续使用两年', 'Keep for two years')}
          </p>
          <p className="mt-1 font-mono text-lg font-semibold leading-none text-primary">
            {formatCNY(continueTotalCost, 0)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {copy(
              lang,
              `约 ${formatDailyCost(continueTotalCost / HORIZON_DAYS)} 元/天，两年后旧设备大约还值 ${formatCNY(currentValueAfterHorizon, 0)}。`,
              `About ${formatDailyCost(continueTotalCost / HORIZON_DAYS)}/day; the old device is estimated at ${formatCNY(currentValueAfterHorizon, 0)} after two years.`,
            )}
          </p>
        </div>
      </div>

      <div className={cn(
        'rounded-lg border bg-surface/50 px-4 py-4',
        experienceDelta == null
          ? 'border-app-border'
          : experienceDelta <= 0
          ? 'border-success-border'
          : 'border-danger-border',
      )}>
        <p className="text-2xs uppercase tracking-widest text-muted">
          {copy(lang, '两年体验差价', 'Two-year experience premium')}
        </p>

        {experienceDelta == null ? (
          <>
            <p className="mt-2 text-sm font-semibold text-primary">
              {copy(lang, '输入新设备价格后计算', 'Enter a price to calculate')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {copy(
                lang,
                '系统会比较未来两年继续使用和换新后的总折价，把差额理解成你为新设备体验多付的钱。',
                'The calculator compares total value loss over the next two years and treats the difference as the premium paid for the new-device experience.',
              )}
            </p>
          </>
        ) : (
          <>
            <p className={cn(
              'mt-2 font-mono text-3xl font-bold leading-none',
              experienceDelta <= 0 ? 'text-success' : 'text-danger',
            )}>
              {experienceDelta <= 0 ? '-' : '+'}
              {formatCNY(Math.abs(experienceDelta), 0)}
              <span className="ml-1 text-sm font-normal text-muted">
                {copy(lang, '两年', 'over two years')}
              </span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {resultExplanation({
                lang,
                dispositionMode,
                currentValue,
                newExperienceCost,
                continueTotalCost,
                replaceTotalCost: replaceTotalCost!,
                experienceDelta,
              })}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function resultExplanation({
  lang,
  dispositionMode,
  currentValue,
  newExperienceCost,
  continueTotalCost,
  replaceTotalCost,
  experienceDelta,
}: {
  lang: LangCode
  dispositionMode: DispositionMode
  currentValue: number
  newExperienceCost: number
  continueTotalCost: number
  replaceTotalCost: number
  experienceDelta: number
}) {
  const deltaText = formatCNY(Math.abs(experienceDelta), 0)
  if (experienceDelta <= 0) {
    return copy(
      lang,
      `如果你打算再用 ${HORIZON_YEARS} 年，换新预计折价 ${formatCNY(replaceTotalCost, 0)}，继续使用预计折价 ${formatCNY(continueTotalCost, 0)}。按这个估算，换新没有额外体验溢价，旧设备现在约 ${formatCNY(currentValue, 0)} 可处理。`,
      `Over the next ${HORIZON_YEARS} years, upgrading is estimated to lose ${formatCNY(replaceTotalCost, 0)} in value, while keeping this one loses about ${formatCNY(continueTotalCost, 0)}. By this estimate, the upgrade has no extra experience premium, and the old device is worth about ${formatCNY(currentValue, 0)} today.`,
    )
  }

  if (dispositionMode === 'sell') {
    return copy(
      lang,
      `如果你打算再用 ${HORIZON_YEARS} 年，新设备预计折价 ${formatCNY(newExperienceCost, 0)}；继续用现在这台预计折价 ${formatCNY(continueTotalCost, 0)}。差价 ${deltaText} 买的是 ${HORIZON_YEARS} 年的新设备体验，旧设备现在约 ${formatCNY(currentValue, 0)} 可卖出回收现金。`,
      `Over the next ${HORIZON_YEARS} years, the new device is expected to lose ${formatCNY(newExperienceCost, 0)} in value, while keeping this one loses about ${formatCNY(continueTotalCost, 0)}. The ${deltaText} difference buys ${HORIZON_YEARS} years of new-device experience, and the old device can be sold for about ${formatCNY(currentValue, 0)} in cash.`,
    )
  }

  return copy(
    lang,
    `如果你打算再用 ${HORIZON_YEARS} 年，换新组合预计折价 ${formatCNY(replaceTotalCost, 0)}，继续只用旧设备预计折价 ${formatCNY(continueTotalCost, 0)}。差价 ${deltaText} 主要买的是 ${HORIZON_YEARS} 年的新设备体验，旧设备会留下来当备用。`,
    `Over the next ${HORIZON_YEARS} years, the upgrade setup is expected to lose ${formatCNY(replaceTotalCost, 0)} in value, while only keeping the old device loses about ${formatCNY(continueTotalCost, 0)}. The ${deltaText} difference mostly buys ${HORIZON_YEARS} years of new-device experience while keeping the old one as a spare.`,
  )
}

function copy(lang: LangCode, zh: string, en: string) {
  return lang === 'zh' ? zh : en
}

function parseNonNegative(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}
