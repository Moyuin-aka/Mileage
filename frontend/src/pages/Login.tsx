import { FormEvent, useState } from 'react'
import { ArrowRight, Loader2, LockKeyhole, TrendingDown } from 'lucide-react'
import { api } from '@/lib/api'
import { setAuthToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LoginProps {
  onAuthenticated: () => void
}

export function Login({ onAuthenticated }: LoginProps) {
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
      setError('密码不正确')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-5 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent-muted bg-accent-bg">
            <TrendingDown className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-semibold leading-none">Mileage</h1>
            <p className="mt-1 text-xs text-zinc-500">资产成本追踪</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 shadow-2xl shadow-black/20"
        >
          <div className="mb-5 flex items-center gap-2 text-sm font-medium text-zinc-300">
            <LockKeyhole className="h-4 w-4 text-accent" />
            专属密码
          </div>

          <div className="space-y-2">
            <Label htmlFor="app-password">密码</Label>
            <Input
              id="app-password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              placeholder="输入密码"
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-400" role="alert">
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
            进入
          </Button>
        </form>
      </div>
    </main>
  )
}
