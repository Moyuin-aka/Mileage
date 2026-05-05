import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Archive, PlusCircle, TrendingDown, LogOut, Languages, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/auth'
import { useLanguage } from '@/i18n'
import { useTheme } from '@/theme'

export function Sidebar() {
  const navigate = useNavigate()
  const { t, toggleLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/archive', icon: Archive, label: t('nav.archiveFull') },
  ]

  return (
    <div className="flex flex-col h-full border-r border-app-border bg-surface px-4 py-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-bg border border-accent-muted">
          <TrendingDown className="h-4 w-4 text-accent" />
        </div>
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

      <Button
        variant="ghost"
        size="md"
        className="w-full mt-1 justify-start text-muted"
        onClick={logout}
      >
        <LogOut className="h-4 w-4" />
        {t('nav.signOut')}
      </Button>
    </div>
  )
}
