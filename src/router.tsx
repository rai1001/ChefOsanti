import { createBrowserRouter, Navigate } from 'react-router-dom'
import App from './App'
import { LoginPage } from './modules/auth/ui/LoginPage'
import { RequireActiveOrg, RequireAuth, RequirePermission } from './modules/auth/ui/RequirePermission'
import { SuppliersPage } from './modules/purchasing/ui/SuppliersPage'
import { SupplierDetailPage } from './modules/purchasing/ui/SupplierDetailPage'
import { PurchaseOrdersPage } from './modules/purchasing/ui/PurchaseOrdersPage'
import { NewPurchaseOrderPage } from './modules/purchasing/ui/NewPurchaseOrderPage'
import { PurchaseOrderDetailPage } from './modules/purchasing/ui/PurchaseOrderDetailPage'
import { StockPage } from './modules/purchasing/ui/StockPage'
import { DashboardPage } from './modules/dashboard/ui/DashboardPage'
import { EventOrdersPage } from './modules/purchasing/ui/EventOrdersPage'
import { EventOrderDetailPage } from './modules/purchasing/ui/EventOrderDetailPage'
import { EventsBoardPage } from './modules/events/ui/EventsBoardPage'
import { NewEventPage } from './modules/events/ui/NewEventPage'
import { EventDetailPage } from './modules/events/ui/EventDetailPage'
import { MenuTemplatesPage } from './modules/events/ui/MenuTemplatesPage'
import { MenuTemplateDetailPage } from './modules/events/ui/MenuTemplateDetailPage'
import { ProductsPage } from './modules/recipes/ui/ProductsPage'
import { RecipesPage } from './modules/recipes/ui/RecipesPage'
import { RecipeDetailPage } from './modules/recipes/ui/RecipeDetailPage'
import { SchedulingPage } from './modules/scheduling/ui/SchedulingPage'
import { RosterGeneratorPage } from './modules/scheduling/ui/RosterGeneratorPage'
import { StaffPage } from './modules/staff/ui/StaffPage'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: (
      <RequireAuth>
        <RequireActiveOrg>
          <App />
        </RequireActiveOrg>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        element: (
          <RequirePermission perm="dashboard:read">
            <DashboardPage />
          </RequirePermission>
        ),
      },
      {
        path: 'events',
        element: (
          <RequirePermission perm="events:read">
            <EventsBoardPage />
          </RequirePermission>
        ),
      },
      {
        path: 'events/new',
        element: (
          <RequirePermission perm="events:write">
            <NewEventPage />
          </RequirePermission>
        ),
      },
      {
        path: 'events/:id',
        element: (
          <RequirePermission perm="events:read">
            <EventDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: 'menus',
        element: (
          <RequirePermission perm="menus:read">
            <MenuTemplatesPage />
          </RequirePermission>
        ),
      },
      {
        path: 'menus/:id',
        element: (
          <RequirePermission perm="menus:read">
            <MenuTemplateDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: 'products',
        element: (
          <RequirePermission perm="recipes:read">
            <ProductsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'recipes',
        element: (
          <RequirePermission perm="recipes:read">
            <RecipesPage />
          </RequirePermission>
        ),
      },
      {
        path: 'recipes/:id',
        element: (
          <RequirePermission perm="recipes:read">
            <RecipeDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: 'staff',
        element: (
          <RequirePermission perm="staff:read">
            <StaffPage />
          </RequirePermission>
        ),
      },
      {
        path: 'scheduling',
        element: (
          <RequirePermission perm="scheduling:read">
            <SchedulingPage />
          </RequirePermission>
        ),
      },
      {
        path: 'scheduling/generate',
        element: (
          <RequirePermission perm="scheduling:write">
            <RosterGeneratorPage />
          </RequirePermission>
        ),
      },
      {
        path: 'purchasing/suppliers',
        element: (
          <RequirePermission perm="purchasing:read">
            <SuppliersPage />
          </RequirePermission>
        ),
      },
      {
        path: 'purchasing/suppliers/:id',
        element: (
          <RequirePermission perm="purchasing:read">
            <SupplierDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: 'purchasing/orders',
        element: (
          <RequirePermission perm="purchasing:read">
            <PurchaseOrdersPage />
          </RequirePermission>
        ),
      },
      {
        path: 'purchasing/orders/new',
        element: (
          <RequirePermission perm="purchasing:write">
            <NewPurchaseOrderPage />
          </RequirePermission>
        ),
      },
      {
        path: 'purchasing/orders/:id',
        element: (
          <RequirePermission perm="purchasing:read">
            <PurchaseOrderDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: 'purchasing/event-orders',
        element: (
          <RequirePermission perm="purchasing:read">
            <EventOrdersPage />
          </RequirePermission>
        ),
      },
      {
        path: 'purchasing/event-orders/:id',
        element: (
          <RequirePermission perm="purchasing:read">
            <EventOrderDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: 'purchasing/stock',
        element: (
          <RequirePermission perm="purchasing:read">
            <StockPage />
          </RequirePermission>
        ),
      },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  {
    path: '*',
    element: <div className="p-6 text-center text-red-600">Sección no encontrada.</div>,
  },
])
