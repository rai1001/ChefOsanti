import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

type DrawerProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  side?: 'right' | 'left'
}

export function Drawer({ open, onClose, title, children, side = 'right' }: DrawerProps) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[140] flex bg-black/40 backdrop-blur-sm">
      <div
        className={`relative h-full w-full max-w-md border border-border/30 bg-surface/90 shadow-[0_30px_80px_rgba(3,7,18,0.65)] ${
          side === 'right' ? 'ml-auto' : 'mr-auto'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border/20 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[calc(100vh-56px)] overflow-auto p-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
