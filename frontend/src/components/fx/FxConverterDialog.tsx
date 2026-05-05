import { useState } from 'react'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import type { FxConversionResult, MoneyCurrency } from '@/types'
import { api } from '@/lib/api'
import { formatCurrencyAmount, MONEY_CURRENCIES } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

interface FxConverterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FxConverterDialog({ open, onOpenChange }: FxConverterDialogProps) {
  const { t } = useLanguage()
  const [amount, setAmount] = useState('')
  const [fromCurrency, setFromCurrency] = useState<MoneyCurrency>('USD')
  const [toCurrency, setToCurrency] = useState<MoneyCurrency>('CNY')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [bankFee, setBankFee] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<FxConversionResult | null>(null)

  async function handleConvert() {
    const parsedAmount = Number.parseFloat(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return

    setLoading(true)
    setError('')
    try {
      const next = await api.convertFx({
        amount: parsedAmount,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        date,
        bank_fee: Number.parseFloat(bankFee) || 0,
      })
      setResult(next)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : t('fx.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('fx.title')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fx-amount">{t('fx.amount')}</Label>
              <Input
                id="fx-amount"
                type="number"
                min={0}
                step={0.01}
                value={amount}
                placeholder="100.00"
                onChange={event => setAmount(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('fx.from')}</Label>
              <CurrencySelect value={fromCurrency} onChange={setFromCurrency} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('fx.to')}</Label>
              <CurrencySelect value={toCurrency} onChange={setToCurrency} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fx-date">{t('fx.date')}</Label>
              <Input
                id="fx-date"
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={event => setDate(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fx-bank-fee">{t('fx.bankFee')}</Label>
            <Input
              id="fx-bank-fee"
              type="number"
              min={0}
              step={0.01}
              suffix="%"
              value={bankFee}
              onChange={event => setBankFee(event.target.value)}
            />
          </div>

          {result && (
            <div className="rounded-xl border border-accent-muted bg-accent-bg p-4">
              <p className="text-2xs uppercase tracking-widest text-accent/70">
                {t('fx.result')}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="font-mono text-lg font-bold text-accent">
                  {formatCurrencyAmount(result.converted_amount, result.to_currency)}
                </p>
                <ArrowRightLeft className="h-4 w-4 text-accent/60" />
              </div>
              <p className="mt-2 text-xs text-muted">
                1 {result.from_currency} = {result.rate.toFixed(6)} {result.to_currency} · {result.date}
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}

          <p className="text-xs leading-relaxed text-muted">{t('fx.disclaimer')}</p>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="accent"
            onClick={handleConvert}
            disabled={loading || !amount}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            {loading ? t('fx.converting') : t('fx.convert')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
