import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'

export function BrandMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn('h-8 w-8 shrink-0 overflow-hidden rounded-lg', className)}
      {...props}
    >
      <rect width="32" height="32" rx="8" fill="#052e16" />
      <path
        d="M8 22 L14 12 L20 18 L24 10"
        stroke="#4ade80"
        strokeWidth="2.875"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="10" r="2.25" fill="#4ade80" />
    </svg>
  )
}
