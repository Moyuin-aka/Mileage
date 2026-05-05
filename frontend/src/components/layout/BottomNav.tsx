import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Archive, PlusCircle, LogOut, Languages, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/lib/auth'
import { useLanguage } from '@/i18n'
import { useTheme } from '@/theme'

export function BottomNav() {
  const { t, toggleLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('nav.assets') },
    { to: '/add', icon: PlusCircle, label: t('nav.new'), accent: true },
    { to: '/archive', icon: Archive, label: t('nav.archive') },
  ]

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-app-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label, accent }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-5 py-2 text-2xs font-medium transition-colors',
                accent
                  ? isActive
                    ? 'text-accent'
                    : 'text-accent/70 hover:text-accent'
                  : isActive
                  ? 'text-primary'
                  : 'text-muted hover:text-secondary',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    accent ? 'stroke-[1.75]' : 'stroke-[1.5]',
                    accent && isActive && 'text-accent',
                  )}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex flex-col items-center gap-1 px-5 py-2 text-2xs font-medium text-muted transition-colors hover:text-secondary"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 stroke-[1.5]" />
          ) : (
            <Moon className="h-5 w-5 stroke-[1.5]" />
          )}
          <span>{t('nav.theme')}</span>
        </button>
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex flex-col items-center gap-1 px-5 py-2 text-2xs font-medium text-muted transition-colors hover:text-secondary"
        >
          <Languages className="h-5 w-5 stroke-[1.5]" />
          <span>{t('nav.language')}</span>
        </button>
        <button
          type="button"
          onClick={logout}
          className="flex flex-col items-center gap-1 px-5 py-2 text-2xs font-medium text-muted transition-colors hover:text-secondary"
        >
          <LogOut className="h-5 w-5 stroke-[1.5]" />
          <span>{t('nav.signOut')}</span>
        </button>
      </div>
    </nav>
  )
}
