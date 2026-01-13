# Decisiones

1. (2026-01-07) Repo inicializado como monorepo frontend+Supabase. Estado: Aceptada.
2. (2026-01-07) Stack fijo: Supabase (Postgres+RLS+Storage) + React/Vite/TS/Tailwind + TanStack Query + RHF/Zod + Vitest + Playwright. Estado: Aceptada (mandato).
3. (2026-01-07) Organizacion de codigo por modulos en `src/modules/<modulo>/{domain,data,ui}` siguiendo Clean/Hexagonal ligero. Estado: Aceptada (mandato).
4. (2026-01-07) Estrategia de entrega por slices verticales (DB+migraciones+RLS+seed+UI minima+tests) sin mezclar modulos. Estado: Aceptada (mandato).
5. (2026-01-07) Idioma UI espanol y moneda EUR en interfaz. Estado: Aceptada (mandato).
6. (2026-01-07) Gestor de paquetes: pnpm. Estado: Aceptada.
7. (2026-01-07) RLS basada en `auth.uid()` y pertenencia en `org_memberships` filtrando por `org_id`. Estado: Aceptada para A0.
8. (2026-01-07) Local Supabase: forzar HS256 para evitar bug ES256 en Windows/Docker; alcance solo local; Estado: Activa.
9. (2026-01-07) P1 Purchasing: tablas `suppliers` y `supplier_items` aisladas por `org_id` mediante RLS con `org_memberships` + `auth.uid()`. Estado: Activa.
10. (2026-01-07) Reglas de redondeo de cantidades: `none`, `ceil_unit`, `ceil_pack` (requiere `pack_size>0`). Estado: Activa.
11. (2026-01-07) P2 Purchasing: pedidos por hotel (`purchase_orders` + `purchase_order_lines`), stock local en `ingredients`, RLS por org via `org_memberships`, recepcion atomica con RPC `receive_purchase_order`. Estado: Activa.
12. (2026-01-07) E1 Eventos: salones y eventos por hotel con spaces, events, space_bookings; RLS por org via org_memberships; coherencia org/hotel validada en triggers; helper SQL `space_booking_overlaps` para avisos de solape. Estado: Activa.
13. (2026-01-07) E2 Servicios de evento: tabla `event_services` ligada a `events`, RLS por org via org_memberships, trigger de coherencia org y ventana valida; gestion en UI de EventDetail. Estado: Activa.
14. (2026-01-07) E3 Menus: plantillas por org (`menu_templates` + items) y aplicacion a servicios (`event_service_menus`) con necesidades calculadas por pax/formato y redondeo de P1; RLS por org via org_memberships. Estado: Activa.
15. (2026-01-07) Correccion E3: plantillas y su CRUD dependen solo de la organizacion activa (no de hotel); `useActiveOrgId` selecciona org por membership y se persiste en localStorage. Estado: Activa.
16. (2026-01-07) E4 Overrides: exclusiones, adiciones, reemplazos y notas por servicio aplicados sobre la plantilla; calculo de necesidades aplica overrides; RLS por org via org_memberships y validacion de coherencia en triggers. Estado: Activa.
17. (2026-01-07) E5 OCR: adjuntos por evento y jobs OCR con provider mock por defecto; borrador estructurado (servicios + secciones/items) siempre se revisa antes de aplicar; menu de contenido se guarda por servicio (sections/items) separado de plantillas/ratios; RLS por org y bucket privado `event-attachments` con politicas por org. Estado: Activa.
18. (2026-01-07) P2 draft orders por evento: necesidades de servicios (plantilla+overrides) se mapean a proveedores via `menu_item_aliases`, bloqueando si hay items sin mapping y generando `event_purchase_orders` agrupados por proveedor. Estado: Activa.
19. (2026-01-13) PR4 Reservas: las reservas no descuentan `stock_levels.on_hand`; solo reducen el available_on_hand para neteo cuando `consider_reservations` está activo. Se crean por evento/servicio y tienen estados active/released; los conflictos (shortage) no bloquean pero se muestran en UI. Estado: Activa.
20. (2026-01-13) Patrón UI PageHeader: encabezado reusable (título/subtítulo/acciones) para mejorar jerarquía y consistencia en pantallas de listas/detalles. Estado: Activa.
21. (2026-01-13) Inventario por lotes: se usa `supplier_items` como producto comprable y se referencian en `stock_batches` (en lugar de crear tabla products) para minimizar impacto en purchasing. FEFO se basa en `expires_at` (NULL al final). Estado: Activa.
22. (2026-01-13) Barcodes: se mapean a `supplier_items` (no products nuevos) en tabla `product_barcodes` para entrada rápida; flujo de UI permite asignar barcode desconocido a un ítem existente. Estado: Activa.
