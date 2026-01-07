import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from './App'
import { LoginPage } from './modules/auth/ui/LoginPage'
import { SuppliersPage } from './modules/purchasing/ui/SuppliersPage'
import { SupplierDetailPage } from './modules/purchasing/ui/SupplierDetailPage'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/purchasing/suppliers" replace />,
      },
      {
        path: 'purchasing/suppliers',
        element: <SuppliersPage />,
      },
      {
        path: 'purchasing/suppliers/:id',
        element: <SupplierDetailPage />,
      },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '*',
    element: <div className="p-6 text-center text-red-600">Sección no encontrada.</div>,
  },
])
