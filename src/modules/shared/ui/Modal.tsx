import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

type ModalProps = {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl border border-border/30 bg-surface/90 shadow-[0_30px_80px_rgba(3,7,18,0.65)]">
        <div className="flex items-center justify-between border-b border-border/20 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
