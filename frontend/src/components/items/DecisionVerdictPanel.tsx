import {
  AlertTriangle,
  CheckCircle2,
  Coffee,
  Cpu,
  Info,
  OctagonX,
  PiggyBank,
  Scale,
  type LucideIcon,
} from 'lucide-react'
import type { TranslationKey } from '@/i18n/translations'
import { useLanguage } from '@/i18n'
import {
  DecisionPreference,
  saveDecisionPreference,
  UpgradeVerdict,
} from '@/lib/decisionVerdict'
import { formatCNY, formatDailyCost } from '@/lib/calculations'
import { cn } from '@/lib/utils'

interface DecisionVerdictPanelProps {
  verdict: UpgradeVerdict
  onPreferenceChange: (preference: DecisionPreference) => void
}

const PREFERENCE_OPTIONS: Array<{
  value: DecisionPreference
  icon: LucideIcon
  labelKey: TranslationKey
  descriptionKey: TranslationKey
}> = [
  {
    value: 'rational',
    icon: Scale,
    labelKey: 'verdict.preference.rational',
    descriptionKey: 'verdict.preference.rationalDesc',
  },
  {
    value: 'latte',
    icon: Coffee,
    labelKey: 'verdict.preference.latte',
    descriptionKey: 'verdict.preference.latteDesc',
  },
  {
    value: 'enthusiast',
    icon: Cpu,
    labelKey: 'verdict.preference.enthusiast',
    descriptionKey: 'verdict.preference.enthusiastDesc',
  },
]

const LEVEL_LABEL_KEYS: Record<UpgradeVerdict['level'], TranslationKey> = {
  green: 'verdict.level.green',
  yellow: 'verdict.level.yellow',
  red: 'verdict.level.red',
}

export function DecisionVerdictPanel({
  verdict,
  onPreferenceChange,
}: DecisionVerdictPanelProps) {
  const { t } = useLanguage()
  const tone = toneMap[verdict.level]
  const Icon = tone.icon
  const delta = Math.max(0, verdict.dailyDelta)
  const ratio = Number.isFinite(verdict.ratio) ? verdict.ratio.toFixed(1) : '∞'
  const preferenceName = t(
    PREFERENCE_OPTIONS.find(option => option.value === verdict.preference)?.labelKey
      ?? 'verdict.preference.latte',
  )

  function handlePreferenceChange(preference: DecisionPreference) {
    saveDecisionPreference(preference)
    onPreferenceChange(preference)
  }

  return (
    <section className={cn('rounded-xl border p-4 space-y-4', tone.panel)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', tone.iconBox)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className={cn('text-2xs font-semibold uppercase tracking-widest', tone.kicker)}>
              {t('verdict.title')}
            </p>
            <h4 className={cn('mt-1 text-base font-semibold leading-tight', tone.heading)}>
              {t(LEVEL_LABEL_KEYS[verdict.level])}
            </h4>
            <p className={cn('mt-1 text-sm leading-relaxed', tone.body)}>
              {verdictBody(t, verdict, delta, ratio, preferenceName)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <VerdictMetric
          label={t('verdict.metric.current')}
          value={formatDailyCost(verdict.baselineDaily)}
          suffix={t('calc.perDay')}
        />
        <VerdictMetric
          label={t('verdict.metric.new')}
          value={formatDailyCost(verdict.newFirstYearDaily)}
          suffix={t('calc.perDay')}
        />
        <VerdictMetric
          label={t('verdict.metric.delta')}
          value={`${verdict.dailyDelta <= 0 ? '-' : '+'}${formatDailyCost(Math.abs(verdict.dailyDelta))}`}
          suffix={t('calc.perDay')}
        />
      </div>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
        {PREFERENCE_OPTIONS.map(option => {
          const OptionIcon = option.icon
          const active = option.value === verdict.preference
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handlePreferenceChange(option.value)}
              className={cn(
                'min-h-20 rounded-lg border px-3 py-2 text-left transition-colors',
                active
                  ? 'border-accent-muted bg-accent-bg text-primary'
                  : 'border-app-border bg-surface/60 text-muted hover:border-border-strong hover:bg-surface-2 hover:text-secondary',
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <OptionIcon className={cn('h-3.5 w-3.5', active ? 'text-accent' : 'text-muted')} />
                {t(option.labelKey)}
              </span>
              <span className="mt-1 block text-2xs leading-snug text-muted">
                {t(option.descriptionKey)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-2">
        <InsightRow
          icon={PiggyBank}
          text={
            verdict.opportunitySavings > 0
              ? t('verdict.opportunity', {
                  days: verdict.opportunityDays,
                  amount: formatCNY(verdict.opportunitySavings, 0),
                })
              : t('verdict.opportunityFlat', { days: verdict.opportunityDays })
          }
        />
        {verdict.expenseTotal > 0 && (
          <InsightRow
            icon={Info}
            text={t('verdict.sunkCost', { amount: formatCNY(verdict.expenseTotal, 0) })}
          />
        )}
      </div>
    </section>
  )
}

function VerdictMetric({
  label,
  value,
  suffix,
}: {
  label: string
  value: string
  suffix: string
}) {
  return (
    <div className="rounded-lg border border-app-border bg-surface/60 px-3 py-2">
      <p className="text-2xs text-muted">{label}</p>
      <p className="mt-0.5 whitespace-nowrap font-mono text-sm font-semibold text-primary">
        {value} <span className="text-2xs font-normal text-muted">{suffix}</span>
      </p>
    </div>
  )
}

function InsightRow({
  icon: Icon,
  text,
}: {
  icon: LucideIcon
  text: string
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-app-border bg-surface/50 px-3 py-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
      <p className="text-xs leading-relaxed text-muted">{text}</p>
    </div>
  )
}

function verdictBody(
  t: ReturnType<typeof useLanguage>['t'],
  verdict: UpgradeVerdict,
  delta: number,
  ratio: string,
  preferenceName: string,
): string {
  if (verdict.reason === 'lower') return t('verdict.body.lower')
  if (verdict.reason === 'painless') {
    return t('verdict.body.painless', {
      delta: formatDailyCost(delta),
      preference: preferenceName,
    })
  }
  if (verdict.reason === 'premium') {
    return t('verdict.body.premium', { delta: formatDailyCost(delta) })
  }
  if (verdict.waitDays != null && verdict.waitTargetDaily != null) {
    return t('verdict.body.expensiveWait', {
      ratio,
      days: verdict.waitDays,
      target: formatDailyCost(verdict.waitTargetDaily),
    })
  }
  return t('verdict.body.expensive', { ratio })
}

const toneMap: Record<
  UpgradeVerdict['level'],
  {
    icon: LucideIcon
    panel: string
    iconBox: string
    kicker: string
    heading: string
    body: string
  }
> = {
  green: {
    icon: CheckCircle2,
    panel: 'border-success-border bg-success-bg',
    iconBox: 'border-success-border bg-surface/40 text-success',
    kicker: 'text-success/80',
    heading: 'text-success',
    body: 'text-secondary',
  },
  yellow: {
    icon: AlertTriangle,
    panel: 'border-warn-border bg-warn-bg',
    iconBox: 'border-warn-border bg-surface/40 text-warn',
    kicker: 'text-warn/80',
    heading: 'text-warn',
    body: 'text-secondary',
  },
  red: {
    icon: OctagonX,
    panel: 'border-danger-border bg-danger-bg',
    iconBox: 'border-danger-border bg-surface/40 text-danger',
    kicker: 'text-danger/80',
    heading: 'text-danger',
    body: 'text-secondary',
  },
}
