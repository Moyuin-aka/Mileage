import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Archive, PlusCircle, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/lib/auth'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '资产' },
  { to: '/add', icon: PlusCircle, label: '新增', accent: true },
  { to: '/archive', icon: Archive, label: '归档' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {navItems.map(({ to, icon: Icon, label, accent }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-6 py-2 text-2xs font-medium transition-colors',
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
          onClick={logout}
          className="flex flex-col items-center gap-1 px-6 py-2 text-2xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <LogOut className="h-5 w-5 stroke-[1.5]" />
          <span>退出</span>
        </button>
      </div>
    </nav>
  )
}
