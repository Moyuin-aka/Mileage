import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  summary?: React.ReactNode
  defaultOpen?: boolean
  headerAction?: React.ReactNode
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  headerAction,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border border-app-border bg-surface-2 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start justify-between gap-3 px-5 py-4 hover:bg-surface-3/50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="font-serif text-sm text-primary">{title}</p>
          {!open && summary && (
            <p className="text-2xs text-muted mt-0.5 leading-snug">{summary}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {headerAction && (
            <span onClick={e => e.stopPropagation()}>
              {headerAction}
            </span>
          )}
          <ChevronRight className={cn(
            'h-4 w-4 text-muted transition-transform duration-200',
            open && 'rotate-90',
          )} />
        </div>
      </button>
      {open && (
        <div className="border-t border-app-border px-5 pb-5 pt-4 animate-slide-up">
          {children}
        </div>
      )}
    </div>
  )
}
