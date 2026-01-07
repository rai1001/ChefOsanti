# Arquitectura ChefOS (A0)

## Principios
- Clean/Hexagonal ligero: dominio aislado de frameworks, adaptadores en `data`, UI en `ui`.
- Organización por módulos: `src/modules/<modulo>/{domain,data,ui}`. No mezclar responsabilidades entre módulos.
- Slices verticales: cada entrega incluye DB+migraciones+RLS+seed+UI mínima+tests.
- Idioma UI: español. Moneda: EUR.

## Capas
- **domain**: contratos, tipos, casos de uso puros. Sin dependencias de framework.
- **data**: adaptadores a Supabase/HTTP/Storage. Implementa puertos de dominio y maneja mapeos dto<->dominio.
- **ui**: React (Vite/TS/Tailwind), rutas y composición. Usa TanStack Query para datos remotos y RHF+Zod para formularios.

## Módulos iniciales
- `auth`: flujo de login/logout, gestión de sesión (placeholder en A0).
- `purchasing`: placeholder UI en A0; lógica irá en slices posteriores.
- `orgs`: modelo organizacional base (orgs, org_memberships, hotels) expuesto vía RLS.

## Datos y RLS
- Base: Supabase (Postgres) con RLS activado en tablas de negocio.
- Identidad: políticas basadas en `auth.uid()` y pertenencia en `org_memberships` filtrando por `org_id`.
- Seed idempotente por org; tests pgTAP validan aislamiento (`org_id`) y que un usuario solo ve su organización.

## Frontend
- Entrypoint `src/main.tsx` monta `QueryClientProvider`, temas base y enrutado.
- Estilos: Tailwind con diseño base responsivo. Tokens extendidos en `tailwind.config.{cjs,ts}`.
- Configuración Supabase client en `src/lib` (o adaptador en `data`) usando variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## Testing
- Unit/integration: Vitest. Mocks ligeros de data adapters.
- E2E: Playwright smoke (login placeholder, layout, purchasing placeholder).
- DB: `npx supabase test db` con pgTAP y RLS habilitada.

## Entorno y comandos
- Arranque Supabase: `npx supabase start`.
- Reset DB: `npx supabase db reset` (aplica migraciones + seed).
- Frontend: `pnpm dev`, pruebas `pnpm test`, e2e `pnpm exec playwright test`.
