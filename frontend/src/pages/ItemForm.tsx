import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, Check, Loader2, Wand2 } from 'lucide-react'
import {
  ItemCategory,
  ItemStatus,
  ItemFormData,
  OcrCandidate,
  OcrParseResult,
} from '@/types'
import { useItem, useItemMutations } from '@/hooks/useItems'
import { api } from '@/lib/api'
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

const DEFAULTS: ItemFormData = {
  name: '',
  category: 'electronics',
  purchase_price: 0,
  purchase_date: new Date().toISOString().slice(0, 10),
  expected_years: undefined,
  residual_value: 0,
  purchase_channel: '',
  status: 'active',
  retired_at: undefined,
  sold_price: undefined,
  notes: '',
  image_url: '',
}

const EMPTY_OCR_DRAFT = {
  name: '',
  category: 'electronics' as ItemCategory,
  purchase_price: '',
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

  useEffect(() => {
    if (isEditing && item) {
      setForm({
        name: item.name,
        category: item.category,
        purchase_price: item.purchase_price,
        purchase_date: toDateInputValue(item.purchase_date),
        expected_years: item.expected_years,
        residual_value: item.residual_value,
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
    setForm(prev => ({
      ...prev,
      name: ocrDraft.name.trim() || prev.name,
      category: ocrDraft.category,
      purchase_price: Number.parseFloat(ocrDraft.purchase_price) || prev.purchase_price,
      purchase_date: ocrDraft.purchase_date || prev.purchase_date,
      purchase_channel: ocrDraft.purchase_channel.trim() || prev.purchase_channel,
    }))
    setOcrDialogOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return

    const payload: ItemFormData = {
      ...form,
      purchase_price: Number(form.purchase_price) || 0,
      residual_value: Number(form.residual_value) || 0,
      expected_years: form.expected_years ? Number(form.expected_years) : undefined,
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
        <div className="h-4 w-24 bg-zinc-800 rounded" />
        <div className="h-8 w-40 bg-zinc-800 rounded" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-zinc-900 rounded-lg border border-zinc-800" />
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
          className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors text-sm mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('detail.back')}
        </button>
        <h1 className="font-serif text-2xl text-zinc-100">
          {isEditing ? t('form.titleEdit') : t('form.titleNew')}
        </h1>
        <p className="text-sm text-zinc-600 mt-0.5">
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
              onValueChange={v => set('category', v as ItemCategory)}
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
                placeholder="0.00"
                prefix="¥"
                value={form.residual_value || ''}
                onChange={e => set('residual_value', parseFloat(e.target.value) || 0)}
              />
            </Field>
          </div>

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

        <div className="rounded-xl border border-zinc-800 border-dashed p-4">
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
                <p className="text-sm text-zinc-300">{t('form.ocrTitle')}</p>
                <p className="mt-0.5 truncate text-2xs text-zinc-600">{t('form.ocrHint')}</p>
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
            <p className="mt-3 text-xs text-red-400" role="alert">
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
                    onPick={value => setOcr('name', value)}
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
                    prefix="¥"
                    value={ocrDraft.purchase_price}
                    onChange={event => setOcr('purchase_price', event.target.value)}
                  />
                  <CandidateRow
                    candidates={ocrResult?.candidates.purchase_price}
                    format={value => `¥${value}`}
                    onPick={value => setOcr('purchase_price', String(value))}
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
                    onPick={value => setOcr('purchase_date', value)}
                  />
                </Field>

                <Field label={t('form.channel')}>
                  <Input
                    value={ocrDraft.purchase_channel}
                    onChange={event => setOcr('purchase_channel', event.target.value)}
                  />
                  <CandidateRow
                    candidates={ocrResult?.candidates.purchase_channel}
                    onPick={value => setOcr('purchase_channel', value)}
                  />
                </Field>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
                <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                  <span className="text-xs font-medium text-zinc-500">{t('form.ocrRawText')}</span>
                  <span className="text-2xs text-zinc-600">
                    {t('form.ocrLines', { n: ocrResult?.lines.length ?? 0 })}
                  </span>
                </div>
                <div className="max-h-44 overflow-y-auto px-3 py-2">
                  {ocrResult?.lines.slice(0, 40).map((line, index) => (
                    <div key={`${line.text}-${index}`} className="flex gap-3 py-1 text-xs">
                      <span className="w-10 shrink-0 text-right text-zinc-700">
                        {line.score != null ? `${Math.round(line.score * 100)}%` : '--'}
                      </span>
                      <span className="text-zinc-400">{line.text}</span>
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
          <div className="rounded-lg bg-red-950/30 border border-red-900 px-4 py-3 text-sm text-red-400">
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
    <h2 className="font-serif text-sm text-zinc-400 pb-2 border-b border-zinc-800">{children}</h2>
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
  format?: (value: T) => string
  onPick: (value: T) => void
}) {
  if (!candidates?.length) return null

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {candidates.slice(0, 3).map(candidate => (
        <button
          type="button"
          key={`${candidate.label ?? 'cand'}-${candidate.value}`}
          className="max-w-full truncate rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-2xs text-zinc-400 transition-colors hover:border-accent-muted hover:text-zinc-100"
          title={candidate.source}
          onClick={() => onPick(candidate.value)}
        >
          {format ? format(candidate.value) : candidate.value}
        </button>
      ))}
    </div>
  )
}
