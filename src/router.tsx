import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import App from './App'
import { LoginPage } from './modules/auth/ui/LoginPage'
import { RequireActiveOrg, RequireAuth, RequirePermission } from './modules/auth/ui/RequirePermission'

// ✅ NUEVO: Lazy loading para todos los componentes de página
const DashboardPage = lazy(() => import('./modules/dashboard/ui/DashboardPage'))
const SuppliersPage = lazy(() => import('./modules/purchasing/ui/SuppliersPage'))
const SupplierDetailPage = lazy(() => import('./modules/purchasing/ui/SupplierDetailPage'))
const PurchaseOrdersPage = lazy(() => import('./modules/purchasing/ui/PurchaseOrdersPage'))
const NewPurchaseOrderPage = lazy(() => import('./modules/purchasing/ui/NewPurchaseOrderPage'))
const PurchaseOrderDetailPage = lazy(() => import('./modules/purchasing/ui/PurchaseOrderDetailPage'))
const StockPage = lazy(() => import('./modules/purchasing/ui/StockPage'))
const EventOrdersPage = lazy(() => import('./modules/purchasing/ui/EventOrdersPage'))
const EventOrderDetailPage = lazy(() => import('./modules/purchasing/ui/EventOrderDetailPage'))
const EventsBoardPage = lazy(() => import('./modules/events/ui/EventsBoardPage'))
const NewEventPage = lazy(() => import('./modules/events/ui/NewEventPage'))
const EventDetailPage = lazy(() => import('./modules/events/ui/EventDetailPage'))
const GlobalProductionPage = lazy(() => import('./modules/production/ui/GlobalProductionPage'))
const MenuTemplatesPage = lazy(() => import('./modules/events/ui/MenuTemplatesPage'))
const MenuTemplateDetailPage = lazy(() => import('./modules/events/ui/MenuTemplateDetailPage'))
const ProductsPage = lazy(() => import('./modules/recipes/ui/ProductsPage'))
const RecipesPage = lazy(() => import('./modules/recipes/ui/RecipesPage'))
const RecipeDetailPage = lazy(() => import('./modules/recipes/ui/RecipeDetailPage'))
const SchedulingPage = lazy(() => import('./modules/scheduling/ui/SchedulingPage'))
const RosterGeneratorPage = lazy(() => import('./modules/scheduling/ui/RosterGeneratorPage'))
const StaffPage = lazy(() => import('./modules/staff/ui/StaffPage'))
const WastePage = lazy(() => import('./modules/waste/ui/WastePage'))
const ReportsPage = lazy(() => import('./modules/reporting/ui/ReportsPage'))
const ImporterPage = lazy(() => import('./modules/importer/ui/ImporterPage'))

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-nano-navy-900">
      <div className="text-center space-y-4">
        <div className="animate-spin h-12 w-12 border-4 border-nano-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-slate-400 text-sm animate-pulse">Cargando...</p>
      </div>
    </div>
  )
}

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
            <Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'events',
        element: (
          <RequirePermission perm="events:read">
            <Suspense fallback={<PageLoader />}>
              <EventsBoardPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'events/new',
        element: (
          <RequirePermission perm="events:write">
            <Suspense fallback={<PageLoader />}>
              <NewEventPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'events/:id',
        element: (
          <RequirePermission perm="events:read">
            <Suspense fallback={<PageLoader />}>
              <EventDetailPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'production',
        element: (
          <RequirePermission perm="events:read">
            <Suspense fallback={<PageLoader />}>
              <GlobalProductionPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'menus',
        element: (
          <RequirePermission perm="menus:read">
            <Suspense fallback={<PageLoader />}>
              <MenuTemplatesPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'menus/:id',
        element: (
          <RequirePermission perm="menus:read">
            <Suspense fallback={<PageLoader />}>
              <MenuTemplateDetailPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'products',
        element: (
          <RequirePermission perm="recipes:read">
            <Suspense fallback={<PageLoader />}>
              <ProductsPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'recipes',
        element: (
          <RequirePermission perm="recipes:read">
            <Suspense fallback={<PageLoader />}>
              <RecipesPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'recipes/:id',
        element: (
          <RequirePermission perm="recipes:read">
            <Suspense fallback={<PageLoader />}>
              <RecipeDetailPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'staff',
        element: (
          <RequirePermission perm="staff:read">
            <Suspense fallback={<PageLoader />}>
              <StaffPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'scheduling',
        element: (
          <RequirePermission perm="scheduling:read">
            <Suspense fallback={<PageLoader />}>
              <SchedulingPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'scheduling/generate',
        element: (
          <RequirePermission perm="scheduling:write">
            <Suspense fallback={<PageLoader />}>
              <RosterGeneratorPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'purchasing/suppliers',
        element: (
          <RequirePermission perm="purchasing:read">
            <Suspense fallback={<PageLoader />}>
              <SuppliersPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'purchasing/suppliers/:id',
        element: (
          <RequirePermission perm="purchasing:read">
            <Suspense fallback={<PageLoader />}>
              <SupplierDetailPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'purchasing/orders',
        element: (
          <RequirePermission perm="purchasing:read">
            <Suspense fallback={<PageLoader />}>
              <PurchaseOrdersPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'purchasing/orders/new',
        element: (
          <RequirePermission perm="purchasing:write">
            <Suspense fallback={<PageLoader />}>
              <NewPurchaseOrderPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'purchasing/orders/:id',
        element: (
          <RequirePermission perm="purchasing:read">
            <Suspense fallback={<PageLoader />}>
              <PurchaseOrderDetailPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'purchasing/event-orders',
        element: (
          <RequirePermission perm="purchasing:read">
            <Suspense fallback={<PageLoader />}>
              <EventOrdersPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'purchasing/event-orders/:id',
        element: (
          <RequirePermission perm="purchasing:read">
            <Suspense fallback={<PageLoader />}>
              <EventOrderDetailPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'purchasing/stock',
        element: (
          <RequirePermission perm="purchasing:read">
            <Suspense fallback={<PageLoader />}>
              <StockPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'importer',
        element: (
          <RequirePermission perm="dashboard:read">
            <Suspense fallback={<PageLoader />}>
              <ImporterPage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'waste',
        element: (
          <RequirePermission perm="waste:read">
            <Suspense fallback={<PageLoader />}>
              <WastePage />
            </Suspense>
          </RequirePermission>
        ),
      },
      {
        path: 'reports',
        element: (
          <RequirePermission perm="reports:read">
            <Suspense fallback={<PageLoader />}>
              <ReportsPage />
            </Suspense>
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
