# Flujos principales

1. **Login**: usuario ingresa en `/login`, Supabase Auth, se valida membership y se redirige a `/dashboard`. Si falla, se muestran errores y opciones MFA.
2. **Crear evento**: desde `/events` se abre wizard, se selecciona fecha, espacios, servicios; se guarda y se genera un resumen con botones (importar menú, generar pedido, agendar staff).
3. **Importación OCR**: en ImporterPage se sube Excel, OCR valida columnas (supplier, productos, fechas), se generan filas en `import_rows`; tras validación se dispara RPC `import_commit`.
4. **Planning de producción**: cada `event_service` genera `production_plan` y `production_tasks`, se asigna staff y se marca status (draft → in_progress → done).
5. **Gestión de pedidos**: en `/orders` se muestra lista; al aprobar se crea `purchase_order`, se notifica por alertas y se permite marcar como ordered/received con confirm dialog.
6. **Staff scheduling**: `/staff` muestra vista de 7 días con el navegador; se registra vacaciones/turnos extra, se calculan compensaciones y se identifican shortages (badges orange/red).
7. **Dashboard**: carga KPIs, rolling calendar (`dashboard_rolling_grid`), highlights (`dashboard_event_highlights`), alertas y timeline; se lanzan RPCs para consolidar datos.
