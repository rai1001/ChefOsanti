# Codex Context - ChefOS

Guia rapida para saber rutas y stack reales al aplicar los prompts de redisen.

## Stack
- Framework: React 19 + Vite.
- Router: React Router 7 (`createBrowserRouter` en `src/router.tsx`).
- State/Data: TanStack Query 5 (+ estados locales por hook/contexto).
- Formularios: React Hook Form + Zod.
- Styling: Tailwind CSS + CSS variables en `src/styles/theme.css` e `src/index.css` (glass dark premium).
- Charts: sin libreria instalada aun (Recharts planeado, no esta en package.json).
- Auth/Backend: Supabase JS v2 (anon key); hooks en `modules/*` consultan Supabase.

## Estructura de carpetas (real)
src/
  App.tsx
  router.tsx
  index.css
  styles/theme.css
  lib/ (supabaseClient, queryClient, utils)
  modules/
    core/ui/AppLayout.tsx (topbar+sidebar+toggles)
    auth/ui/LoginPage.tsx
    dashboard/ui/DashboardPage.tsx
    events/ui/EventsBoardPage.tsx
    production/ui/GlobalProductionPage.tsx
    recipes/ui/RecipesPage.tsx
    purchasing/ui/{SuppliersPage,SupplierDetailPage,PurchaseOrdersPage,PurchaseOrderDetailPage,StockPage,EventOrdersPage,...}
    scheduling/ui/{SchedulingPage,RosterGeneratorPage}
    staff/ui/StaffPage.tsx
    waste/ui/WastePage.tsx
    reporting/ui/ReportsPage.tsx
    inventory/ui/{PreparationsPage,ExpiryAlertsPage}
  modules/shared/ui/{Button,Card,PageHeader,FormField,ConfirmDialog,Skeleton,...}

## Reglas
- No crear nuevas paginas si ya existe equivalente; ajustar las listadas.
- Usar siempre tokens de `theme.css`/Tailwind; prohibido hex sueltos.
- Respetar layout AppLayout y toggles (densidad, kitchen mode, selector de org).
