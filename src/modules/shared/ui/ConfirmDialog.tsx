type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-nano-navy-900 p-5 shadow-2xl">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {description && <p className="mt-2 text-sm text-slate-300">{description}</p>}
        <div className="mt-4 flex justify-end gap-3">
          <button
            className="rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/20 hover:bg-red-500"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
