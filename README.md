# ChefOS – Slice A0

Base local con Supabase + React/Vite/TS/Tailwind siguiendo slices verticales.

## Comandos clave
- Instalar dependencias: `pnpm install`
- Levantar Supabase local: `npx supabase start`
- Reset DB + seed: `npx supabase db reset`
- Tests DB (pgTAP): `npx supabase test db`
- App dev: `pnpm dev`
- Unit/integration: `pnpm test`
- E2E smoke: `pnpm test:e2e` (instala navegadores antes con `pnpm exec playwright install`)

## Estructura
- `docs/` ancla de arquitectura y decisiones.
- `supabase/` migraciones, seed y tests pgTAP (tablas orgs, org_memberships, hotels).
- `src/modules/<modulo>/{domain,data,ui}` módulos `auth`, `purchasing`, `orgs`, `core`.
- `src/lib/` utilidades compartidas (QueryClient, Supabase client).

## UI A0
- Login placeholder (RHF + Zod) en español.
- Layout básico + placeholder módulo Purchasing.
- Tailwind configurado, TanStack Query montado.

## Variables de entorno
Copiar `.env.example` a `.env.local` y rellenar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (usar los valores de `supabase/.env` tras `supabase start`).
