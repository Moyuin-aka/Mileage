import { FormEvent, useState } from 'react'
import { ArrowRight, Loader2, LockKeyhole, Languages, Moon, Server, Sun } from 'lucide-react'
import { api } from '@/lib/api'
import { setAuthToken } from '@/lib/auth'
import {
  getRemoteBaseUrl,
  requiresRemoteUrl,
  setRemoteBaseUrl,
} from '@/lib/connection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandMark } from '@/components/layout/BrandMark'
import { useLanguage } from '@/i18n'
import { useTheme } from '@/theme'

interface LoginProps {
  onAuthenticated: () => void
}

export function Login({ onAuthenticated }: LoginProps) {
  const { t, toggleLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const needsRemoteUrl = requiresRemoteUrl()
  const [remoteUrl, setRemoteUrl] = useState(() => getRemoteBaseUrl())
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (needsRemoteUrl) {
        try {
          setRemoteUrl(setRemoteBaseUrl(remoteUrl))
        } catch {
          setError(t('login.remoteError'))
          return
        }
      }
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
    <main className="min-h-screen-safe bg-surface text-primary">
      <div className="mx-auto flex min-h-screen-safe w-full max-w-sm flex-col justify-center px-5 py-10">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10 shadow-sm ring-1 ring-accent-muted" />
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

          {needsRemoteUrl && (
            <div className="mb-4 space-y-2">
              <Label htmlFor="remote-url">{t('login.remoteUrl')}</Label>
              <div className="relative">
                <Server className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  id="remote-url"
                  type="url"
                  className="pl-9"
                  value={remoteUrl}
                  onChange={event => setRemoteUrl(event.target.value)}
                  autoComplete="url"
                  placeholder={t('login.remotePlaceholder')}
                  disabled={isSubmitting}
                />
              </div>
              <p className="text-2xs leading-relaxed text-muted">
                {t('login.remoteHint')}
              </p>
            </div>
          )}

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
            disabled={!password || (needsRemoteUrl && !remoteUrl.trim()) || isSubmitting}
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
