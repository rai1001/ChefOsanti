import type { ReactNode } from 'react'

type ErrorBannerProps = {
  title?: string
  message?: ReactNode
  onRetry?: () => void
}

export function ErrorBanner({ title = 'Error', message, onRetry }: ErrorBannerProps) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{title}</p>
          {message && <div className="text-xs text-danger/80">{message}</div>}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-md border border-danger/40 px-3 py-1 text-xs font-semibold text-danger hover:bg-danger/10"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  )
}
