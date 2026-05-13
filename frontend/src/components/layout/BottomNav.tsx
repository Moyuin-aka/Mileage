import { NavLink } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Archive,
  ArrowRightLeft,
  ArrowUpCircle,
  Languages,
  LayoutDashboard,
  LogOut,
  Moon,
  MoreHorizontal,
  PlusCircle,
  Sun,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/lib/auth'
import { FxConverterDialog } from '@/components/fx/FxConverterDialog'
import { useLanguage } from '@/i18n'
import { useTheme } from '@/theme'
import { useState } from 'react'
import { isTauriRuntime } from '@/lib/connection'
import { useUpdateChecker } from '@/hooks/useUpdateChecker'

export function BottomNav() {
  const { t, toggleLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [fxOpen, setFxOpen] = useState(false)
  const isTauri = isTauriRuntime()
  const { state: updateState, info: updateInfo, check: checkUpdate } = useUpdateChecker()

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
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex flex-col items-center gap-1 px-5 py-2 text-2xs font-medium text-muted transition-colors hover:text-secondary"
              aria-label={t('nav.more')}
            >
              <MoreHorizontal className="h-5 w-5 stroke-[1.5]" />
              <span>{t('nav.more')}</span>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="top"
              align="end"
              sideOffset={10}
              className={cn(
                'z-50 min-w-44 rounded-xl border border-app-border bg-surface-2 p-1 shadow-2xl shadow-overlay/10',
                'data-[state=open]:animate-slide-up',
              )}
            >
              <DropdownMenu.Item
                onSelect={() => setFxOpen(true)}
                className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-secondary outline-none transition-colors data-[highlighted]:bg-surface-3 data-[highlighted]:text-primary"
              >
                <ArrowRightLeft className="h-4 w-4 text-muted" />
                {t('nav.fx')}
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-app-border" />
              <DropdownMenu.Item
                onSelect={toggleTheme}
                className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-secondary outline-none transition-colors data-[highlighted]:bg-surface-3 data-[highlighted]:text-primary"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-muted" />
                ) : (
                  <Moon className="h-4 w-4 text-muted" />
                )}
                {t('nav.theme')}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={toggleLanguage}
                className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-secondary outline-none transition-colors data-[highlighted]:bg-surface-3 data-[highlighted]:text-primary"
              >
                <Languages className="h-4 w-4 text-muted" />
                {t('nav.language')}
              </DropdownMenu.Item>
              {isTauri && (
                <>
                  <DropdownMenu.Separator className="my-1 h-px bg-app-border" />
                  <DropdownMenu.Item
                    onSelect={() => {
                      if (updateState === 'update-available' && updateInfo) {
                        window.open(updateInfo.releaseUrl, '_blank')
                      } else {
                        checkUpdate()
                      }
                    }}
                    className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-surface-3 data-[highlighted]:text-primary"
                  >
                    <ArrowUpCircle className={cn(
                      'h-4 w-4',
                      updateState === 'update-available' ? 'text-accent' : 'text-muted',
                    )} />
                    <span className={cn(
                      updateState === 'update-available' ? 'text-accent' : 'text-secondary',
                    )}>
                      {updateState === 'checking' && t('update.checking')}
                      {updateState === 'latest' && `${t('update.latest')} v${updateInfo?.current}`}
                      {updateState === 'update-available' && `${t('update.available')} v${updateInfo?.latest}`}
                      {updateState === 'error' && t('update.error')}
                      {updateState === 'idle' && t('nav.checkUpdate')}
                    </span>
                  </DropdownMenu.Item>
                </>
              )}
              <DropdownMenu.Separator className="my-1 h-px bg-app-border" />
              <DropdownMenu.Item
                onSelect={logout}
                className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger outline-none transition-colors data-[highlighted]:bg-danger-bg data-[highlighted]:text-danger"
              >
                <LogOut className="h-4 w-4" />
                {t('nav.signOut')}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      <FxConverterDialog open={fxOpen} onOpenChange={setFxOpen} />
    </nav>
  )
}
