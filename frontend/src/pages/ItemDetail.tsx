import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit3, Trash2, Archive, DollarSign,
  AlertTriangle, Calendar, ShoppingBag, FileText,
  PlusCircle, Wrench, Battery, ShieldCheck, Package,
} from 'lucide-react'
import {
  ExpenseType,
  ItemCategory,
  ItemExpense,
  ItemStatus,
} from '@/types'
import { useItem, useItemMutations } from '@/hooks/useItems'
import { generateCostTrend, formatCNY, formatDailyCost } from '@/lib/calculations'
import { formatDate } from '@/lib/utils'
import { CostTrendChart } from '@/components/items/CostTrendChart'
import { ComparisonCalculator } from '@/components/items/ComparisonCalculator'
import { CategoryBadge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogBody, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/i18n'

const EXPENSE_TYPES: ExpenseType[] = [
  'repair', 'battery', 'maintenance', 'accessory', 'warranty', 'other',
]

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
        <div className="col-span-2 lg:col-span-1 rounded-xl border border-accent-muted bg-accent-bg p-4">
          <p className="text-2xs text-accent/60 uppercase tracking-widest mb-2">{t('detail.totalDaily')}</p>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-4xl font-bold text-accent leading-none">
              {formatDailyCost(item.daily_cost)}
            </span>
            <span className="text-accent/60 text-sm">{t('detail.perDay')}</span>
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

      {/* Cost trend chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif text-sm text-zinc-100">{t('detail.costCurve')}</h2>
            <p className="text-2xs text-zinc-600 mt-0.5">{t('detail.costCurveHint')}</p>
          </div>
        </div>
        <CostTrendChart data={trendData} todayDay={item.days_owned} />
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
