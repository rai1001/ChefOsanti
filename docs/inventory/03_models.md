# Modelos de datos y relaciones (supabase)

- **users**: auth.users + perfil extendido en `profiles` (name, role, branch_id). Relacionada con org_memberships.
- **orgs**: multitenancy base (org_id) con slug, name, settings.
- **hotels**: fk a orgs.
- **org_memberships**: conecta orgs y usuarios, incluye role (admin, planner, kitchen, purchasing) y flags.
- **events**: pertenece a org/hotel, fields (title, status(draft/confirmed/cancelled), starts_at, ends_at, service_type).
- **spaces**: espacios físicos ligados a hotel/org.
- **space_bookings**: un espacio por evento y tiempos.
- **event_services**: servicios (coffee_break, dinner, in_room) y formatos (de_pie, sentado).
- **production_plans/taks**: link a event_services para planificar tareas y seguimiento de status.
- **products/purchase_orders**: pedidos con supplier_id, status enumerado; event_purchase_orders para vincular con eventos.
- **event_purchase_orders**: track status del pedido por evento (draft/approved/ordered/received).
- **import_jobs/import_rows**: staging para Excel/CSV + validaciones (crear supplier, menú, receta).

Todas las tablas incluyen `org_id` para RLS; `organization_id` se propaga a RPCs y funciones.
