import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Archive, PlusCircle, LogOut, Languages } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/lib/auth'
import { useLanguage } from '@/i18n'

export function BottomNav() {
  const { t, toggleLanguage } = useLanguage()

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('nav.assets') },
    { to: '/add', icon: PlusCircle, label: t('nav.new'), accent: true },
    { to: '/archive', icon: Archive, label: t('nav.archive') },
  ]

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80 pb-safe">
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
                  ? 'text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300',
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
          onClick={toggleLanguage}
          className="flex flex-col items-center gap-1 px-5 py-2 text-2xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <Languages className="h-5 w-5 stroke-[1.5]" />
          <span>{t('nav.language')}</span>
        </button>
        <button
          type="button"
          onClick={logout}
          className="flex flex-col items-center gap-1 px-5 py-2 text-2xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <LogOut className="h-5 w-5 stroke-[1.5]" />
          <span>{t('nav.signOut')}</span>
        </button>
      </div>
    </nav>
  )
}
