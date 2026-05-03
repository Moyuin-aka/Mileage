import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera } from 'lucide-react'
import { ItemCategory, ItemStatus, CATEGORY_LABELS, STATUS_LABELS, ItemFormData } from '@/types'
import { useItem, useItemMutations } from '@/hooks/useItems'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toDateInputValue } from '@/lib/utils'

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

export function ItemForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)

  const { item, loading: itemLoading } = useItem(id ?? '__none__')
  const mutations = useItemMutations(() => navigate(isEditing ? `/item/${id}` : '/'))

  const [form, setForm] = useState<ItemFormData>(DEFAULTS)

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
          返回
        </button>
        <h1 className="font-serif text-2xl text-zinc-100">
          {isEditing ? '编辑物品' : '添加物品'}
        </h1>
        <p className="text-sm text-zinc-600 mt-0.5">
          {isEditing ? '修改物品信息' : '记录一件新的资产'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section: 基本信息 */}
        <section className="space-y-4">
          <SectionTitle>基本信息</SectionTitle>

          <Field label="物品名称" required>
            <Input
              placeholder="例如：MacBook Pro 16&quot; M3 Max"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
            />
          </Field>

          <Field label="类别" required>
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
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="购入价格（元）" required>
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
            <Field label="购入日期" required>
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

        {/* Section: 可选信息 */}
        <section className="space-y-4">
          <SectionTitle>可选信息</SectionTitle>

          <div className="grid grid-cols-2 gap-3">
            <Field label="预期使用年限（年）">
              <Input
                type="number"
                min={0.5}
                max={20}
                step={0.5}
                placeholder="如 3"
                suffix="年"
                value={form.expected_years ?? ''}
                onChange={e =>
                  set('expected_years', e.target.value ? parseFloat(e.target.value) : undefined)
                }
              />
            </Field>
            <Field label="预估残值（元）">
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

          <Field label="购买渠道">
            <Input
              placeholder="例如：京东自营、Apple Store"
              value={form.purchase_channel ?? ''}
              onChange={e => set('purchase_channel', e.target.value)}
            />
          </Field>

          {isEditing && (
            <Field label="状态">
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
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {form.status === 'retired' && (
            <Field label="退役日期">
              <Input
                type="date"
                value={form.retired_at ?? ''}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => set('retired_at', e.target.value)}
              />
            </Field>
          )}

          {form.status === 'sold' && (
            <Field label="转手价格（元）">
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

          <Field label="备注">
            <Textarea
              rows={3}
              placeholder="配置、版本、购买渠道备注等…"
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
            />
          </Field>
        </section>

        {/* OCR placeholder */}
        <div className="rounded-xl border border-zinc-800 border-dashed p-4 flex items-center gap-3 opacity-40 cursor-not-allowed select-none">
          <Camera className="h-5 w-5 text-zinc-500" />
          <div>
            <p className="text-sm text-zinc-400">拍照识别订单（Phase 2）</p>
            <p className="text-2xs text-zinc-600 mt-0.5">上传订单截图自动填写信息</p>
          </div>
        </div>

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
            取消
          </Button>
          <Button
            type="submit"
            variant="accent"
            className="flex-1"
            disabled={mutations.saving || !form.name.trim()}
          >
            {mutations.saving ? '保存中…' : isEditing ? '保存更改' : '添加物品'}
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
