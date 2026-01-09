import { Outlet } from 'react-router-dom'
import { AppLayout } from './modules/core/ui/AppLayout'
import { ErrorBoundary } from './modules/shared/ui/ErrorBoundary'

function App() {
  return (
    <AppLayout>
      <ErrorBoundary module="AppRoute">
        <Outlet />
      </ErrorBoundary>
    </AppLayout>
  )
}

export default App
