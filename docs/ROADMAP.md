# Roadmap por slices

## A0 – Cimientos (DoD)
- Supabase local: `npx supabase start` y `npx supabase db reset` funcional con seed idempotente.
- Tablas base: `orgs`, `org_memberships`, `hotels` con RLS activas e aislamiento por `org_id`.
- Tests DB: `npx supabase test db` (pgTAP) pasando.
- Frontend: Vite/React/TS/Tailwind iniciado; login placeholder, layout vacío y placeholder módulo purchasing.
- Tooling: `pnpm test` (Vitest) y `pnpm exec playwright test` (smoke) pasan.

## P1 – Auth + sesión
- Supabase Auth wiring (client) y flujo de login real (UI ES).
- Persistencia de sesión en Query client; guards de rutas.
- Tests: unit (form), integration (session hooks), e2e login real.

## P2 – Purchasing seed
- Modelado inicial de purchasing (ej. vendors/orders) con migraciones y RLS por `org_id`.
- UI mínima list/detail conectada a Supabase.
- Seeds idempotentes y tests db/e2e de lectura controlada.

## P3 – Storage + adjuntos
- Activar Supabase Storage con buckets por org.
- RLS de buckets/objetos; adaptadores de carga/lectura.
- UI: carga/visualización básica en purchasing.

## PR3 – Stock vs Compras (NetToBuy)
- Tablas nuevas: inventory_locations, stock_levels, purchasing_settings con RLS por org.
- Lógica de neteo: gross - stock - on_order + buffer, redondeo por pack/rounding_rule, bloqueo por unit mismatch.
- Borradores de evento usan NetToBuy y preservan líneas congeladas.
- UI: tabla Need/OnHand/OnOrder/Buffer/Net/Rounded en detalle de pedido y alertas por unidades incompatibles.

## PR4 – Reservas de stock por evento/servicio
- Tablas stock_reservations y stock_reservation_lines con RLS.
- Disponible = on_hand - reservas activas de servicios solapados (flag consider_reservations).
- Botones para reservar/liberar desde pedido de evento, con conflictos por shortage.
- Reservas no descuentan stock; solo afectan disponibilidad en neteo.

> Cada slice debe mantener independencia de módulo y cumplir template de SLICES.
