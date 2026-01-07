# Decisiones

1. (2026-01-07) Repo inicializado como monorepo frontend+Supabase. Estado: Aceptada.
2. (2026-01-07) Stack fijo: Supabase (Postgres+RLS+Storage) + React/Vite/TS/Tailwind + TanStack Query + RHF/Zod + Vitest + Playwright. Estado: Aceptada (mandato).
3. (2026-01-07) Organización de código por módulos en `src/modules/<modulo>/{domain,data,ui}` siguiendo Clean/Hexagonal ligero. Estado: Aceptada (mandato).
4. (2026-01-07) Estrategia de entrega por slices verticales (DB+migraciones+RLS+seed+UI mínima+tests) sin mezclar módulos. Estado: Aceptada (mandato).
5. (2026-01-07) Idioma UI español y moneda EUR en interfaz. Estado: Aceptada (mandato).
6. (2026-01-07) Gestor de paquetes: pnpm. Estado: Aceptada.
7. (2026-01-07) RLS basada en `auth.uid()` y pertenencia en `org_memberships` filtrando por `org_id`. Estado: Aceptada para A0.
8. (2026-01-07) Local Supabase: forzar HS256 para evitar bug ES256 en Windows/Docker; alcance solo local; Estado: Activa.
9. (2026-01-07) P1 Purchasing: tablas `suppliers` y `supplier_items` aisladas por `org_id` mediante RLS con `org_memberships` + `auth.uid()`. Estado: Activa.
10. (2026-01-07) Reglas de redondeo de cantidades: `none`, `ceil_unit`, `ceil_pack` (requiere `pack_size>0`). Estado: Activa.
11. (2026-01-07) P2 Purchasing: pedidos por hotel (`purchase_orders` + `purchase_order_lines`), stock local en `ingredients`, RLS por org via `org_memberships`, recepción atómica con RPC `receive_purchase_order`. Estado: Activa.
12. (2026-01-07) E1 Eventos: salones y eventos por hotel con spaces, vents, space_bookings; RLS por org via org_memberships; coherencia org/hotel validada en triggers; helper SQL space_booking_overlaps para avisos de solape. Estado: Activa.
13. (2026-01-07) E2 Servicios de evento: tabla event_services ligada a events, RLS por org via org_memberships, trigger de coherencia org y ventana valida; gestion en UI de EventDetail. Estado: Activa.
