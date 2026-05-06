import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRightLeft, Camera, Check, Loader2, Wand2 } from 'lucide-react'
import {
  FxConversionResult,
  ItemCategory,
  ItemStatus,
  ItemFormData,
  MoneyCurrency,
  OcrCandidate,
  OcrParseResult,
  SalvageProfile,
} from '@/types'
import { useItem, useItemMutations } from '@/hooks/useItems'
import { api } from '@/lib/api'
import { formatCurrencyAmount, moneyPrefix, MONEY_CURRENCIES } from '@/lib/currency'
import { SALVAGE_PROFILE_RATES } from '@/lib/dynamicSalvage'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toDateInputValue } from '@/lib/utils'
import { useLanguage } from '@/i18n'

const CATEGORIES: ItemCategory[] = [
  'electronics', 'appliances', 'furniture', 'transportation', 'other',
]

const STATUSES: ItemStatus[] = ['active', 'retired', 'sold']
const SALVAGE_PROFILES: SalvageProfile[] = ['valueKeeper', 'steady', 'fastDrop']

const DEFAULTS: ItemFormData = {
  name: '',
  category: 'electronics',
  purchase_price: 0,
  purchase_currency: 'CNY',
  fx_bank_fee: 0,
  purchase_date: new Date().toISOString().slice(0, 10),
  expected_years: undefined,
  residual_value: undefined,
  purchase_channel: '',
  status: 'active',
  retired_at: undefined,
  sold_price: undefined,
  notes: '',
  image_url: '',
}

const EMPTY_OCR_DRAFT: {
  name: string
  category: ItemCategory
  purchase_price: string
  purchase_currency: MoneyCurrency | ''
  purchase_date: string
  purchase_channel: string
} = {
  name: '',
  category: 'electronics' as ItemCategory,
  purchase_price: '',
  purchase_currency: '',
  purchase_date: '',
  purchase_channel: '',
}

export function ItemForm() {
  const navigate = useNavigate()
  const { t, categoryLabels, statusLabels } = useLanguage()
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)

  const { item, loading: itemLoading } = useItem(id)
  const mutations = useItemMutations(() => navigate(isEditing ? `/item/${id}` : '/'))

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<ItemFormData>(DEFAULTS)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')
  const [ocrResult, setOcrResult] = useState<OcrParseResult | null>(null)
  const [ocrDraft, setOcrDraft] = useState(EMPTY_OCR_DRAFT)
  const [ocrDialogOpen, setOcrDialogOpen] = useState(false)
  const [fxLoading, setFxLoading] = useState(false)
  const [fxError, setFxError] = useState('')
  const [fxResult, setFxResult] = useState<FxConversionResult | null>(null)

  useEffect(() => {
    if (isEditing && item) {
      setForm({
        name: item.name,
        category: item.category,
        purchase_price: item.purchase_price,
        purchase_currency: item.purchase_currency ?? 'CNY',
        purchase_original_amount: item.purchase_original_amount,
        fx_rate: item.fx_rate,
        fx_rate_date: toDateInputValue(item.fx_rate_date),
        fx_bank_fee: item.fx_bank_fee ?? 0,
        fx_source: item.fx_source,
        purchase_date: toDateInputValue(item.purchase_date),
        expected_years: item.expected_years,
        residual_value: item.residual_value ?? undefined,
        salvage_profile: item.salvage_profile,
        annual_depreciation_rate: item.annual_depreciation_rate,
        purchase_channel: item.purchase_channel ?? '',
        status: item.status,
        retired_at: toDateInputValue(item.retired_at),
        sold_price: item.sold_price,
        notes: item.notes ?? '',
        image_url: item.image_url ?? '',
      })
    }
  }, [isEditing, item])

  function set<K extends keyof ItemFormData>(key: K, value: ItemFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function setOcr<K extends keyof typeof EMPTY_OCR_DRAFT>(
    key: K,
    value: (typeof EMPTY_OCR_DRAFT)[K],
  ) {
    setOcrDraft(prev => ({ ...prev, [key]: value }))
  }

  async function handleOcrFile(file: File) {
    setOcrError('')
    setOcrLoading(true)

    try {
      const result = await api.parseOcr(file)
      setOcrResult(result)
      setOcrDraft({
        name: result.fields.name ?? form.name,
        category: result.fields.category ?? form.category,
        purchase_price:
          result.fields.purchase_price != null
            ? String(result.fields.purchase_price)
            : form.purchase_price
            ? String(form.purchase_price)
            : '',
        purchase_currency:
          result.fields.purchase_currency ?? result.candidates.purchase_price[0]?.currency ?? '',
        purchase_date: result.fields.purchase_date ?? form.purchase_date,
        purchase_channel: result.fields.purchase_channel ?? form.purchase_channel ?? '',
      })
      setOcrDialogOpen(true)
    } catch (error) {
      setOcrError(error instanceof Error ? error.message : t('form.ocrError'))
    } finally {
      setOcrLoading(false)
    }
  }

  function handleOcrApply() {
    const parsedPrice = Number.parseFloat(ocrDraft.purchase_price)
    const currency = ocrDraft.purchase_currency || 'CNY'
    setForm(prev => ({
      ...prev,
      name: ocrDraft.name.trim() || prev.name,
      category: ocrDraft.category,
      purchase_price:
        currency === 'CNY' && Number.isFinite(parsedPrice)
          ? parsedPrice
          : prev.purchase_price,
      purchase_currency: currency || 'CNY',
      purchase_original_amount:
        currency !== 'CNY' && Number.isFinite(parsedPrice)
          ? parsedPrice
          : currency === 'CNY'
          ? undefined
          : prev.purchase_original_amount,
      fx_rate: currency === 'CNY' ? undefined : prev.fx_rate,
      fx_rate_date: currency === 'CNY' ? undefined : prev.fx_rate_date,
      fx_source: currency === 'CNY' ? undefined : prev.fx_source,
      purchase_date: ocrDraft.purchase_date || prev.purchase_date,
      purchase_channel: ocrDraft.purchase_channel.trim() || prev.purchase_channel,
    }))
    setOcrDialogOpen(false)
  }

  async function handleFxConvert() {
    if (form.purchase_currency === 'CNY') return
    const originalAmount = Number(form.purchase_original_amount)
    if (!Number.isFinite(originalAmount) || originalAmount <= 0) {
      setFxError(t('form.fxNeedAmount'))
      return
    }

    setFxLoading(true)
    setFxError('')
    try {
      const result = await api.convertFx({
        amount: originalAmount,
        from_currency: form.purchase_currency,
        to_currency: 'CNY',
        date: form.purchase_date,
        bank_fee: Number(form.fx_bank_fee) || 0,
      })
      setFxResult(result)
      setForm(prev => ({
        ...prev,
        purchase_price: roundMoney(result.converted_amount),
        fx_rate: result.rate,
        fx_rate_date: result.date,
        fx_bank_fee: result.bank_fee,
        fx_source: result.source,
      }))
    } catch (error) {
      setFxResult(null)
      setFxError(error instanceof Error ? error.message : t('fx.error'))
    } finally {
      setFxLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return

    const payload: ItemFormData = {
      ...form,
      purchase_price: Number(form.purchase_price) || 0,
      purchase_currency: form.purchase_currency ?? 'CNY',
      purchase_original_amount:
        form.purchase_currency !== 'CNY' && form.purchase_original_amount != null
          ? Number(form.purchase_original_amount) || undefined
          : undefined,
      fx_rate: form.purchase_currency !== 'CNY' ? form.fx_rate : undefined,
      fx_rate_date: form.purchase_currency !== 'CNY' ? form.fx_rate_date : undefined,
      fx_bank_fee: form.purchase_currency !== 'CNY' ? Number(form.fx_bank_fee) || 0 : 0,
      fx_source: form.purchase_currency !== 'CNY' ? form.fx_source : undefined,
      residual_value:
        form.residual_value == null ? null : Number(form.residual_value) || 0,
      expected_years: form.expected_years ? Number(form.expected_years) : undefined,
      salvage_profile: form.category === 'electronics' ? form.salvage_profile ?? null : null,
      annual_depreciation_rate:
        form.category === 'electronics' ? form.annual_depreciation_rate ?? null : null,
      sold_price: form.sold_price ? Number(form.sold_price) : undefined,
    }

    if (isEditing && id) {
      await mutations.updateItem(id, payload)
    } else {
      await mutations.createItem(payload)
    }
  }

  if (isEditing && itemLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 w-24 bg-surface-3 rounded" />
        <div className="h-8 w-40 bg-surface-3 rounded" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-surface-2 rounded-lg border border-app-border" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg animate-fade-in">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-muted hover:text-secondary transition-colors text-sm mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('detail.back')}
        </button>
        <h1 className="font-serif text-2xl text-primary">
          {isEditing ? t('form.titleEdit') : t('form.titleNew')}
        </h1>
        <p className="text-sm text-muted mt-0.5">
          {isEditing ? t('form.subtitleEdit') : t('form.subtitleNew')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section: Basic Info */}
        <section className="space-y-4">
          <SectionTitle>{t('form.sectionBasic')}</SectionTitle>

          <Field label={t('form.name')} required>
            <Input
              placeholder={t('form.namePlaceholder')}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
            />
          </Field>

          <Field label={t('form.category')} required>
            <Select
              value={form.category}
              onValueChange={v => {
                const category = v as ItemCategory
                setForm(prev => ({
                  ...prev,
                  category,
                  salvage_profile: category === 'electronics' ? prev.salvage_profile : undefined,
                  annual_depreciation_rate:
                    category === 'electronics' ? prev.annual_depreciation_rate : undefined,
                }))
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabels[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('form.purchasePrice')} required>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                prefix="¥"
                value={form.purchase_price || ''}
                onChange={e => set('purchase_price', parseFloat(e.target.value) || 0)}
                required
              />
            </Field>
            <Field label={t('form.purchaseDate')} required>
              <Input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={form.purchase_date}
                onChange={e => set('purchase_date', e.target.value)}
                required
              />
            </Field>
          </div>

          <div className="rounded-xl border border-app-border bg-surface-2/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-secondary">{t('form.fxTitle')}</p>
                <p className="mt-0.5 text-2xs text-muted">{t('form.fxHint')}</p>
              </div>
              <div className="w-24 shrink-0">
                <CurrencySelect
                  value={form.purchase_currency ?? 'CNY'}
                  onChange={currency => {
                    setFxResult(null)
                    setFxError('')
                    setForm(prev => ({
                      ...prev,
                      purchase_currency: currency,
                      purchase_original_amount: currency === 'CNY' ? undefined : prev.purchase_original_amount,
                      fx_rate: currency === 'CNY' ? undefined : prev.fx_rate,
                      fx_rate_date: currency === 'CNY' ? undefined : prev.fx_rate_date,
                      fx_bank_fee: currency === 'CNY' ? 0 : prev.fx_bank_fee ?? 0,
                      fx_source: currency === 'CNY' ? undefined : prev.fx_source,
                    }))
                  }}
                />
              </div>
            </div>

            {form.purchase_currency !== 'CNY' && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="purchase-original-amount">{t('form.originalAmount')}</Label>
                    <Input
                      id="purchase-original-amount"
                      type="number"
                      min={0}
                      step={0.01}
                      prefix={moneyPrefix(form.purchase_currency)}
                      value={form.purchase_original_amount ?? ''}
                      onChange={event => {
                        setFxResult(null)
                        set('purchase_original_amount', event.target.value ? Number(event.target.value) : undefined)
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="purchase-fx-bank-fee">{t('fx.bankFee')}</Label>
                    <Input
                      id="purchase-fx-bank-fee"
                      type="number"
                      min={0}
                      step={0.01}
                      suffix="%"
                      value={form.fx_bank_fee ?? 0}
                      onChange={event => {
                        setFxResult(null)
                        set('fx_bank_fee', Number(event.target.value) || 0)
                      }}
                    />
                  </div>
                </div>

                {(fxResult || form.fx_rate) && (
                  <div className="rounded-lg border border-accent-muted bg-accent-bg px-3 py-2">
                    <p className="text-xs text-accent">
                      {formatCurrencyAmount(Number(form.purchase_price) || 0, 'CNY')}{' '}
                      <span className="text-accent/70">
                        · 1 {form.purchase_currency} = {(fxResult?.rate ?? form.fx_rate ?? 0).toFixed(6)} CNY
                      </span>
                    </p>
                  </div>
                )}

                {fxError && (
                  <p className="text-xs text-danger">{fxError}</p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFxConvert}
                  disabled={fxLoading || !form.purchase_original_amount}
                >
                  {fxLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                  )}
                  {fxLoading ? t('fx.converting') : t('form.fxConvert')}
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Section: Optional Info */}
        <section className="space-y-4">
          <SectionTitle>{t('form.sectionOptional')}</SectionTitle>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('form.expectedYears')}>
              <Input
                type="number"
                min={0.5}
                max={20}
                step={0.5}
                placeholder={t('form.expectedYearsPlaceholder')}
                suffix={t('form.yearSuffix')}
                value={form.expected_years ?? ''}
                onChange={e =>
                  set('expected_years', e.target.value ? parseFloat(e.target.value) : undefined)
                }
              />
            </Field>
            <Field label={t('form.residualValue')}>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder={t('form.auto')}
                prefix="¥"
                value={form.residual_value ?? ''}
                onChange={e =>
                  set(
                    'residual_value',
                    e.target.value === '' ? undefined : parseFloat(e.target.value) || 0,
                  )
                }
              />
            </Field>
          </div>

          {form.category === 'electronics' && (
            <div className="rounded-xl border border-app-border bg-surface-2/40 p-4">
              <div className="mb-3">
                <p className="text-sm font-medium text-secondary">{t('form.salvageTitle')}</p>
                <p className="mt-0.5 text-2xs text-muted">{t('form.salvageHint')}</p>
              </div>
              <div className="grid grid-cols-[1fr_7rem] gap-3">
                <div className="space-y-1.5">
                  <Label>{t('form.salvageProfile')}</Label>
                  <Select
                    value={form.salvage_profile ?? 'auto'}
                    onValueChange={value => {
                      if (value === 'auto') {
                        setForm(prev => ({
                          ...prev,
                          salvage_profile: undefined,
                          annual_depreciation_rate: undefined,
                        }))
                        return
                      }
                      const profile = value as SalvageProfile
                      setForm(prev => ({
                        ...prev,
                        salvage_profile: profile,
                        annual_depreciation_rate: SALVAGE_PROFILE_RATES[profile],
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{t('form.salvageAuto')}</SelectItem>
                      {SALVAGE_PROFILES.map(profile => (
                        <SelectItem key={profile} value={profile}>
                          {salvageProfileLabel(profile, t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="annual-depreciation-rate">{t('form.annualDepreciation')}</Label>
                  <Input
                    id="annual-depreciation-rate"
                    type="number"
                    min={0}
                    max={95}
                    step={1}
                    suffix="%"
                    value={
                      form.annual_depreciation_rate != null
                        ? Number((form.annual_depreciation_rate * 100).toFixed(2))
                        : ''
                    }
                    placeholder={form.salvage_profile ? '' : t('form.auto')}
                    onChange={event => {
                      const raw = event.target.value
                      set('annual_depreciation_rate', raw === '' ? undefined : Number(raw) / 100)
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <Field label={t('form.channel')}>
            <Input
              placeholder={t('form.channelPlaceholder')}
              value={form.purchase_channel ?? ''}
              onChange={e => set('purchase_channel', e.target.value)}
            />
          </Field>

          {isEditing && (
            <Field label={t('form.status')}>
              <Select
                value={form.status}
                onValueChange={v => set('status', v as ItemStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {form.status === 'retired' && (
            <Field label={t('form.retiredAt')}>
              <Input
                type="date"
                value={form.retired_at ?? ''}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => set('retired_at', e.target.value)}
              />
            </Field>
          )}

          {form.status === 'sold' && (
            <Field label={t('form.soldPrice')}>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                prefix="¥"
                value={form.sold_price ?? ''}
                onChange={e =>
                  set('sold_price', e.target.value ? parseFloat(e.target.value) : undefined)
                }
              />
            </Field>
          )}

          <Field label={t('form.notes')}>
            <Textarea
              rows={3}
              placeholder={t('form.notesPlaceholder')}
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
            />
          </Field>
        </section>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={event => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void handleOcrFile(file)
          }}
        />

        <div className="rounded-xl border border-app-border border-dashed p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent-muted bg-accent-bg">
                {ocrLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-accent" />
                ) : (
                  <Camera className="h-5 w-5 text-accent" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-secondary">{t('form.ocrTitle')}</p>
                <p className="mt-0.5 truncate text-2xs text-muted">{t('form.ocrHint')}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={ocrLoading}
            >
              <Wand2 className="h-4 w-4" />
              {t('form.ocrScan')}
            </Button>
          </div>
          {ocrError && (
            <p className="mt-3 text-xs text-danger" role="alert">
              {ocrError}
            </p>
          )}
        </div>

        <Dialog open={ocrDialogOpen} onOpenChange={setOcrDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('form.ocrDialogTitle')}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('form.name')}>
                  <Input
                    value={ocrDraft.name}
                    onChange={event => setOcr('name', event.target.value)}
                  />
                  <CandidateRow
                    candidates={ocrResult?.candidates.name}
                    onPick={candidate => setOcr('name', candidate.value)}
                  />
                </Field>

                <Field label={t('form.category')}>
                  <Select
                    value={ocrDraft.category}
                    onValueChange={value => setOcr('category', value as ItemCategory)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {categoryLabels[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label={t('form.purchasePrice')}>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    prefix={moneyPrefix(ocrDraft.purchase_currency)}
                    value={ocrDraft.purchase_price}
                    onChange={event => setOcr('purchase_price', event.target.value)}
                  />
                  <CandidateRow
                    candidates={ocrResult?.candidates.purchase_price}
                    format={formatMoneyCandidate}
                    onPick={candidate => {
                      setOcr('purchase_price', String(candidate.value))
                      setOcr('purchase_currency', candidate.currency ?? '')
                    }}
                  />
                </Field>

                <Field label={t('form.purchaseDate')}>
                  <Input
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={ocrDraft.purchase_date}
                    onChange={event => setOcr('purchase_date', event.target.value)}
                  />
                  <CandidateRow
                    candidates={ocrResult?.candidates.purchase_date}
                    onPick={candidate => setOcr('purchase_date', candidate.value)}
                  />
                </Field>

                <Field label={t('form.channel')}>
                  <Input
                    value={ocrDraft.purchase_channel}
                    onChange={event => setOcr('purchase_channel', event.target.value)}
                  />
                  <CandidateRow
                    candidates={ocrResult?.candidates.purchase_channel}
                    onPick={candidate => setOcr('purchase_channel', candidate.value)}
                  />
                </Field>
              </div>

              <div className="rounded-lg border border-app-border bg-surface-2/40">
                <div className="flex items-center justify-between border-b border-app-border px-3 py-2">
                  <span className="text-xs font-medium text-muted">{t('form.ocrRawText')}</span>
                  <span className="text-2xs text-muted">
                    {t('form.ocrLines', { n: ocrResult?.lines.length ?? 0 })}
                  </span>
                </div>
                <div className="max-h-44 overflow-y-auto px-3 py-2">
                  {ocrResult?.lines.slice(0, 40).map((line, index) => (
                    <div key={`${line.text}-${index}`} className="flex gap-3 py-1 text-xs">
                      <span className="w-10 shrink-0 text-right text-muted">
                        {line.score != null ? `${Math.round(line.score * 100)}%` : '--'}
                      </span>
                      <span className="text-muted">{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOcrDialogOpen(false)}>
                {t('form.ocrCancel')}
              </Button>
              <Button type="button" variant="accent" onClick={handleOcrApply}>
                <Check className="h-4 w-4" />
                {t('form.ocrApply')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {mutations.error && (
          <div className="rounded-lg bg-danger-bg border border-danger-border px-4 py-3 text-sm text-danger">
            {mutations.error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex-1"
          >
            {t('form.cancel')}
          </Button>
          <Button
            type="submit"
            variant="accent"
            className="flex-1"
            disabled={mutations.saving || !form.name.trim()}
          >
            {mutations.saving ? t('form.saving') : isEditing ? t('form.saveChanges') : t('form.addItem')}
          </Button>
        </div>
      </form>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif text-sm text-muted pb-2 border-b border-app-border">{children}</h2>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-accent ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

function CandidateRow<T extends string | number>({
  candidates,
  format,
  onPick,
}: {
  candidates?: OcrCandidate<T>[]
  format?: (candidate: OcrCandidate<T>) => string
  onPick: (candidate: OcrCandidate<T>) => void
}) {
  if (!candidates?.length) return null

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {candidates.slice(0, 3).map(candidate => (
        <button
          type="button"
          key={`${candidate.label ?? 'cand'}-${candidate.currency ?? ''}-${candidate.value}`}
          className="max-w-full truncate rounded-md border border-app-border bg-surface-2 px-2 py-1 text-2xs text-muted transition-colors hover:border-accent-muted hover:text-primary"
          title={candidate.source}
          onClick={() => onPick(candidate)}
        >
          {format ? format(candidate) : candidate.value}
        </button>
      ))}
    </div>
  )
}

function formatMoneyCandidate(candidate: OcrCandidate<number>) {
  const prefix = moneyPrefix(candidate.currency ?? '')
  return candidate.currency ? `${prefix}${candidate.value} ${candidate.currency}` : `${prefix}${candidate.value}`
}

function salvageProfileLabel(
  profile: SalvageProfile,
  t: ReturnType<typeof useLanguage>['t'],
) {
  if (profile === 'valueKeeper') return t('salvage.profile.valueKeeper')
  if (profile === 'fastDrop') return t('salvage.profile.fastDrop')
  return t('salvage.profile.steady')
}

function CurrencySelect({
  value,
  onChange,
}: {
  value: MoneyCurrency
  onChange: (value: MoneyCurrency) => void
}) {
  return (
    <Select value={value} onValueChange={value_ => onChange(value_ as MoneyCurrency)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MONEY_CURRENCIES.map(currency => (
          <SelectItem key={currency} value={currency}>
            {currency}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}
