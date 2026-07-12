import { NavLink, useNavigate } from 'react-router-dom'
import {
  Archive,
  ArrowRightLeft,
  ArrowUpCircle,
  CheckCircle,
  FileText,
  Languages,
  LayoutDashboard,
  Loader2,
  LogOut,
  Moon,
  PlusCircle,
  Sun,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/auth'
import { FxConverterDialog } from '@/components/fx/FxConverterDialog'
import { BrandMark } from '@/components/layout/BrandMark'
import { useLanguage } from '@/i18n'
import { useTheme } from '@/theme'
import { isTauriRuntime } from '@/lib/connection'
import { useUpdateChecker } from '@/hooks/useUpdateChecker'

export function Sidebar() {
  const navigate = useNavigate()
  const { t, toggleLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [fxOpen, setFxOpen] = useState(false)
  const isTauri = isTauriRuntime()
  const { state: updateState, info: updateInfo, check: checkUpdate } = useUpdateChecker()

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/archive', icon: Archive, label: t('nav.archiveFull') },
  ]

  return (
    <div className="flex flex-col h-full border-r border-app-border bg-surface px-4 py-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <BrandMark className="h-8 w-8 shadow-sm ring-1 ring-accent-muted" />
        <div>
          <p className="font-serif text-base font-semibold text-primary leading-none">Mileage</p>
          <p className="text-2xs text-muted mt-0.5">{t('app.subtitle')}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-surface-3 text-primary'
                  : 'text-muted hover:text-secondary hover:bg-surface-2',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-accent' : '')} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Add item button */}
      <Button
        variant="accent"
        size="md"
        className="w-full mt-4"
        onClick={() => navigate('/add')}
      >
        <PlusCircle className="h-4 w-4" />
        {t('nav.addItem')}
      </Button>

      <Button
        variant="ghost"
        size="md"
        className="w-full mt-2 justify-start text-muted"
        onClick={() => setFxOpen(true)}
      >
        <ArrowRightLeft className="h-4 w-4" />
        {t('nav.fx')}
      </Button>

      <Button
        variant="ghost"
        size="md"
        className="w-full mt-1 justify-start text-muted"
        onClick={() => navigate('/report')}
      >
        <FileText className="h-4 w-4" />
        {t('nav.report')}
      </Button>

      <Button
        variant="ghost"
        size="md"
        className="w-full mt-1 justify-start text-muted"
        onClick={toggleTheme}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {t('nav.theme')}
      </Button>

      <Button
        variant="ghost"
        size="md"
        className="w-full mt-1 justify-start text-muted"
        onClick={toggleLanguage}
      >
        <Languages className="h-4 w-4" />
        {t('nav.language')}
      </Button>

      {isTauri && (
        <div className="mt-1">
          {updateState === 'update-available' && updateInfo ? (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-bg border border-accent-muted">
              <ArrowUpCircle className="h-4 w-4 text-accent shrink-0" />
              <span className="text-xs text-accent flex-1 min-w-0 truncate">
                {t('update.available')} v{updateInfo.latest}
              </span>
              <button
                type="button"
                onClick={() => window.open(updateInfo.releaseUrl, '_blank')}
                className="text-2xs text-accent font-medium hover:underline shrink-0"
              >
                {t('update.download')}
              </button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="md"
              className={cn(
                'w-full justify-start',
                updateState === 'latest' ? 'text-success' : 'text-muted',
              )}
              onClick={checkUpdate}
              disabled={updateState === 'checking'}
            >
              {updateState === 'checking' && <Loader2 className="h-4 w-4 animate-spin" />}
              {updateState === 'latest' && <CheckCircle className="h-4 w-4" />}
              {updateState === 'error' && <XCircle className="h-4 w-4 text-danger" />}
              {(updateState === 'idle') && <ArrowUpCircle className="h-4 w-4" />}
              <span className={updateState === 'error' ? 'text-danger' : ''}>
                {updateState === 'checking' && t('update.checking')}
                {updateState === 'latest' && `${t('update.latest')} v${updateInfo?.current}`}
                {updateState === 'error' && t('update.error')}
                {updateState === 'idle' && t('nav.checkUpdate')}
              </span>
            </Button>
          )}
        </div>
      )}

      <Button
        variant="ghost"
        size="md"
        className="w-full mt-1 justify-start text-muted"
        onClick={logout}
      >
        <LogOut className="h-4 w-4" />
        {t('nav.signOut')}
      </Button>

      <FxConverterDialog open={fxOpen} onOpenChange={setFxOpen} />
    </div>
  )
}
