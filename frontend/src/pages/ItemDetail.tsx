import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit3, Trash2, Archive, DollarSign,
  AlertTriangle, FileText,
  PlusCircle, Wrench, Battery, ShieldCheck, Package,
  Settings2, CheckCircle2, CircleHelp,
} from 'lucide-react'
import {
  ExpenseType,
  ItemCategory,
  ItemExpense,
  ItemStatus,
  ItemWithStats,
} from '@/types'
import { useItem, useItemMutations } from '@/hooks/useItems'
import {
  formatCNY,
  formatDailyCost,
} from '@/lib/calculations'
import {
  COST_BENCHMARK_PROFILES,
  MAIN_DEVICE_PROFILES,
  PERIPHERAL_PROFILES,
  DEFAULT_COST_BENCHMARK_KEYWORDS,
  buildUpgradeSignals,
  isPeripheralProfile,
  loadCostBenchmarkKeywords,
  normalizeCostBenchmarkKeywords,
  saveCostBenchmarkKeywords,
  type CostBenchmarkKeywords,
  type CostBenchmarkProfile,
  type UpgradeSignals,
} from '@/lib/costBenchmarks'
import { formatDate } from '@/lib/utils'
import { formatCurrencyAmount } from '@/lib/currency'
import {
  buildDynamicSalvageAnalysis,
  inferSalvageProfile,
} from '@/lib/dynamicSalvage'
import { ComparisonCalculator } from '@/components/items/ComparisonCalculator'
import { CollapsibleSection } from '@/components/items/CollapsibleSection'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogBody, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/i18n'

const EXPENSE_TYPES: ExpenseType[] = [
  'repair', 'battery', 'maintenance', 'accessory', 'warranty', 'other',
]

type KeywordDraft = Record<CostBenchmarkProfile, string>

export function ItemDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, lang, categoryLabels, statusLabels, expenseTypeLabels } = useLanguage()
  const { item, loading, error, reload } = useItem(id!)
  const mutations = useItemMutations(reload)

  const [retireOpen, setRetireOpen] = useState(false)
  const [sellOpen, setSellOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [retireDate, setRetireDate] = useState(new Date().toISOString().slice(0, 10))
  const [soldPrice, setSoldPrice] = useState('')
  const [expenseType, setExpenseType] = useState<ExpenseType>('repair')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10))
  const [expenseDescription, setExpenseDescription] = useState('')
  const [countsInCost, setCountsInCost] = useState(true)
  const [verdictHelpOpen, setVerdictHelpOpen] = useState(false)
  const [keywordSettingsOpen, setKeywordSettingsOpen] = useState(false)
  const [benchmarkKeywords, setBenchmarkKeywords] = useState<CostBenchmarkKeywords>(
    () => loadCostBenchmarkKeywords(),
  )
  const [keywordDraft, setKeywordDraft] = useState<KeywordDraft>(() =>
    keywordsToDraft(loadCostBenchmarkKeywords()),
  )

  if (loading) return <LoadingSkeleton />
  if (error || !item) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-serif text-secondary text-lg mb-2">{t('detail.notFound')}</p>
        <p className="text-muted text-sm mb-6">{error}</p>
        <Button variant="outline" onClick={() => navigate('/')}>{t('detail.backHome')}</Button>
      </div>
    )
  }

  const expenses = item.expenses ?? []
  const expenseTotal = item.expense_total ?? 0

  const upgradeSignals = buildUpgradeSignals(item, benchmarkKeywords)
  const decisionFrame = getDecisionFrame(item, upgradeSignals)
  const canConfigureBenchmark = item.status === 'active' && item.category === 'electronics'
  const isPeripheralOverService = upgradeSignals?.isOverService === true

  const activeSalvageProfile = item.salvage_profile ?? inferSalvageProfile(item)
  const canShowDynamicSalvage = item.status === 'active' && item.category === 'electronics'
  const dynamicSalvage = canShowDynamicSalvage
    ? buildDynamicSalvageAnalysis(
        item,
        activeSalvageProfile,
      )
    : null
  const currentValue = estimateCurrentValue(item, dynamicSalvage)
  const remainingValueRatio = item.purchase_price > 0
    ? clamp(currentValue / item.purchase_price, 0, 1)
    : 0
  const valueLabelRatio = clamp(remainingValueRatio, 0.18, 0.82)
  const recoveredValuePct = Math.round((1 - remainingValueRatio) * 100)
  const spentToDate = Math.max(0, item.purchase_price + expenseTotal - currentValue)
  const futureValue = dynamicSalvage?.futureResidual ?? currentValue
  const thirtyDayDrop = estimateThirtyDayDrop(item, dynamicSalvage)
  const detailVerdict = buildDetailVerdict({
    item,
    signals: upgradeSignals,
    dynamicSalvage,
    isPeripheralOverService,
    thirtyDayDrop,
    recoveredValuePct,
    decisionFrame,
    lang,
  })
  const replacementSummary = replacementSummaryText(
    detailVerdict,
    item,
    thirtyDayDrop,
    decisionFrame,
    lang,
  )
  const verdictExplanation = verdictExplanationText(
    item,
    upgradeSignals,
    dynamicSalvage,
    thirtyDayDrop,
    recoveredValuePct,
    decisionFrame,
    lang,
  )
  const purchaseSummary = purchaseInfoSummary(item, expenseTotal, lang)

  // Collapsed summaries
  const expenseSummary = expenses.length === 0
    ? t('detail.noExpenses')
    : expenseTotal > 0
    ? `${expenses.length} 条 · ${t('detail.expenseImpactPrefix')} ${formatDailyCost(item.daily_cost - item.base_daily_cost)}${t('detail.perDay')}`
    : `${expenses.length} 条 · ${t('detail.recordOnly')}`

  function openKeywordSettings() {
    setKeywordDraft(keywordsToDraft(benchmarkKeywords))
    setKeywordSettingsOpen(true)
  }

  function handleSaveKeywordSettings() {
    const next = normalizeCostBenchmarkKeywords(
      COST_BENCHMARK_PROFILES.reduce((result, profile) => {
        result[profile] = parseKeywordDraft(keywordDraft[profile])
        return result
      }, {} as CostBenchmarkKeywords),
    )
    saveCostBenchmarkKeywords(next)
    setBenchmarkKeywords(next)
    setKeywordSettingsOpen(false)
  }

  function handleResetKeywordSettings() {
    setKeywordDraft(keywordsToDraft(DEFAULT_COST_BENCHMARK_KEYWORDS))
  }

  async function handleRetire() {
    await mutations.retireItem(item!.id, retireDate)
    setRetireOpen(false)
  }

  async function handleSell() {
    const price = parseFloat(soldPrice)
    if (!isNaN(price)) {
      await mutations.sellItem(item!.id, price)
      setSellOpen(false)
    }
  }

  async function handleDelete() {
    await mutations.deleteItem(item!.id)
    navigate('/', { replace: true })
  }

  async function handleCreateExpense() {
    const amount = parseFloat(expenseAmount)
    if (isNaN(amount) || amount < 0) return

    const result = await mutations.createExpense(item!.id, {
      type: expenseType,
      amount,
      expense_date: expenseDate,
      description: expenseDescription.trim() || undefined,
      counts_in_cost: countsInCost,
    })

    if (result) {
      setExpenseOpen(false)
      setExpenseType('repair')
      setExpenseAmount('')
      setExpenseDate(new Date().toISOString().slice(0, 10))
      setExpenseDescription('')
      setCountsInCost(true)
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    await mutations.deleteExpense(item!.id, expenseId)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-muted hover:text-secondary transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('detail.back')}
        </button>

        {item.status === 'active' && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/edit/${item.id}`)}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('detail.edit')}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRetireOpen(true)}>
              <Archive className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('detail.retire')}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSellOpen(true)}>
              <DollarSign className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('detail.sell')}</span>
            </Button>
          </div>
        )}
        {item.status !== 'active' && (
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <section className="rounded-xl border border-app-border bg-surface-2 p-5">
        <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl leading-tight text-primary">
              {item.name}
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {categoryLabels[item.category as ItemCategory]}
              {' · '}
              {statusLabels[item.status as ItemStatus]}
              {' · '}
              {item.days_owned} {t('detail.days')}
              {item.purchase_channel ? ` · ${item.purchase_channel}` : ''}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusPill verdict={detailVerdict} />
              <StatusHelp
                open={verdictHelpOpen}
                explanation={verdictExplanation}
                onToggle={() => setVerdictHelpOpen(open => !open)}
                lang={lang}
              />
              {item.is_overdue && (
                <span className="inline-flex items-center gap-1 rounded-full border border-warn-border px-2 py-1 text-2xs font-medium text-warn">
                  <AlertTriangle className="h-3 w-3" />
                  {t('detail.overdue')}
                </span>
              )}
            </div>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-secondary">
              {detailVerdict.headline}
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-2xs uppercase tracking-widest text-muted">
              {lang === 'zh' ? '平均每天' : 'Per day'}
            </p>
            <div className="mt-1 flex items-baseline gap-1 sm:justify-end">
              <span className="font-mono text-4xl font-bold leading-none text-primary">
                {formatDailyCost(item.daily_cost)}
              </span>
              <span className="text-sm text-muted">{t('detail.perDay')}</span>
            </div>
            {expenseTotal > 0 && (
              <p className="mt-1 text-2xs text-muted">
                {lang === 'zh' ? '纯购入成本' : 'Base (no extra expenses)'}{' '}
                <span className="font-mono text-secondary">
                  {formatDailyCost(item.base_daily_cost)} {t('detail.perDay')}
                </span>
              </p>
            )}
          </div>
        </div>

        <div
          className="mt-5 w-full"
          style={{ maxWidth: 'calc(100vw - 4rem)' }}
        >
          <div className="relative h-2 rounded-full bg-surface-3">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-success/70"
              style={{ width: `${remainingValueRatio * 100}%` }}
            />
            <div
              className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
              style={{ left: `${remainingValueRatio * 100}%` }}
            />
          </div>
          <div className="relative mt-2 h-5 text-2xs text-muted">
            <span className="absolute left-0 top-0">¥0</span>
            <span
              className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-center text-secondary"
              style={{ left: `${valueLabelRatio * 100}%` }}
            >
              {lang === 'zh' ? '当前' : 'Now'} {formatCNY(currentValue, 0)}
            </span>
            <span className="absolute right-0 top-0 text-right">
              {formatCNY(item.purchase_price, 0)}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-3">
        <KeyMetric
          label={lang === 'zh' ? '当前估值' : 'Current value'}
          value={formatCNY(currentValue, 0)}
          helper={currentValueHelper(item, dynamicSalvage, lang)}
        />
        <KeyMetric
          label={lang === 'zh' ? '已花费' : 'Spent so far'}
          value={formatCNY(spentToDate, 0)}
          helper={spentHelperText(expenseTotal, lang)}
        />
        <KeyMetric
          label={decisionFrame === 'economic'
            ? (lang === 'zh' ? '一年后估值' : 'Value in one year')
            : (lang === 'zh' ? '已使用' : 'Used for')}
          value={decisionFrame === 'economic'
            ? formatCNY(futureValue, 0)
            : `${item.days_owned} ${t('detail.days')}`}
          helper={decisionFrame === 'economic'
            ? futureValueHelper(dynamicSalvage, lang)
            : copy(lang, '外设主要看坏没坏', 'For peripherals, condition matters most')}
        />
      </section>

      <CollapsibleSection
        title={decisionFrame === 'economic'
          ? (lang === 'zh' ? '更换信号' : 'Replacement signals')
          : (lang === 'zh' ? '使用状态' : 'Use status')}
        summary={replacementSummary}
        defaultOpen={false}
      >
        <ReplacementSignalPanel
          item={item}
          signals={upgradeSignals}
          dynamicSalvage={dynamicSalvage}
          thirtyDayDrop={thirtyDayDrop}
          recoveredValuePct={recoveredValuePct}
          decisionFrame={decisionFrame}
          currentValue={currentValue}
          onEditKeywords={canConfigureBenchmark ? openKeywordSettings : undefined}
          lang={lang}
        />
      </CollapsibleSection>

      {item.status === 'active' && decisionFrame === 'economic' && (
        <CollapsibleSection
          title={lang === 'zh' ? '换购计算器' : 'Upgrade calculator'}
          summary={lang === 'zh' ? '值不值得现在换？' : 'Is replacing it worth it now?'}
          defaultOpen={false}
        >
          <ComparisonCalculator item={item} />
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title={lang === 'zh' ? '购入信息' : 'Purchase info'}
        summary={purchaseSummary}
        defaultOpen={false}
        headerAction={
          item.status === 'active' ? (
            <Button variant="ghost" size="sm" onClick={() => setExpenseOpen(true)}>
              <PlusCircle className="h-3.5 w-3.5" />
              {t('detail.addExpense')}
            </Button>
          ) : undefined
        }
      >
        <PurchaseInfoPanel
          item={item}
          expenses={expenses}
          expenseTotal={expenseTotal}
          expenseSummary={expenseSummary}
          expenseTypeLabels={expenseTypeLabels}
          onDeleteExpense={handleDeleteExpense}
          deletingExpense={mutations.saving}
          lang={lang}
          t={t}
        />
      </CollapsibleSection>

      {/* Retire dialog */}
      <Dialog open={retireOpen} onOpenChange={setRetireOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('retire.title')}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-muted">
              {t('retire.bodyPrefix')}{item.name}{t('retire.bodyMid')}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="retire-date">{t('retire.date')}</Label>
              <Input
                id="retire-date"
                type="date"
                value={retireDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => setRetireDate(e.target.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">{t('dialog.cancel')}</Button>
            </DialogClose>
            <Button variant="outline" size="sm" onClick={handleRetire} disabled={mutations.saving}>
              {t('retire.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sell dialog */}
      <Dialog open={sellOpen} onOpenChange={setSellOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sell.title')}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-muted">
              {t('sell.bodyPrefix')}{item.name}{t('sell.bodyMid')}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="sold-price">{t('sell.price')}</Label>
              <Input
                id="sold-price"
                type="number"
                placeholder="0"
                prefix="¥"
                value={soldPrice}
                onChange={e => setSoldPrice(e.target.value)}
              />
            </div>
            {soldPrice && !isNaN(parseFloat(soldPrice)) && (
              <div className="rounded-lg bg-surface border border-app-border p-3">
                <p className="text-xs text-muted">
                  {t('detail.sellNetLoss')}{' '}
                  <span className="text-secondary font-mono font-medium">
                    {formatCNY(item.purchase_price + expenseTotal - parseFloat(soldPrice))}
                  </span>
                  {' · '}
                  {t('detail.sellHeld')} {item.days_owned} {t('detail.sellActualDaily')}{' '}
                  <span className="font-mono text-accent font-semibold">
                    {formatDailyCost(
                      Math.max(0, item.purchase_price + expenseTotal - parseFloat(soldPrice)) /
                        item.days_owned,
                    )}{' '}
                    {t('detail.perDay')}
                  </span>
                </p>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">{t('dialog.cancel')}</Button>
            </DialogClose>
            <Button
              variant="accent"
              size="sm"
              onClick={handleSell}
              disabled={mutations.saving || !soldPrice}
            >
              {t('sell.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense dialog */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('expenseDialog.title')}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('expenseDialog.type')}</Label>
                <Select value={expenseType} onValueChange={v => setExpenseType(v as ExpenseType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {expenseTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expense-amount">{t('expenseDialog.amount')}</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0"
                  prefix="¥"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-date">{t('expenseDialog.date')}</Label>
              <Input
                id="expense-date"
                type="date"
                value={expenseDate}
                min={item.purchase_date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => setExpenseDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-description">{t('expenseDialog.description')}</Label>
              <Input
                id="expense-description"
                placeholder={t('expenseDialog.descPlaceholder')}
                value={expenseDescription}
                onChange={e => setExpenseDescription(e.target.value)}
              />
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-app-border bg-surface/60 p-3">
              <input
                type="checkbox"
                checked={countsInCost}
                onChange={e => setCountsInCost(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border-strong bg-surface-2 accent-accent"
              />
              <span>
                <span className="block text-sm text-secondary">{t('expenseDialog.countInCost')}</span>
                <span className="block text-xs text-muted mt-0.5">
                  {t('expenseDialog.countInCostHint')}
                </span>
              </span>
            </label>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">{t('dialog.cancel')}</Button>
            </DialogClose>
            <Button
              variant="accent"
              size="sm"
              onClick={handleCreateExpense}
              disabled={mutations.saving || !expenseAmount}
            >
              {t('expenseDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Benchmark keyword settings */}
      <BenchmarkKeywordDialog
        open={keywordSettingsOpen}
        draft={keywordDraft}
        onOpenChange={setKeywordSettingsOpen}
        onChange={(profile, value) => setKeywordDraft(current => ({ ...current, [profile]: value }))}
        onReset={handleResetKeywordSettings}
        onSave={handleSaveKeywordSettings}
        t={t}
      />

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted">
              {t('deleteDialog.bodyPrefix')}{item.name}{t('deleteDialog.bodyMid')}
            </p>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">{t('dialog.cancel')}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={mutations.saving}
            >
              {t('deleteDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Helper sub-components ──────────────────────────────────────────────────

type Translate = ReturnType<typeof useLanguage>['t']
type LangCode = ReturnType<typeof useLanguage>['lang']
type DynamicAnalysis = ReturnType<typeof buildDynamicSalvageAnalysis>
type DetailTone = 'green' | 'yellow' | 'red' | 'neutral'
type DecisionFrame = 'economic' | 'physical' | 'record'

interface DetailVerdict {
  tone: DetailTone
  label: string
  headline: string
}

function copy(lang: LangCode, zh: string, en: string) {
  return lang === 'zh' ? zh : en
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function estimateCurrentValue(item: ItemWithStats, dynamicSalvage: DynamicAnalysis | null) {
  if (item.status === 'sold' && item.sold_price != null) return Math.max(0, item.sold_price)
  if (dynamicSalvage) return Math.max(0, dynamicSalvage.dynamicResidual)
  return Math.max(0, item.residual_value ?? 0)
}

function estimateThirtyDayDrop(item: ItemWithStats, dynamicSalvage: DynamicAnalysis | null) {
  if (dynamicSalvage) return dynamicSalvage.dropNext30
  const futureDaily = Math.max(0, item.total_cost) / Math.max(1, item.days_owned + 30)
  return Math.max(0, item.daily_cost - futureDaily)
}

function getDecisionFrame(
  item: ItemWithStats,
  signals: UpgradeSignals | null,
): DecisionFrame {
  if (item.category !== 'electronics') return 'record'

  const profile = signals?.benchmark.profile
  if (profile && (isPeripheralProfile(profile) || profile === 'wearable')) {
    return 'physical'
  }

  if (item.purchase_price <= 1000) return 'physical'

  return 'economic'
}

function buildDetailVerdict({
  item,
  signals,
  dynamicSalvage,
  isPeripheralOverService,
  thirtyDayDrop,
  recoveredValuePct,
  decisionFrame,
  lang,
}: {
  item: ItemWithStats
  signals: UpgradeSignals | null
  dynamicSalvage: DynamicAnalysis | null
  isPeripheralOverService: boolean
  thirtyDayDrop: number
  recoveredValuePct: number
  decisionFrame: DecisionFrame
  lang: LangCode
}): DetailVerdict {
  if (item.status !== 'active') {
    return {
      tone: 'neutral',
      label: copy(lang, '已落幕', 'Closed'),
      headline: copy(
        lang,
        `这件资产已经画上句号，最终日均成本定格在 ${formatDailyCost(item.daily_cost)} 元/天。`,
        `This asset is closed. Final daily cost locked at ${formatDailyCost(item.daily_cost)}/day.`,
      ),
    }
  }

  const hasFault = (signals?.physicalFaults?.length ?? 0) > 0
  if (hasFault || signals?.latestRepair?.overResidual) {
    return {
      tone: 'red',
      label: copy(lang, '建议更换', 'Consider replacing'),
      headline: copy(
        lang,
        `每天 ${formatDailyCost(item.daily_cost)} 元，但维修或故障风险已经比继续摊薄成本更值得关注。`,
        `At ${formatDailyCost(item.daily_cost)}/day, repair risk or reliability now outweighs squeezing cost lower.`,
      ),
    }
  }

  if (decisionFrame === 'physical') {
    if (item.days_owned <= 90) {
      return {
        tone: 'green',
        label: copy(lang, '正常使用', 'Normal'),
        headline: copy(
          lang,
          '刚入手，成本曲线还陡——每天都在快速摊薄购入成本。',
          'Recently purchased; the cost curve is still steep and falling fast every day.',
        ),
      }
    }

    if (item.is_overdue || isPeripheralOverService) {
      return {
        tone: 'yellow',
        label: copy(lang, '超龄服役', 'Over lifespan'),
        headline: copy(
          lang,
          '已经超出了当初设定的使用年限——继续用就是赚到，出现影响主力使用的故障再考虑更换。',
          'Past the planned lifespan — every extra day is a bonus. Only replace when a fault actually gets in the way.',
        ),
      }
    }

    return {
      tone: 'green',
      label: copy(lang, '继续使用', 'Keep using'),
      headline: copy(
        lang,
        '没有明显故障，继续用。日均成本是一把记账尺，不是换机的理由。',
        'No obvious fault; keep using it. Daily cost is a ledger, not a replacement trigger.',
      ),
    }
  }

  if (decisionFrame === 'record') {
    return {
      tone: 'neutral',
      label: copy(lang, '持续持有', 'Tracking'),
      headline: copy(
        lang,
        '这类资产主要看使用价值；日均成本只是记录花费，不需要用它来判断去留。',
        'This asset type is tracked for spend visibility; daily cost is not a replacement signal here.',
      ),
    }
  }

  if (item.is_overdue || isPeripheralOverService || dynamicSalvage?.isFlattening || thirtyDayDrop < 0.2) {
    return {
      tone: 'yellow',
      label: copy(lang, '换机窗口', 'Upgrade window'),
      headline: copy(
        lang,
        `已经把这台设备 ${recoveredValuePct}% 的价值用了回来，曲线趋平——每天再省约 ${formatDailyCost(thirtyDayDrop)} 元，换不换开始变成体验问题了。`,
        `You have recovered ${recoveredValuePct}% of this device's value. The curve is flattening — keeping it saves about ${formatDailyCost(thirtyDayDrop)}/day now, so it's becoming an experience question.`,
      ),
    }
  }

  return {
    tone: 'green',
    label: copy(lang, '继续使用', 'Keep using'),
    headline: copy(
      lang,
      `已经把 ${recoveredValuePct}% 的价值用了回来，但成本曲线仍在下行——再撑 30 天每天还能省约 ${formatDailyCost(thirtyDayDrop)} 元。`,
      `You have recovered ${recoveredValuePct}% of this device's value, and the curve is still falling — holding 30 more days saves about ${formatDailyCost(thirtyDayDrop)}/day.`,
    ),
  }
}

function currentValueHelper(
  item: ItemWithStats,
  dynamicSalvage: DynamicAnalysis | null,
  lang: LangCode,
) {
  if (dynamicSalvage) {
    const pct = item.purchase_price > 0
      ? Math.round((dynamicSalvage.dynamicResidual / item.purchase_price) * 100)
      : 0
    return copy(lang, `动态残值模型 · 约为购入价 ${pct}%`, `Dynamic model · ~${pct}% of purchase price`)
  }
  if (item.residual_value != null) return copy(lang, '来自手动填写的估值', 'From manual residual')
  if (item.status === 'sold') return copy(lang, '来自实际转手价格', 'Actual sale price')
  return copy(lang, '暂无估值，按 0 计算', 'No estimate; treated as 0')
}

function futureValueHelper(dynamicSalvage: DynamicAnalysis | null, lang: LangCode) {
  if (!dynamicSalvage) return copy(lang, '无动态模型，按当前估值推算', 'No dynamic model; held at current estimate')
  return copy(
    lang,
    `动态残值模型 · 年化折旧 ${(dynamicSalvage.annualRate * 100).toFixed(0)}%`,
    `Dynamic model · ${(dynamicSalvage.annualRate * 100).toFixed(0)}% annual depreciation`,
  )
}

function spentHelperText(expenseTotal: number, lang: LangCode) {
  if (expenseTotal > 0) {
    return copy(lang, '设备折价 + 后续维修支出', 'Value loss + follow-up expenses')
  }
  return copy(lang, '设备折价，暂无后续支出', 'Value loss; no follow-up expenses yet')
}

function replacementSummaryText(
  verdict: DetailVerdict,
  item: ItemWithStats,
  thirtyDayDrop: number,
  decisionFrame: DecisionFrame,
  lang: LangCode,
) {
  if (verdict.tone === 'red') return verdict.label

  if (decisionFrame === 'physical') {
    if (item.days_owned <= 90) {
      return copy(lang, '刚入手，成本快速下降中', 'Just purchased; cost falling fast')
    }
    if (verdict.tone === 'yellow') {
      return copy(lang, '超龄服役，看物理状态而非成本', 'Over lifespan — watch condition, not cost')
    }
    return copy(lang, '状态良好，没有明显故障', 'In good shape; no obvious fault')
  }

  if (decisionFrame === 'record') {
    return copy(lang, '仅记录花费，不提供换机建议', 'Spend tracker; no replacement advice')
  }

  if (verdict.tone === 'yellow') {
    return copy(lang, '曲线趋平，继续等的收益有限', 'Curve flattening; diminishing returns')
  }
  return copy(
    lang,
    `成本还在下降，30 天约少 ${formatDailyCost(thirtyDayDrop)} 元`,
    `Still falling — about ${formatDailyCost(thirtyDayDrop)}/day lower in 30 days`,
  )
}

function verdictExplanationText(
  item: ItemWithStats,
  signals: UpgradeSignals | null,
  dynamicSalvage: DynamicAnalysis | null,
  thirtyDayDrop: number,
  recoveredValuePct: number,
  decisionFrame: DecisionFrame,
  lang: LangCode,
) {
  const isSlowing = dynamicSalvage?.isFlattening || thirtyDayDrop < 0.2

  if ((signals?.physicalFaults?.length ?? 0) > 0) {
    return copy(
      lang,
      '记录里已经出现了影响使用的故障信号，判断权重从成本转移到了可靠性。',
      'Usage-impacting fault signals are in the records, so reliability now outweighs cost savings.',
    )
  }

  if (signals?.latestRepair?.overResidual) {
    return copy(
      lang,
      `最近一次维修费 ${formatCNY(signals!.latestRepair!.amount, 0)} 已经超过当前估值 ${formatCNY(item.residual_value ?? 0, 0)}；维修风险大于继续摊薄成本的收益。`,
      `The latest repair (${formatCNY(signals!.latestRepair!.amount, 0)}) exceeded the current value (${formatCNY(item.residual_value ?? 0, 0)}); repair risk outweighs the cost-saving benefit.`,
    )
  }

  if (decisionFrame === 'physical') {
    if (item.days_owned <= 90) {
      return copy(
        lang,
        `外设主要看物理状态；这件物品才用了 ${item.days_owned} 天，日均成本还在快速下降中，不需要做换机判断。`,
        `Peripherals are judged by physical condition; this item has only been used for ${item.days_owned} days, so daily cost is still falling fast — no replacement signal here.`,
      )
    }

    return copy(
      lang,
      '外设主要看体验和物理状态；没有双击、断连、漂移或失灵等问题时，日均成本高低不构成换机理由。',
      'Peripherals are judged by experience and physical condition; without issues like double-clicking, disconnects, drift, or failure, daily cost is not a replacement signal.',
    )
  }

  if (decisionFrame === 'record') {
    return copy(
      lang,
      '这类资产没有可靠的换机窗口模型；页面只记录花费、持有天数和后续支出，不做换机建议。',
      'No reliable upgrade window model for this asset type — the page just tracks spend, holding days, and later expenses.',
    )
  }

  if (isSlowing) {
    return copy(
      lang,
      `已经用回了约 ${recoveredValuePct}% 的价值；再持有 30 天每天只能多省约 ${formatDailyCost(thirtyDayDrop)} 元，边际收益不大了——换不换主要看体验值不值。`,
      `You have recovered about ${recoveredValuePct}% of the value; holding 30 more days saves about ${formatDailyCost(thirtyDayDrop)}/day — marginal upside is small, so it's mostly an experience question now.`,
    )
  }

  return copy(
    lang,
    `再持有 30 天，日均成本大约还能下降 ${formatDailyCost(thirtyDayDrop)} 元——继续持有仍有明显的经济收益，不急着做换机决定。`,
    `Holding 30 more days still lowers daily cost by about ${formatDailyCost(thirtyDayDrop)}/day — meaningful economic upside remains, so there is no urgency to replace.`,
  )
}

function purchaseInfoSummary(item: ItemWithStats, expenseTotal: number, lang: LangCode) {
  const channel = item.purchase_channel || copy(lang, '未记录渠道', 'No channel')
  const expenseText = expenseTotal > 0
    ? copy(lang, `后续支出 ${formatCNY(expenseTotal, 0)}`, `${formatCNY(expenseTotal, 0)} later expenses`)
    : copy(lang, '无后续支出', 'No later expenses')
  return `${channel} · ${formatDate(item.purchase_date)} · ${expenseText}`
}

function StatusPill({ verdict }: { verdict: DetailVerdict }) {
  const Icon = verdict.tone === 'green' ? CheckCircle2 : verdict.tone === 'neutral' ? Package : AlertTriangle
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-2xs font-semibold',
      verdict.tone === 'green' && 'border-success-border text-success',
      verdict.tone === 'yellow' && 'border-warn-border text-warn',
      verdict.tone === 'red' && 'border-danger-border text-danger',
      verdict.tone === 'neutral' && 'border-app-border text-muted',
    )}>
      <Icon className="h-3 w-3" />
      {verdict.label}
    </span>
  )
}

function StatusHelp({
  open,
  explanation,
  onToggle,
  lang,
}: {
  open: boolean
  explanation: string
  onToggle: () => void
  lang: LangCode
}) {
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={copy(lang, '查看判断依据', 'Show decision reason')}
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full border border-app-border text-muted transition-colors',
          'hover:border-border-strong hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        )}
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span className="absolute left-0 top-7 z-20 w-64 rounded-lg border border-app-border bg-surface px-3 py-2 text-xs leading-relaxed text-secondary shadow-xl shadow-overlay/10">
          {explanation}
        </span>
      )}
    </span>
  )
}

function KeyMetric({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-lg border border-app-border bg-surface-2 px-4 py-3">
      <p className="text-2xs uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold leading-none text-primary">{value}</p>
      <p className="mt-1 text-2xs leading-snug text-muted">{helper}</p>
    </div>
  )
}

function ReplacementSignalPanel({
  item,
  signals,
  dynamicSalvage,
  thirtyDayDrop,
  recoveredValuePct,
  decisionFrame,
  currentValue,
  onEditKeywords,
  lang,
}: {
  item: ItemWithStats
  signals: UpgradeSignals | null
  dynamicSalvage: DynamicAnalysis | null
  thirtyDayDrop: number
  recoveredValuePct: number
  decisionFrame: DecisionFrame
  currentValue: number
  onEditKeywords?: () => void
  lang: LangCode
}) {
  const cost = costSignalCopy(item, dynamicSalvage, thirtyDayDrop, recoveredValuePct, decisionFrame, lang)
  const experience = experienceSignalCopy(item, signals, currentValue, lang)

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <InsightBlock
          label={copy(lang, '成本走势', 'Cost trend')}
          conclusion={cost.conclusion}
          explanation={cost.explanation}
          tone={cost.tone}
        />
        <InsightBlock
          label={copy(lang, '使用体验', 'Use experience')}
          conclusion={experience.conclusion}
          explanation={experience.explanation}
          tone={experience.tone}
        />
      </div>

      {onEditKeywords && (
        <div className="flex flex-col gap-2 rounded-lg border border-app-border bg-surface/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-muted">
            {copy(
              lang,
              '设备分类影响参考区间和故障提示；识别不准可以调整关键词。',
              'Device classification affects reference bands and fault hints. Adjust keywords if it looks wrong.',
            )}
          </p>
          <Button variant="ghost" size="sm" onClick={onEditKeywords}>
            <Settings2 className="h-3.5 w-3.5" />
            {copy(lang, '调整分类', 'Tune')}
          </Button>
        </div>
      )}
    </div>
  )
}

function costSignalCopy(
  item: ItemWithStats,
  dynamicSalvage: DynamicAnalysis | null,
  thirtyDayDrop: number,
  recoveredValuePct: number,
  decisionFrame: DecisionFrame,
  lang: LangCode,
) {
  if (decisionFrame === 'physical') {
    if (item.days_owned <= 90) {
      return {
        tone: 'green' as DetailTone,
        conclusion: copy(lang, '成本快速下降中', 'Falling fast'),
        explanation: copy(
          lang,
          '越用越便宜的阶段——每天都在摊薄购入成本，不是换机信号。',
          'Still in the steep part of the curve, getting cheaper every day. Not a replacement signal.',
        ),
      }
    }

    return {
      tone: 'neutral' as DetailTone,
      conclusion: copy(lang, '成本仅供参考', 'Cost for reference only'),
      explanation: copy(
        lang,
        '外设用不用继续用，主要看体验和物理状态，不靠成本曲线来判断。',
        'For peripherals, replacement depends on condition and experience, not the cost curve.',
      ),
    }
  }

  if (decisionFrame === 'record') {
    return {
      tone: 'neutral' as DetailTone,
      conclusion: copy(lang, '记录花费即可', 'Track spend only'),
      explanation: copy(
        lang,
        '这类资产没有可靠的换机窗口模型，日均成本只做参考记录。',
        'No upgrade-window model applies to this asset type.',
      ),
    }
  }

  if (dynamicSalvage?.isFlattening || thirtyDayDrop < 0.2) {
    return {
      tone: 'yellow' as DetailTone,
      conclusion: copy(lang, '曲线趋平，摊薄空间有限', 'Curve flattening'),
      explanation: copy(
        lang,
        `已经用回约 ${recoveredValuePct}% 的价值；再撑 30 天每天只能多省约 ${formatDailyCost(thirtyDayDrop)} 元，继续等的经济收益不大了。`,
        `You have recovered about ${recoveredValuePct}% of the value; holding 30 more days only saves about ${formatDailyCost(thirtyDayDrop)}/day — the economic upside is small now.`,
      ),
    }
  }

  return {
    tone: 'green' as DetailTone,
    conclusion: copy(lang, '成本仍在快速摊薄', 'Still getting cheaper'),
    explanation: copy(
      lang,
      `已经用回约 ${recoveredValuePct}% 的价值，再撑 30 天每天还能省约 ${formatDailyCost(thirtyDayDrop)} 元——继续持有仍有明显经济收益。`,
      `You have recovered about ${recoveredValuePct}% of the value; holding 30 more days still saves about ${formatDailyCost(thirtyDayDrop)}/day — meaningful upside remaining.`,
    ),
  }
}

function experienceSignalCopy(
  item: ItemWithStats,
  signals: UpgradeSignals | null,
  currentValue: number,
  lang: LangCode,
) {
  const faults = signals?.physicalFaults ?? []
  if (faults.length > 0) {
    return {
      tone: 'red' as DetailTone,
      conclusion: copy(lang, '出现了影响使用的故障', 'Usage fault detected'),
      explanation: copy(
        lang,
        `记录里出现了 ${faults.slice(0, 2).map(fault => fault.keyword).join('、')}。影响主力使用的话，没必要再为了摊薄成本而将就。`,
        `Records mention ${faults.slice(0, 2).map(fault => fault.keyword).join(', ')}. If it affects daily use, there is no reason to keep waiting for the cost to fall.`,
      ),
    }
  }

  if (signals?.latestRepair?.overResidual) {
    return {
      tone: 'red' as DetailTone,
      conclusion: copy(lang, '维修费超过了当前估值', 'Repair exceeds current value'),
      explanation: copy(
        lang,
        `最近一次计入成本的维修是 ${formatCNY(signals.latestRepair.amount, 0)}，已经超过当前估值 ${formatCNY(currentValue, 0)}。修不如换，从经济角度已经很清晰。`,
        `The latest cost-bearing repair was ${formatCNY(signals.latestRepair.amount, 0)}, above the current value of ${formatCNY(currentValue, 0)}. The economics are clear.`,
      ),
    }
  }

  if (item.is_overdue || signals?.isOverService) {
    return {
      tone: 'yellow' as DetailTone,
      conclusion: copy(lang, '超龄服役，留意状态', 'Over lifespan — watch condition'),
      explanation: copy(
        lang,
        '超出了当初设定的使用年限，已经是赚到的时间了。体验还稳定就继续用；一旦影响主力使用，就该谢幕了。',
        'It has outlived the planned lifespan — every day is a bonus now. Keep it while experience is stable; replace when it starts getting in the way.',
      ),
    }
  }

  if (signals?.latestRepair) {
    return {
      tone: 'yellow' as DetailTone,
      conclusion: copy(lang, '出现过维修记录', 'Had a repair'),
      explanation: copy(
        lang,
        `最近一次计入成本的维修是 ${formatCNY(signals.latestRepair.amount, 0)}。如果同类问题反复出现，维修风险比日均成本更值得优先考虑。`,
        `The latest cost-bearing repair was ${formatCNY(signals.latestRepair.amount, 0)}. If the same issue recurs, repair risk should take priority over cost savings.`,
      ),
    }
  }

  return {
    tone: 'green' as DetailTone,
    conclusion: copy(lang, '状态良好', 'In good shape'),
    explanation: copy(
      lang,
      '没有记在账上的维修负担。续航、性能和可靠性还在接受范围内，继续持有是最省的方案。',
      'No cost-bearing repair pressure. If battery, speed, and reliability are still acceptable, holding on is the lowest-cost path.',
    ),
  }
}

function InsightBlock({
  label,
  conclusion,
  explanation,
  tone,
}: {
  label: string
  conclusion: string
  explanation: string
  tone: DetailTone
}) {
  return (
    <div className={cn(
      'rounded-lg border bg-surface/50 px-4 py-3',
      tone === 'green' && 'border-success-border',
      tone === 'yellow' && 'border-warn-border',
      tone === 'red' && 'border-danger-border',
      tone === 'neutral' && 'border-app-border',
    )}>
      <p className={cn(
        'text-2xs uppercase tracking-widest',
        tone === 'green' && 'text-success',
        tone === 'yellow' && 'text-warn',
        tone === 'red' && 'text-danger',
        tone === 'neutral' && 'text-muted',
      )}>
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-snug text-primary">{conclusion}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{explanation}</p>
    </div>
  )
}

function PurchaseInfoPanel({
  item,
  expenses,
  expenseTotal,
  expenseSummary,
  expenseTypeLabels,
  onDeleteExpense,
  deletingExpense,
  lang,
  t,
}: {
  item: ItemWithStats
  expenses: ItemExpense[]
  expenseTotal: number
  expenseSummary: string
  expenseTypeLabels: Record<ExpenseType, string>
  onDeleteExpense: (expenseId: string) => void
  deletingExpense: boolean
  lang: LangCode
  t: Translate
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <InsightBlock
          label={copy(lang, '购入信息', 'Purchase info')}
          conclusion={`${item.purchase_channel || copy(lang, '未录入渠道', 'Channel not set')} · ${formatDate(item.purchase_date)}`}
          explanation={purchaseDetailText(item, lang)}
          tone="neutral"
        />
        <InsightBlock
          label={copy(lang, '后续支出', 'Follow-up expenses')}
          conclusion={expenses.length > 0
            ? `${expenses.length} ${copy(lang, '条', 'entries')} · ${formatCNY(expenseTotal, 0)}`
            : copy(lang, '暂无后续支出', 'None recorded')}
          explanation={expenseSummary}
          tone={expenseTotal > 0 ? 'yellow' : 'neutral'}
        />
      </div>

      {item.notes && (
        <div className="flex items-start gap-2 rounded-lg border border-app-border bg-surface/40 px-3 py-2">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
          <p className="text-xs leading-relaxed text-muted">{item.notes}</p>
        </div>
      )}

      {item.purchase_currency !== 'CNY' &&
        item.purchase_original_amount != null &&
        item.fx_rate != null && (
          <div className="rounded-lg border border-app-border bg-surface/40 px-3 py-2">
            <p className="text-xs leading-relaxed text-muted">
              {formatCurrencyAmount(item.purchase_original_amount, item.purchase_currency)}
              {' · '}1 {item.purchase_currency} = {item.fx_rate.toFixed(4)} CNY
              {item.fx_rate_date ? ` · ${item.fx_rate_date}` : ''}
              {item.fx_bank_fee ? ` · 手续费 ${item.fx_bank_fee}%` : ''}
            </p>
          </div>
        )}

      {expenses.length > 0 && (
        <div className="space-y-2">
          {expenses.map(expense => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              expenseTypeLabel={expenseTypeLabels[expense.type]}
              onDelete={() => onDeleteExpense(expense.id)}
              deleting={deletingExpense}
            />
          ))}
        </div>
      )}

      {expenses.length === 0 && (
        <div className="rounded-lg border border-dashed border-app-border bg-surface/30 p-4 text-sm text-muted">
          {t('detail.noExpenses')}
        </div>
      )}
    </div>
  )
}

function purchaseDetailText(item: ItemWithStats, lang: LangCode) {
  const parts = [
    copy(lang, `购入价 ${formatCNY(item.purchase_price, 0)}`, `Purchased for ${formatCNY(item.purchase_price, 0)}`),
  ]
  if (item.expected_years) {
    parts.push(copy(lang, `原计划使用 ${item.expected_years} 年`, `Planned for ${item.expected_years} years`))
  }
  if (item.retired_at) parts.push(copy(lang, `退役于 ${formatDate(item.retired_at)}`, `Retired on ${formatDate(item.retired_at)}`))
  if (item.sold_price != null) parts.push(copy(lang, `转手价 ${formatCNY(item.sold_price, 0)}`, `Sold for ${formatCNY(item.sold_price, 0)}`))
  return parts.join(lang === 'zh' ? '。' : '. ')
}

function ExpenseRow({
  expense,
  expenseTypeLabel,
  onDelete,
  deleting,
}: {
  expense: ItemExpense
  expenseTypeLabel: string
  onDelete: () => void
  deleting: boolean
}) {
  const { t } = useLanguage()
  const Icon = expenseIcon(expense.type)

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-app-border bg-surface/50 px-3 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-app-border bg-surface-2">
          <Icon className="h-4 w-4 text-muted" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-secondary">{expenseTypeLabel}</span>
            {!expense.counts_in_cost && (
              <span className="rounded-full border border-app-border px-2 py-0.5 text-2xs text-muted">
                {t('detail.recordOnly')}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {formatDate(expense.expense_date)}
            {expense.description ? ` · ${expense.description}` : ''}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={cn(
          'font-mono text-sm font-semibold',
          expense.counts_in_cost ? 'text-primary' : 'text-muted',
        )}>
          {formatCNY(expense.amount, 0)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={deleting}
          aria-label={t('detail.expenseAriaDelete')}
          className="h-8 w-8"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function BenchmarkKeywordDialog({
  open, draft, onOpenChange, onChange, onReset, onSave, t,
}: {
  open: boolean
  draft: KeywordDraft
  onOpenChange: (open: boolean) => void
  onChange: (profile: CostBenchmarkProfile, value: string) => void
  onReset: () => void
  onSave: () => void
  t: Translate
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('benchmark.keywordTitle')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-muted">{t('benchmark.keywordHint')}</p>
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted uppercase tracking-widest">
              {t('benchmark.keywordGroupMain')}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {MAIN_DEVICE_PROFILES.map(profile => (
                <div key={profile} className="space-y-1.5">
                  <Label htmlFor={`benchmark-keywords-${profile}`}>
                    {profileLabel(profile, t)}
                  </Label>
                  <Textarea
                    id={`benchmark-keywords-${profile}`}
                    value={draft[profile]}
                    placeholder={t('benchmark.keywordPlaceholder')}
                    rows={5}
                    onChange={event => onChange(profile, event.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium text-warn/80 uppercase tracking-widest">
              {t('benchmark.keywordGroupPeripheral')}
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {PERIPHERAL_PROFILES.map(profile => (
                <div key={profile} className="space-y-1.5">
                  <Label htmlFor={`benchmark-keywords-${profile}`}>
                    {profileLabel(profile, t)}
                  </Label>
                  <Textarea
                    id={`benchmark-keywords-${profile}`}
                    value={draft[profile]}
                    placeholder={t('benchmark.keywordPlaceholder')}
                    rows={5}
                    onChange={event => onChange(profile, event.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-app-border bg-surface/50 p-3">
            <p className="text-xs text-muted">{t('benchmark.keywordHelp')}</p>
          </div>
        </DialogBody>
        <DialogFooter className="justify-between">
          <Button variant="ghost" size="sm" onClick={onReset}>
            {t('benchmark.keywordReset')}
          </Button>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="sm">{t('dialog.cancel')}</Button>
            </DialogClose>
            <Button variant="accent" size="sm" onClick={onSave}>
              {t('benchmark.keywordSave')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function profileLabel(profile: CostBenchmarkProfile, t: Translate) {
  if (profile === 'smartphone') return t('benchmark.profile.smartphone')
  if (profile === 'computer') return t('benchmark.profile.computer')
  if (profile === 'entertainment') return t('benchmark.profile.entertainment')
  if (profile === 'gamepad') return t('benchmark.profile.gamepad')
  if (profile === 'mouse') return t('benchmark.profile.mouse')
  if (profile === 'keyboard') return t('benchmark.profile.keyboard')
  return t('benchmark.profile.wearable')
}

function keywordsToDraft(keywords: CostBenchmarkKeywords): KeywordDraft {
  return COST_BENCHMARK_PROFILES.reduce((result, profile) => {
    result[profile] = keywords[profile].join(', ')
    return result
  }, {} as KeywordDraft)
}

function parseKeywordDraft(value: string) {
  return value
    .split(/[\n,，、]+/)
    .map(keyword => keyword.trim())
    .filter(Boolean)
}

function expenseIcon(type: ExpenseType) {
  if (type === 'battery') return Battery
  if (type === 'warranty') return ShieldCheck
  if (type === 'accessory') return Package
  return Wrench
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 w-16 bg-surface-3 rounded" />
      <div className="space-y-2">
        <div className="h-7 w-2/3 bg-surface-3 rounded" />
        <div className="h-4 w-1/4 bg-surface-3 rounded" />
      </div>
      <div className="space-y-1.5">
        <div className="h-20 bg-surface-2 rounded-xl border border-app-border" />
        <div className="grid grid-cols-4 gap-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-surface-2 rounded-lg border border-app-border" />
          ))}
        </div>
      </div>
      <div className="h-64 bg-surface-2 rounded-xl border border-app-border" />
    </div>
  )
}
