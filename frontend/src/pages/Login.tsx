import { FormEvent, useState } from 'react'
import { ArrowRight, Loader2, LockKeyhole, TrendingDown, Languages, Moon, Sun } from 'lucide-react'
import { api } from '@/lib/api'
import { setAuthToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/i18n'
import { useTheme } from '@/theme'

interface LoginProps {
  onAuthenticated: () => void
}

export function Login({ onAuthenticated }: LoginProps) {
  const { t, toggleLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const session = await api.login(password)
      setAuthToken(session.token)
      onAuthenticated()
    } catch {
      setError(t('login.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-surface text-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-5 py-10">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent-muted bg-accent-bg">
              <TrendingDown className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-semibold leading-none">Mileage</h1>
              <p className="mt-1 text-xs text-muted">{t('app.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t('nav.theme')}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-secondary"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-secondary transition-colors"
            >
              <Languages className="h-4 w-4" />
              {t('nav.language')}
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-app-border bg-surface-2/50 p-5 shadow-2xl shadow-overlay/10"
        >
          <div className="mb-5 flex items-center gap-2 text-sm font-medium text-secondary">
            <LockKeyhole className="h-4 w-4 text-accent" />
            {t('login.passwordLabel')}
          </div>

          <div className="space-y-2">
            <Label htmlFor="app-password">{t('login.passwordField')}</Label>
            <Input
              id="app-password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              placeholder={t('login.passwordPlaceholder')}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <p className="mt-3 text-xs text-danger" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="mt-5 w-full"
            disabled={!password || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {t('login.submit')}
          </Button>
        </form>
      </div>
    </main>
  )
}
