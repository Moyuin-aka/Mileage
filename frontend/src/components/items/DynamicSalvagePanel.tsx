import { Activity, ShieldCheck, TrendingDown, Waves, type LucideIcon } from 'lucide-react'
import type { TranslationKey } from '@/i18n/translations'
import { useLanguage } from '@/i18n'
import {
  DynamicSalvageAnalysis,
  SalvageProfile,
} from '@/lib/dynamicSalvage'
import { formatCNY, formatDailyCost } from '@/lib/calculations'
import { cn } from '@/lib/utils'

interface DynamicSalvagePanelProps {
  analysis: DynamicSalvageAnalysis
  onProfileChange: (profile: SalvageProfile) => void
}

const PROFILE_OPTIONS: Array<{
  value: SalvageProfile
  icon: LucideIcon
  labelKey: TranslationKey
  detailKey: TranslationKey
}> = [
  {
    value: 'valueKeeper',
    icon: ShieldCheck,
    labelKey: 'salvage.profile.valueKeeper',
    detailKey: 'salvage.profile.valueKeeperDetail',
  },
  {
    value: 'steady',
    icon: Activity,
    labelKey: 'salvage.profile.steady',
    detailKey: 'salvage.profile.steadyDetail',
  },
  {
    value: 'fastDrop',
    icon: TrendingDown,
    labelKey: 'salvage.profile.fastDrop',
    detailKey: 'salvage.profile.fastDropDetail',
  },
]

export function DynamicSalvagePanel({
  analysis,
  onProfileChange,
}: DynamicSalvagePanelProps) {
  const { t } = useLanguage()

  return (
    <div className="rounded-xl border border-info-border bg-info-bg p-5 space-y-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-widest text-info/80">
            {t('salvage.kicker')}
          </p>
          <h2 className="mt-1 font-serif text-sm text-primary">{t('salvage.title')}</h2>
          <p className="mt-0.5 text-2xs text-muted">{t('salvage.subtitle')}</p>
        </div>
        <span className="rounded-full border border-info-border bg-surface/50 px-2 py-1 font-mono text-2xs text-info">
          r = {(analysis.annualRate * 100).toFixed(0)}% / yr
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SalvageMetric
          label={t('salvage.metric.dynamicResidual')}
          value={formatCNY(analysis.dynamicResidual, 0)}
        />
        <SalvageMetric
          label={t('salvage.metric.dynamicDaily')}
          value={formatDailyCost(analysis.dynamicDailyCost)}
          suffix={t('calc.perDay')}
        />
        <SalvageMetric
          label={t('salvage.metric.futureResidual')}
          value={formatCNY(analysis.futureResidual, 0)}
        />
      </div>

      <div className="grid gap-1 sm:grid-cols-3">
        {PROFILE_OPTIONS.map(option => {
          const Icon = option.icon
          const active = analysis.profile === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onProfileChange(option.value)}
              className={cn(
                'min-h-20 rounded-lg border px-3 py-2 text-left transition-colors',
                active
                  ? 'border-info-border bg-surface/70 text-primary'
                  : 'border-app-border bg-surface/40 text-muted hover:border-border-strong hover:bg-surface-2 hover:text-secondary',
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <Icon className={cn('h-3.5 w-3.5', active ? 'text-info' : 'text-muted')} />
                {t(option.labelKey)}
              </span>
              <span className="mt-1 block text-2xs leading-snug text-muted">
                {t(option.detailKey)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-app-border bg-surface/50 px-3 py-2">
          <p className="text-2xs font-medium uppercase tracking-widest text-muted">
            {t('salvage.staticCompare')}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {analysis.residualGap >= 0
              ? t('salvage.staticConservative', {
                  amount: formatCNY(Math.abs(analysis.residualGap), 0),
                })
              : t('salvage.staticOptimistic', {
                  amount: formatCNY(Math.abs(analysis.residualGap), 0),
                })}
          </p>
        </div>
        <div className="rounded-lg border border-app-border bg-surface/50 px-3 py-2">
          <p className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-widest text-muted">
            <Waves className="h-3 w-3" />
            {t('salvage.flattening')}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {analysis.isFlattening
              ? t('salvage.flattened', { amount: formatDailyCost(analysis.dropNext30) })
              : t('salvage.stillFalling', { amount: formatDailyCost(analysis.dropNext30) })}
          </p>
        </div>
      </div>
    </div>
  )
}

function SalvageMetric({
  label,
  value,
  suffix,
}: {
  label: string
  value: string
  suffix?: string
}) {
  return (
    <div className="rounded-lg border border-info-border bg-surface/50 px-3 py-2">
      <p className="text-2xs text-muted">{label}</p>
      <p className="mt-0.5 whitespace-nowrap font-mono text-sm font-semibold text-primary">
        {value} {suffix && <span className="text-2xs font-normal text-muted">{suffix}</span>}
      </p>
    </div>
  )
}
