import { useState } from 'react'
import { Archive, ArrowRight, DollarSign, TrendingDown } from 'lucide-react'
import { ItemWithStats } from '@/types'
import {
  calculateMarginalDailyCost,
  calculateDynamicSalvageValue,
  generateMarginalCostTrend,
  formatCNY,
  formatDailyCost,
} from '@/lib/calculations'
import {
  buildUpgradeVerdict,
  DecisionPreference,
  loadDecisionPreference,
} from '@/lib/decisionVerdict'
import {
  inferSalvageProfile,
  SALVAGE_PROFILE_RATES,
  type SalvageProfile,
} from '@/lib/dynamicSalvage'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CostTrendChart } from './CostTrendChart'
import { DecisionVerdictPanel } from './DecisionVerdictPanel'
import { useLanguage } from '@/i18n'
import { cn } from '@/lib/utils'
import type { TranslationKey } from '@/i18n/translations'

interface ComparisonCalculatorProps {
  item: ItemWithStats
}

type DispositionMode = 'sell' | 'keep'

const SALVAGE_PROFILE_LABEL_KEYS: Record<SalvageProfile, TranslationKey> = {
  valueKeeper: 'salvage.profile.valueKeeper',
  steady: 'salvage.profile.steady',
  fastDrop: 'salvage.profile.fastDrop',
}

export function ComparisonCalculator({ item }: ComparisonCalculatorProps) {
  const { t } = useLanguage()
  const [newPrice, setNewPrice] = useState('')
  const [newResidual, setNewResidual] = useState('')
  const [newSalvageProfile, setNewSalvageProfile] = useState<SalvageProfile>('steady')
  const [dispositionMode, setDispositionMode] = useState<DispositionMode>('sell')
  const [hassleDaily, setHassleDaily] = useState('0')
  const [spareWtpDaily, setSpareWtpDaily] = useState('1')
  const [decisionPreference, setDecisionPreference] = useState<DecisionPreference>(() =>
    loadDecisionPreference(),
  )

  const newPriceNum = parseFloat(newPrice) || 0
  const manualResidual = newResidual.trim() !== ''
  const newResidualNum = parseFloat(newResidual) || 0
  const hassleDailyNum = parseNonNegativeDaily(hassleDaily)
  const spareWtpDailyNum = parseNonNegativeDaily(spareWtpDaily)
  const newSalvageRate = SALVAGE_PROFILE_RATES[newSalvageProfile]
  const modelFirstYearResidual = newPriceNum > 0
    ? calculateDynamicSalvageValue(newPriceNum, 365, newSalvageRate)
    : 0
  const newFirstYearResidual = manualResidual ? newResidualNum : modelFirstYearResidual
  const newNetCost = Math.max(0, newPriceNum - newFirstYearResidual)
  const currentSalvageProfile = item.salvage_profile ?? inferSalvageProfile(item)
  const currentSalvageRate =
    item.annual_depreciation_rate ?? SALVAGE_PROFILE_RATES[currentSalvageProfile]
  const currentModelResidual = calculateDynamicSalvageValue(
    item.purchase_price,
    item.days_owned,
    currentSalvageRate,
  )
  const currentSalvageValue = Math.max(
    0,
    item.residual_value ?? currentModelResidual,
  )
  const currentMarginalDaily = calculateMarginalDailyCost(
    currentSalvageValue,
    365,
    currentSalvageRate,
  )
  const currentDecisionDaily = currentMarginalDaily + hassleDailyNum
  const spareHorizonDays = getSpareHorizonDays(item)
  const spareOpportunityDaily = currentSalvageValue / spareHorizonDays
  const spareExcessDaily = Math.max(0, spareOpportunityDaily - spareWtpDailyNum)
  const spareDecisionDaily =
    dispositionMode === 'keep' ? spareExcessDaily : 0

  const currentTrend = generateMarginalCostTrend(
    currentSalvageValue,
    365,
    currentSalvageRate,
    100,
    90,
  ).map(pt => ({
    ...pt,
    daily_cost: pt.daily_cost + hassleDailyNum,
  }))

  const manualNewFirstYearDaily = Math.max(0, newPriceNum - newResidualNum) / 365
  const breakEvenDay = newPriceNum > 0
    ? findMarginalBreakEvenDay(
        currentSalvageValue,
        currentSalvageRate,
        newPriceNum,
        newSalvageRate,
        manualResidual ? manualNewFirstYearDaily : null,
        hassleDailyNum,
        spareDecisionDaily,
      )
    : null

  const newDeviceTrend =
    newPriceNum > 0
      ? currentTrend.map(pt => ({
          ...pt,
          daily_cost: manualResidual
            ? manualNewFirstYearDaily + spareDecisionDaily
            : calculateMarginalDailyCost(newPriceNum, pt.day, newSalvageRate) + spareDecisionDaily,
        }))
      : undefined

  const effectiveNewNetCost = newNetCost + spareDecisionDaily * 365
  const newFirstYearDaily = newPriceNum > 0 ? effectiveNewNetCost / 365 : null
  const verdict = newFirstYearDaily != null
    ? buildUpgradeVerdict({
        item,
        newNetCost: effectiveNewNetCost,
        breakEvenDay,
        preference: decisionPreference,
        baselineDaily: currentDecisionDaily,
      })
    : null

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-serif text-primary text-sm mb-1">{t('calc.title')}</h3>
        <p className="text-2xs text-muted">{t('calc.hint')}</p>
      </div>

      <div className="rounded-xl border border-app-border bg-surface-2/45 p-3 space-y-3">
        <div>
          <p className="text-2xs font-medium uppercase tracking-widest text-muted">
            {t('calc.dispositionTitle')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <DispositionButton
            active={dispositionMode === 'sell'}
            icon={DollarSign}
            label={t('calc.dispositionSell')}
            description={t('calc.dispositionSellDesc')}
            onClick={() => setDispositionMode('sell')}
          />
          <DispositionButton
            active={dispositionMode === 'keep'}
            icon={Archive}
            label={t('calc.dispositionKeep')}
            description={t('calc.dispositionKeepDesc')}
            onClick={() => setDispositionMode('keep')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-app-border bg-surface/60 px-3 py-2">
            <p className="text-2xs text-muted">{t('calc.currentValue')}</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-primary">
              {formatCNY(currentSalvageValue, 0)}
            </p>
            <p className="mt-1 text-2xs leading-snug text-muted">
              {item.residual_value == null ? t('calc.currentValueAuto') : t('calc.currentValueManual')}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hassle-daily">{t('calc.hassleDaily')}</Label>
            <Input
              id="hassle-daily"
              type="number"
              min={0}
              step={0.1}
              prefix="¥"
              suffix={t('calc.perDay')}
              value={hassleDaily}
              onChange={e => setHassleDaily(e.target.value)}
            />
          </div>
        </div>
        {dispositionMode === 'keep' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="spare-wtp-daily">{t('calc.spareWtp')}</Label>
              <Input
                id="spare-wtp-daily"
                type="number"
                min={0}
                step={0.1}
                prefix="¥"
                suffix={t('calc.perDay')}
                value={spareWtpDaily}
                onChange={e => setSpareWtpDaily(e.target.value)}
              />
            </div>
            <div className="rounded-lg border border-app-border bg-surface/60 px-3 py-2">
              <p className="text-2xs text-muted">{t('calc.spareCost')}</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-primary">
                {formatDailyCost(spareOpportunityDaily)} {t('calc.perDay')}
              </p>
              <p className="mt-1 text-2xs leading-snug text-muted">
                {spareExcessDaily > 0
                  ? t('calc.spareExcess', { amount: formatDailyCost(spareExcessDaily) })
                  : t('calc.spareCovered')}
              </p>
            </div>
          </div>
        )}
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
            placeholder={t('form.auto')}
            prefix="¥"
            value={newResidual}
            onChange={e => setNewResidual(e.target.value)}
          />
        </div>
      </div>

      {!manualResidual && (
        <div className="rounded-lg border border-app-border bg-surface/50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-2xs font-medium uppercase tracking-widest text-muted">
              {t('calc.salvageModel')}
            </p>
            {newPriceNum > 0 && (
              <span className="font-mono text-2xs text-info">
                {formatCNY(modelFirstYearResidual, 0)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(['valueKeeper', 'steady', 'fastDrop'] as const).map(profile => (
              <button
                key={profile}
                type="button"
                onClick={() => setNewSalvageProfile(profile)}
                className={[
                  'rounded-md border px-2 py-1.5 text-left text-2xs transition-colors',
                  newSalvageProfile === profile
                    ? 'border-info-border bg-info-bg text-primary'
                    : 'border-app-border bg-surface/60 text-muted hover:bg-surface-2',
                ].join(' ')}
              >
                <span className="block truncate">{t(SALVAGE_PROFILE_LABEL_KEYS[profile])}</span>
                <span className="mt-0.5 block font-mono text-muted">
                  {(SALVAGE_PROFILE_RATES[profile] * 100).toFixed(0)}%
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-2xs text-muted">{t('calc.salvageModelHint')}</p>
        </div>
      )}

      {newPriceNum > 0 && (
        <>
          {verdict && (
            <DecisionVerdictPanel
              verdict={verdict}
              onPreferenceChange={setDecisionPreference}
            />
          )}

          {/* Comparison result */}
          <div className="rounded-xl bg-surface-2 border border-app-border p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="text-muted text-xs mb-0.5">{t('calc.keepCurrent')}</p>
                <p className="font-mono font-semibold text-primary">
                  {formatDailyCost(currentDecisionDaily)}{' '}
                  <span className="text-muted text-xs font-normal">{t('calc.perDay')}</span>
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted" />
              <div className="text-right">
                <p className="text-muted text-xs mb-0.5">{t('calc.buyNew')}</p>
                <p className="font-mono font-semibold text-primary">
                  {formatDailyCost(newFirstYearDaily!)}{' '}
                  <span className="text-muted text-xs font-normal">{t('calc.perDay')}</span>
                </p>
              </div>
            </div>

            {breakEvenDay !== null ? (
              <div className="pt-3 border-t border-app-border flex items-start gap-2">
                <TrendingDown className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <p className="text-sm text-secondary">
                  {t('calc.breakEvenPrefix')}{' '}
                  <span className="font-mono font-bold text-accent">{breakEvenDay}</span>{' '}
                  {t('calc.breakEvenDays')}{' '}
                  {t('calc.breakEvenMonthsPrefix')}{(breakEvenDay / 30).toFixed(1)}{t('calc.breakEvenMonthsSuffix')}{' '}
                  <span className="text-muted">{t('calc.breakEvenSuffix')}</span>
                </p>
              </div>
            ) : (
              <div className="pt-3 border-t border-app-border">
                <p className="text-sm text-muted">{t('calc.noBreakEven')}</p>
              </div>
            )}
          </div>

          {/* Chart comparison */}
          <div>
            <p className="text-xs text-muted mb-3">{t('calc.chartTitle')}</p>
            <CostTrendChart
              data={currentTrend}
              compareData={newDeviceTrend}
              compareLabel={newPrice ? `${t('chart.newDeviceLabel')} ${formatCNY(newPriceNum, 0)}` : t('chart.newDeviceLabel')}
            />
          </div>

          {/* Annual cost comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-accent-bg border border-accent-muted p-3">
              <p className="text-2xs text-accent/70 mb-1">{t('calc.keepAnnual')}</p>
              <p className="font-mono font-bold text-accent text-lg">
                {formatCNY(currentDecisionDaily * 365, 0)}
              </p>
            </div>
            <div className="rounded-lg bg-surface-2 border border-app-border p-3">
              <p className="text-2xs text-muted mb-1">{t('calc.buyAnnual')}</p>
              <p className="font-mono font-bold text-primary text-lg">
                {formatCNY(effectiveNewNetCost, 0)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function findMarginalBreakEvenDay(
  currentSalvageValue: number,
  currentAnnualRate: number,
  newPrice: number,
  newAnnualRate: number,
  fixedNewDailyCost: number | null,
  hassleDaily: number,
  spareDecisionDaily: number,
  maxDays = 3650,
) {
  for (let day = 1; day <= maxDays; day += 1) {
    const currentDaily = calculateMarginalDailyCost(
      currentSalvageValue,
      day,
      currentAnnualRate,
    ) + hassleDaily
    const newDaily = fixedNewDailyCost ?? calculateMarginalDailyCost(
      newPrice,
      day,
      newAnnualRate,
    )
    if (newDaily + spareDecisionDaily <= currentDaily) return day
  }
  return null
}

function parseNonNegativeDaily(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function getSpareHorizonDays(item: ItemWithStats) {
  if (!item.expected_years) return 730
  const remainingDays = Math.ceil(item.expected_years * 365 - item.days_owned)
  return Math.max(365, remainingDays)
}

function DispositionButton({
  active,
  icon: Icon,
  label,
  description,
  onClick,
}: {
  active: boolean
  icon: typeof DollarSign
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-20 rounded-lg border px-3 py-2 text-left transition-colors',
        active
          ? 'border-accent-muted bg-accent-bg text-primary'
          : 'border-app-border bg-surface/60 text-muted hover:border-border-strong hover:bg-surface-2 hover:text-secondary',
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium">
        <Icon className={cn('h-3.5 w-3.5', active ? 'text-accent' : 'text-muted')} />
        {label}
      </span>
      <span className="mt-1 block text-2xs leading-snug text-muted">
        {description}
      </span>
    </button>
  )
}
