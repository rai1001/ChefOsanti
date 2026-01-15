import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'

type Variant = 'info' | 'success' | 'warning' | 'danger'

const ICONS: Record<Variant, ReactNode> = {
  info: <Info size={16} />,
  success: <CheckCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  danger: <XCircle size={16} />,
}

export function Banner({
  variant = 'info',
  title,
  message,
  action,
}: {
  variant?: Variant
  title: string
  message?: string
  action?: ReactNode
}) {
  const tone =
    variant === 'success'
      ? 'border-success/40 bg-success/10 text-success'
      : variant === 'warning'
        ? 'border-warning/40 bg-warning/10 text-warning'
        : variant === 'danger'
          ? 'border-danger/40 bg-danger/10 text-danger'
          : 'border-accent/40 bg-accent/10 text-accent'

  return (
    <div className={`flex items-start justify-between gap-3 rounded-2xl border px-3 py-2 text-sm ${tone}`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5">{ICONS[variant]}</span>
        <div>
          <p className="font-semibold">{title}</p>
          {message && <p className="text-xs opacity-80">{message}</p>}
        </div>
      </div>
      {action && <div className="text-xs">{action}</div>}
    </div>
  )
}
