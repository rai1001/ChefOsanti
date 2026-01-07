import { Outlet } from 'react-router-dom'
import { AppLayout } from './modules/core/ui/AppLayout'

function App() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

export default App
