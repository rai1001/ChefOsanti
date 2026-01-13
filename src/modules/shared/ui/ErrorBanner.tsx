import type { ReactNode } from 'react'

type ErrorBannerProps = {
  title?: string
  message?: ReactNode
  onRetry?: () => void
}

export function ErrorBanner({ title = 'Error', message, onRetry }: ErrorBannerProps) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{title}</p>
          {message && <div className="text-xs text-red-200/80">{message}</div>}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-md border border-red-400/50 px-3 py-1 text-xs font-semibold text-red-50 hover:bg-red-500/10"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  )
}
