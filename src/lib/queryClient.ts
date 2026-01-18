import { QueryClient } from '@tanstack/react-query'
import { AppError } from '@/lib/shared/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (failureCount >= 3) return false

        if (error instanceof AppError) {
          if (['ValidationError', 'NotFoundError', 'AuthError'].includes(error.type)) {
            return false
          }
        }

        const status = (error as any)?.status
        if (typeof status === 'number' && status >= 400 && status < 500) {
          return false
        }

        return true
      },
    },
  },
})
