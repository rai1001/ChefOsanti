import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { ErrorBoundary } from './modules/shared/ui/ErrorBoundary'
import { Toaster } from './modules/shared/ui/Toast'
import { queryClient } from './lib/queryClient'
import { supabaseClient } from './lib/supabaseClient'
import { appRouter } from './router'

const e2eSession = (typeof window !== 'undefined' && (window as any).__E2E_SESSION__) || null
if (e2eSession && supabaseClient) {
  supabaseClient.auth.setSession(e2eSession)
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary module="Main">
        <RouterProvider router={appRouter} />
        <Toaster />
      </ErrorBoundary>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
)
