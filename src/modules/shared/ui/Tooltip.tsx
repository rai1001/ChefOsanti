import type { ReactNode } from 'react'

type TooltipProps = {
  content: string
  children: ReactNode
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <span className="relative group inline-flex">
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] text-slate-100 shadow-lg group-hover:block">
        {content}
      </span>
    </span>
  )
}
