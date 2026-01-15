import type { ReactNode } from 'react'
import { ErrorBanner } from './ErrorBanner'
import { Skeleton } from './Skeleton'

interface Props {
  loading?: boolean
  error?: unknown
  errorTitle?: string
  errorMessage?: string
  onRetry?: () => void
  empty?: boolean
  emptyState?: ReactNode
  skeleton?: ReactNode
  children: ReactNode
}

// Small helper to render consistent loading/error/empty blocks across lists and tables.
export function DataState({
  loading,
  error,
  errorTitle,
  errorMessage,
  onRetry,
  empty,
  emptyState,
  skeleton,
  children,
}: Props) {
  if (loading) {
    return (
      <>
        {skeleton ?? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
      </>
    )
  }

  if (error) {
    return (
      <ErrorBanner
        title={errorTitle ?? 'Error al cargar'}
        message={errorMessage ?? (error as Error).message}
        onRetry={onRetry}
      />
    )
  }

  if (empty) {
    return <>{emptyState}</> ?? null
  }

  return <>{children}</>
}
