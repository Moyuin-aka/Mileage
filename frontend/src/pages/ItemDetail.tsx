import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit3, Trash2, Archive, DollarSign,
  AlertTriangle, Calendar, ShoppingBag, FileText,
  PlusCircle, Wrench, Battery, ShieldCheck, Package,
  Settings2,
} from 'lucide-react'
import {
  ExpenseType,
  ItemCategory,
  ItemExpense,
  ItemStatus,
  ItemWithStats,
} from '@/types'
import { useItem, useItemMutations } from '@/hooks/useItems'
import { generateCostTrend, formatCNY, formatDailyCost } from '@/lib/calculations'
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
  type PhysicalFaultSignal,
  type UpgradeSignals,
} from '@/lib/costBenchmarks'
import { formatDate } from '@/lib/utils'
import { CostTrendChart } from '@/components/items/CostTrendChart'
import { ComparisonCalculator } from '@/components/items/ComparisonCalculator'
import { CategoryBadge, StatusBadge } from '@/components/ui/badge'
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
  const { t, categoryLabels, statusLabels, expenseTypeLabels } = useLanguage()
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
  const [keywordSettingsOpen, setKeywordSettingsOpen] = useState(false)
  const [benchmarkKeywords, setBenchmarkKeywords] = useState<CostBenchmarkKeywords>(() => loadCostBenchmarkKeywords())
  const [keywordDraft, setKeywordDraft] = useState<KeywordDraft>(() =>
    keywordsToDraft(loadCostBenchmarkKeywords()),
  )

  if (loading) return <LoadingSkeleton />
  if (error || !item) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-serif text-zinc-300 text-lg mb-2">{t('detail.notFound')}</p>
        <p className="text-zinc-600 text-sm mb-6">{error}</p>
        <Button variant="outline" onClick={() => navigate('/')}>{t('detail.backHome')}</Button>
      </div>
    )
  }

  const trendData = generateCostTrend(item, 365)
  const expenses = item.expenses ?? []
  const expenseTotal = item.expense_total ?? 0
  const upgradeSignals = buildUpgradeSignals(item, benchmarkKeywords)
  const canConfigureBenchmark = item.status === 'active' && item.category === 'electronics'
  const isPeripheralOverService = upgradeSignals?.isOverService === true

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
    <div className="space-y-6 animate-fade-in">
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
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
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Header */}
      <div>
        <div className="flex items-start gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl text-zinc-100 leading-tight">{item.name}</h1>
          </div>
          {item.is_overdue && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-950 border border-amber-900 text-amber-400 text-2xs font-medium shrink-0 mt-1">
              <AlertTriangle className="h-3 w-3" />
              {t('detail.overdue')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryBadge
            category={item.category as ItemCategory}
            label={categoryLabels[item.category as ItemCategory]}
          />
          <StatusBadge
            status={item.status as ItemStatus}
            label={statusLabels[item.status as ItemStatus]}
          />
        </div>
      </div>

      {/* Hero cost stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={cn(
          'col-span-2 lg:col-span-1 rounded-xl border p-4',
          isPeripheralOverService
            ? 'border-amber-500/30 bg-gradient-to-br from-amber-950/30 to-yellow-950/15'
            : 'border-accent-muted bg-accent-bg',
        )}>
          <p className={cn(
            'text-2xs uppercase tracking-widest mb-2',
            isPeripheralOverService ? 'text-amber-400/60' : 'text-accent/60',
          )}>{t('detail.totalDaily')}</p>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              'font-mono text-4xl font-bold leading-none',
              isPeripheralOverService ? 'text-amber-400' : 'text-accent',
            )}>
              {formatDailyCost(item.daily_cost)}
            </span>
            <span className={cn(
              'text-sm',
              isPeripheralOverService ? 'text-amber-400/60' : 'text-accent/60',
            )}>{t('detail.perDay')}</span>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-2xs text-zinc-600 uppercase tracking-widest mb-2">{t('detail.baseDaily')}</p>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-xl font-semibold text-zinc-100">
              {formatDailyCost(item.base_daily_cost)}
            </span>
            <span className="text-zinc-600 text-xs">{t('detail.perDay')}</span>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-2xs text-zinc-600 uppercase tracking-widest mb-2">{t('detail.expenses')}</p>
          <p className="font-mono text-xl font-semibold text-zinc-100">{formatCNY(expenseTotal, 0)}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-2xs text-zinc-600 uppercase tracking-widest mb-2">{t('detail.daysOwned')}</p>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-xl font-semibold text-zinc-100">{item.days_owned}</span>
            <span className="text-zinc-500 text-sm">{t('detail.days')}</span>
          </div>
        </div>
      </div>

      {canConfigureBenchmark && (
        upgradeSignals ? (
          isPeripheralProfile(upgradeSignals.benchmark.profile) ? (
            <PeripheralPanel
              signals={upgradeSignals}
              item={item}
              profileLabel={profileLabel(upgradeSignals.benchmark.profile, t)}
              onEditKeywords={openKeywordSettings}
              t={t}
            />
          ) : (
            <BenchmarkPanel
              signals={upgradeSignals}
              residualValue={item.residual_value ?? 0}
              profileLabel={profileLabel(upgradeSignals.benchmark.profile, t)}
              onEditKeywords={openKeywordSettings}
              t={t}
            />
          )
        ) : (
          <BenchmarkUnmatchedPanel onEditKeywords={openKeywordSettings} t={t} />
        )
      )}

      {/* Cost trend chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif text-sm text-zinc-100">{t('detail.costCurve')}</h2>
            <p className="text-2xs text-zinc-600 mt-0.5">{t('detail.costCurveHint')}</p>
          </div>
        </div>
        <CostTrendChart
          data={trendData}
          todayDay={item.days_owned}
          referenceBand={
            upgradeSignals
              ? {
                  min: upgradeSignals.benchmark.minDaily,
                  max: upgradeSignals.benchmark.maxDaily,
                  label: profileLabel(upgradeSignals.benchmark.profile, t),
                }
              : undefined
          }
        />
        <div className="mt-4 rounded-lg bg-zinc-950 border border-zinc-800 p-3">
          <p className="text-xs text-zinc-500">
            {t('detail.costForecastPrefix')}{' '}
            <span className="text-zinc-300 font-medium">365</span>{' '}
            {t('detail.costForecastMid')}{' '}
            <span className="font-mono text-accent font-semibold">
              {formatDailyCost(
                (item.purchase_price + expenseTotal - (item.residual_value ?? 0)) / (item.days_owned + 365),
              )}
            </span>{' '}
            {t('detail.costForecastSuffix')}
          </p>
        </div>
      </div>

      {/* Full info */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
        <h2 className="font-serif text-sm text-zinc-100">{t('detail.info')}</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <InfoRow icon={DollarSign} label={t('detail.purchasePrice')} value={formatCNY(item.purchase_price)} />
          <InfoRow icon={DollarSign} label={t('detail.residualValue')} value={formatCNY(item.residual_value)} />
          <InfoRow icon={Wrench} label={t('detail.includedExpenses')} value={formatCNY(expenseTotal)} />
          <InfoRow icon={DollarSign} label={t('detail.totalCost')} value={formatCNY(item.total_cost)} />
          <InfoRow
            icon={Calendar}
            label={t('detail.purchaseDate')}
            value={formatDate(item.purchase_date)}
            colSpan
          />
          {item.expected_years && (
            <InfoRow
              icon={Calendar}
              label={t('detail.expectedYears')}
              value={`${item.expected_years} ${t('detail.yearUnit')}`}
            />
          )}
          {item.purchase_channel && (
            <InfoRow icon={ShoppingBag} label={t('detail.channel')} value={item.purchase_channel} />
          )}
          {item.retired_at && (
            <InfoRow icon={Calendar} label={t('detail.retiredAt')} value={formatDate(item.retired_at)} />
          )}
          {item.sold_price != null && (
            <InfoRow icon={DollarSign} label={t('detail.soldPrice')} value={formatCNY(item.sold_price)} />
          )}
        </div>
        {item.notes && (
          <div className="pt-3 border-t border-zinc-800">
            <div className="flex items-start gap-2">
              <FileText className="h-3.5 w-3.5 text-zinc-600 mt-0.5 shrink-0" />
              <p className="text-sm text-zinc-400 leading-relaxed">{item.notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Later expenses */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-sm text-zinc-100">{t('detail.laterExpenses')}</h2>
            <p className="text-2xs text-zinc-600 mt-0.5">{t('detail.laterExpensesHint')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setExpenseOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5" />
            {t('detail.addExpense')}
          </Button>
        </div>

        {expenses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-600">
            {t('detail.noExpenses')}
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map(expense => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                expenseTypeLabel={expenseTypeLabels[expense.type]}
                onDelete={() => handleDeleteExpense(expense.id)}
                deleting={mutations.saving}
              />
            ))}
          </div>
        )}

        {expenseTotal > 0 && (
          <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
            <p className="text-xs text-zinc-500">
              {t('detail.expenseImpactPrefix')}{' '}
              <span className="font-mono text-zinc-300">
                {formatDailyCost(item.daily_cost - item.base_daily_cost)}
              </span>{' '}
              {t('detail.expenseImpactSuffix')}
            </p>
          </div>
        )}
      </div>

      {/* Comparison calculator — only for active items */}
      {item.status === 'active' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <ComparisonCalculator item={item} />
        </div>
      )}

      {/* Retire dialog */}
      <Dialog open={retireOpen} onOpenChange={setRetireOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('retire.title')}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-zinc-400">
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetire}
              disabled={mutations.saving}
            >
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
            <p className="text-sm text-zinc-400">
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
              <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3">
                <p className="text-xs text-zinc-500">
                  {t('detail.sellNetLoss')}{' '}
                  <span className="text-zinc-300 font-mono font-medium">
                    {formatCNY(item.purchase_price + expenseTotal - parseFloat(soldPrice))}
                  </span>
                  {' · '}
                  {t('detail.sellHeld')} {item.days_owned} {t('detail.sellActualDaily')}{' '}
                  <span className="font-mono text-accent font-semibold">
                    {formatDailyCost(
                      Math.max(0, item.purchase_price + expenseTotal - parseFloat(soldPrice)) / item.days_owned,
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

            <label className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
              <input
                type="checkbox"
                checked={countsInCost}
                onChange={e => setCountsInCost(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-accent"
              />
              <span>
                <span className="block text-sm text-zinc-300">{t('expenseDialog.countInCost')}</span>
                <span className="block text-xs text-zinc-600 mt-0.5">
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
            <p className="text-sm text-zinc-400">
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

type Translate = ReturnType<typeof useLanguage>['t']

function BenchmarkPanel({
  signals,
  residualValue,
  profileLabel,
  onEditKeywords,
  t,
}: {
  signals: UpgradeSignals
  residualValue: number
  profileLabel: string
  onEditKeywords: () => void
  t: Translate
}) {
  const { benchmark, latestRepair } = signals
  const isFlat = signals.drop30 < 0.2

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
        <div>
          <h2 className="font-serif text-sm text-zinc-100">
            {t('benchmark.title')} / {t('signals.title')}
          </h2>
          <p className="mt-0.5 text-2xs text-zinc-600">{t('benchmark.subtitle')}</p>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <span className="max-w-full rounded-full border border-zinc-700 px-2 py-1 text-2xs text-zinc-400">
            {t('benchmark.range', {
              profile: profileLabel,
              min: formatDailyCost(benchmark.minDaily),
              max: formatDailyCost(benchmark.maxDaily),
            })}
          </span>
          <Button variant="ghost" size="sm" onClick={onEditKeywords}>
            <Settings2 className="h-3.5 w-3.5" />
            {t('benchmark.configure')}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SignalTile
          title={benchmarkPositionText(signals.position, t)}
          value={
            signals.daysToMax && signals.daysToMax > 0
              ? t('benchmark.toMax', {
                  days: signals.daysToMax,
                  target: formatDailyCost(benchmark.maxDaily),
                })
              : t('benchmark.already')
          }
          tone={signals.position === 'above' ? 'warn' : 'good'}
        />
        <SignalTile
          title={t('signals.margin')}
          value={t('signals.marginText', { amount: formatDailyCost(signals.drop30) })}
          detail={isFlat ? t('signals.marginFlat') : t('signals.marginUseful')}
          tone={isFlat ? 'muted' : 'good'}
        />
        <SignalTile
          title={t('signals.repair')}
          value={
            latestRepair
              ? latestRepair.overResidual
                ? t('signals.repairOver', {
                    amount: formatCNY(latestRepair.amount, 0),
                    residual: formatCNY(residualValue, 0),
                  })
                : t('signals.repairOk', {
                    amount: formatCNY(latestRepair.amount, 0),
                    residual: formatCNY(residualValue, 0),
                  })
              : t('signals.repairNone')
          }
          tone={latestRepair?.overResidual ? 'warn' : 'muted'}
        />
        <SignalTile
          title={t('signals.hiddenCost')}
          value={t('signals.hiddenCostText')}
          detail={t('signals.resaleText')}
          tone="muted"
        />
      </div>
    </div>
  )
}

function BenchmarkUnmatchedPanel({
  onEditKeywords,
  t,
}: {
  onEditKeywords: () => void
  t: Translate
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div>
          <h2 className="font-serif text-sm text-zinc-100">{t('benchmark.unmatchedTitle')}</h2>
          <p className="mt-0.5 text-2xs text-zinc-600">{t('benchmark.unmatchedText')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onEditKeywords}>
          <Settings2 className="h-3.5 w-3.5" />
          {t('benchmark.configure')}
        </Button>
      </div>
    </div>
  )
}

function PeripheralPanel({
  signals,
  item,
  profileLabel: label,
  onEditKeywords,
  t,
}: {
  signals: UpgradeSignals
  item: ItemWithStats
  profileLabel: string
  onEditKeywords: () => void
  t: Translate
}) {
  const { benchmark, isOverService, overServiceDays, physicalFaults = [] } = signals
  const expectedDays = item.expected_years ? item.expected_years * 365 : null
  const progress = expectedDays ? Math.min(1, item.days_owned / expectedDays) : null
  const peripheralProfile = benchmark.profile as 'gamepad' | 'mouse' | 'keyboard'

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
        <div>
          <h2 className="font-serif text-sm text-zinc-100">
            {t('peripheral.title')}
          </h2>
          <p className="mt-0.5 text-2xs text-zinc-600">{t('peripheral.subtitle')}</p>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <span className="max-w-full rounded-full border border-zinc-700 px-2 py-1 text-2xs text-zinc-400">
            {t('benchmark.range', {
              profile: label,
              min: formatDailyCost(benchmark.minDaily),
              max: formatDailyCost(benchmark.maxDaily),
            })}
          </span>
          <Button variant="ghost" size="sm" onClick={onEditKeywords}>
            <Settings2 className="h-3.5 w-3.5" />
            {t('benchmark.configure')}
          </Button>
        </div>
      </div>

      {/* Lifespan hourglass */}
      <div className={cn(
        'rounded-lg border p-4',
        isOverService
          ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/30 to-amber-900/10'
          : expectedDays
          ? 'border-zinc-800 bg-zinc-950/40'
          : 'border-zinc-800 border-dashed bg-zinc-950/20',
      )}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className={cn(
            'text-2xs font-medium uppercase tracking-widest',
            isOverService ? 'text-amber-400' : 'text-zinc-600',
          )}>
            {t('peripheral.lifespanProgress')}
          </p>
          {isOverService && overServiceDays != null && (
            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-2xs font-semibold text-amber-400 animate-pulse">
              {t('peripheral.bonusDays', { days: overServiceDays })}
            </span>
          )}
        </div>

        {expectedDays != null && progress != null ? (
          <>
            {/* Progress bar */}
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden mb-2">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700',
                  isOverService
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    : 'bg-accent/60',
                )}
                style={{ width: `${Math.min(100, progress * 100).toFixed(1)}%` }}
              />
            </div>
            <p className={cn(
              'text-sm',
              isOverService ? 'text-amber-300 font-medium' : 'text-zinc-400',
            )}>
              {isOverService
                ? t('peripheral.overServiceDetail', { days: overServiceDays ?? 0 })
                : t('peripheral.normalServiceDetail', {
                    days: Math.max(0, Math.round(expectedDays - item.days_owned)),
                  })}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-zinc-500">{t('peripheral.noExpectedLife')}</p>
            <p className="text-2xs text-zinc-700 mt-1">{t('peripheral.noExpectedLifeHint')}</p>
          </>
        )}
      </div>

      {/* Over-service / normal service signal tiles */}
      <div className="grid gap-3 sm:grid-cols-2">
        <SignalTile
          title={benchmarkPositionText(signals.position, t)}
          value={
            signals.daysToMax && signals.daysToMax > 0
              ? t('benchmark.toMax', {
                  days: signals.daysToMax,
                  target: formatDailyCost(benchmark.maxDaily),
                })
              : t('benchmark.already')
          }
          tone={signals.position === 'above' ? 'warn' : isOverService ? 'gold' : 'good'}
        />
        <SignalTile
          title={
            isOverService
              ? t('peripheral.overService')
              : expectedDays
              ? t('peripheral.normalService')
              : t('peripheral.noExpectedLife')
          }
          value={
            isOverService && overServiceDays != null
              ? t('peripheral.overServiceDetail', { days: overServiceDays })
              : expectedDays
              ? t('peripheral.normalServiceDetail', {
                  days: Math.max(0, Math.round(expectedDays - item.days_owned)),
                })
              : t('peripheral.noExpectedLifeHint')
          }
          tone={isOverService ? 'gold' : 'muted'}
        />
      </div>

      {/* Physical fault red lines */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
        <div>
          <p className="text-2xs font-medium uppercase tracking-widest text-red-400/80">
            {t('peripheral.faultTitle')}
          </p>
          <p className="text-2xs text-zinc-600 mt-0.5">
            {t('peripheral.faultSubtitle')}
          </p>
        </div>

        {/* Default replacement hint */}
        <div className="rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2">
          <p className="text-xs text-zinc-500 leading-relaxed">
            {t(`peripheral.replaceHint.${peripheralProfile}` as const)}
          </p>
        </div>

        {physicalFaults.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-red-400 font-medium">
              ⚠ {t('peripheral.faultDetected')}
            </p>
            {physicalFaults.map((fault, idx) => (
              <FaultSignalRow key={`${fault.keyword}-${idx}`} fault={fault} t={t} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">
            ✓ {t('peripheral.faultNone')}
          </p>
        )}
      </div>
    </div>
  )
}

function FaultSignalRow({
  fault,
  t,
}: {
  fault: PhysicalFaultSignal
  t: Translate
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-red-900/40 bg-red-950/15 px-3 py-2">
      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
      <div className="min-w-0">
        <span className="text-xs text-red-300 font-medium">{fault.keyword}</span>
        <span className="text-2xs text-zinc-600 ml-2">
          {fault.source === 'expense'
            ? t('peripheral.faultSource.expense')
            : t('peripheral.faultSource.notes')}
        </span>
        {fault.detail && (
          <p className="text-2xs text-zinc-500 mt-0.5 truncate">{fault.detail}</p>
        )}
      </div>
    </div>
  )
}

function BenchmarkKeywordDialog({
  open,
  draft,
  onOpenChange,
  onChange,
  onReset,
  onSave,
  t,
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
          <p className="text-sm text-zinc-500">{t('benchmark.keywordHint')}</p>

          {/* Main device profiles */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
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

          {/* Peripheral profiles */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-amber-500/80 uppercase tracking-widest">
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

          <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
            <p className="text-xs text-zinc-600">{t('benchmark.keywordHelp')}</p>
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

function SignalTile({
  title,
  value,
  detail,
  tone,
}: {
  title: string
  value: string
  detail?: string
  tone: 'good' | 'warn' | 'muted' | 'gold'
}) {
  return (
    <div className={cn(
      'rounded-lg border px-3 py-3',
      tone === 'good' && 'border-emerald-900 bg-emerald-950/20',
      tone === 'warn' && 'border-amber-900 bg-amber-950/20',
      tone === 'muted' && 'border-zinc-800 bg-zinc-950/40',
      tone === 'gold' && 'border-amber-500/30 bg-gradient-to-br from-amber-950/25 to-yellow-950/15',
    )}>
      <p className={cn(
        'text-2xs font-medium uppercase tracking-widest',
        tone === 'good' && 'text-emerald-500',
        tone === 'warn' && 'text-amber-500',
        tone === 'muted' && 'text-zinc-600',
        tone === 'gold' && 'text-amber-400',
      )}>
        {title}
      </p>
      <p className={cn(
        'mt-1 text-sm',
        tone === 'gold' ? 'text-amber-200' : 'text-zinc-200',
      )}>{value}</p>
      {detail && <p className="mt-1 text-2xs text-zinc-600">{detail}</p>}
    </div>
  )
}

function benchmarkPositionText(position: UpgradeSignals['position'], t: Translate) {
  if (position === 'above') return t('benchmark.above')
  if (position === 'below') return t('benchmark.below')
  return t('benchmark.within')
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

function InfoRow({
  icon: Icon,
  label,
  value,
  colSpan,
}: {
  icon: React.ElementType
  label: string
  value: string
  colSpan?: boolean
}) {
  return (
    <div className={cn(colSpan && 'col-span-2')}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="h-3 w-3 text-zinc-600" />
        <span className="text-2xs text-zinc-600 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-sm text-zinc-300">{value}</p>
    </div>
  )
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
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-zinc-500" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-zinc-200">{expenseTypeLabel}</span>
            {!expense.counts_in_cost && (
              <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-2xs text-zinc-600">
                {t('detail.recordOnly')}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-zinc-600">
            {formatDate(expense.expense_date)}
            {expense.description ? ` · ${expense.description}` : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={cn(
          'font-mono text-sm font-semibold',
          expense.counts_in_cost ? 'text-zinc-100' : 'text-zinc-600',
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

function expenseIcon(type: ExpenseType) {
  if (type === 'battery') return Battery
  if (type === 'warranty') return ShieldCheck
  if (type === 'accessory') return Package
  return Wrench
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-16 bg-zinc-800 rounded" />
      <div className="space-y-2">
        <div className="h-7 w-2/3 bg-zinc-800 rounded" />
        <div className="h-4 w-1/4 bg-zinc-800 rounded" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3 sm:col-span-1 h-24 bg-zinc-900 rounded-xl border border-zinc-800" />
        <div className="h-24 bg-zinc-900 rounded-xl border border-zinc-800" />
        <div className="h-24 bg-zinc-900 rounded-xl border border-zinc-800" />
      </div>
      <div className="h-64 bg-zinc-900 rounded-xl border border-zinc-800" />
    </div>
  )
}
