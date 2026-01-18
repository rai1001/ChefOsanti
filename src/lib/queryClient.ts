import { QueryClient } from '@tanstack/react-query'
import { AppError } from './shared/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: (failureCount, error) => {
        // No reintentar errores de validación, 404 o auth
        if (error instanceof AppError) {
          if (['ValidationError', 'NotFoundError', 'AuthError', 'ConflictError'].includes(error.type)) {
            return false
          }
        }
        // No reintentar errores 4xx
        const status = (error as any)?.status
        if (typeof status === 'number' && status >= 400 && status < 500) {
          return false
        }
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
  },
})
