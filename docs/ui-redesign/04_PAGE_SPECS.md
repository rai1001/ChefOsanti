# Page Specs (pantallas)

Formato por pagina: objetivo, layout/componentes, acciones principales, filtros/busqueda, estados (loading/empty/error), multi-branch, kitchen mode.

## Login (chefos_secure_login.png)
- Objetivo: acceso seguro con CTA claro y jerarquia fuerte.
- Layout: fondo gradient + halos; card glass centrada con titulo, subtitulo, label "Acceso seguro".
- Componentes: AppShell desactivado, Card, Inputs (email/password), Button primary glow, mensajes de ayuda, alerta de error.
- Acciones: Enviar login; enlaces pasivos "Olvidaste" y "Necesitas ayuda" (sin CTA fuerte).
- Estados: loading en boton, error banner en card.
- Multi-branch/Kitchen: no aplica.

## Executive Dashboard (executive_operations_dashboard.png)
- Objetivo: vision ejecutiva de salud operativa.
- Layout: top row de StatCards (4-5), area principal con chart (line/bars combo), panel lateral de actividad/eventos y tarjetas secundarias abajo.
- Componentes: PageHeader breve, StatCard (icon+delta), Card con ChartCard placeholder, ActivityList, filters compactos en toolbar.
- Acciones: cambiar rango fechas y sucursal, descargar/compartir reporte, abrir detalle desde actividad.
- Filtros: selector sucursal, rango fecha, tipo de vista (ej. semanal/mensual).
- Estados: skeleton para KPIs y chart; empty en actividad; error banner en panel.
- Multi-branch: selector persistente en topbar y en toolbar de la pagina.
- Kitchen mode: no prioritario; mantener densidad compacta.

## Events Management Overview (events_management_overview.png)
- Objetivo: controlar pipeline de eventos.
- Layout: header con filtros + CTA "Nuevo evento"; tabla densa con estados (Confirmed/Draft/Completed) y fechas.
- Componentes: PageHeader, Filters (status, fecha, sucursal, search), Button primary, Table con chips de estado y columna de acciones.
- Acciones: crear evento, abrir detalle, duplicar/borrar desde acciones rapidas.
- Filtros: search global, rango fecha, estado, sucursal.
- Estados: loading skeleton para tabla; empty con CTA crear; error banner.
- Multi-branch: badge de sucursal en filas y filtro obligatorio.
- Kitchen mode: filas mas altas y textos mas brillantes, sin perder densidad.

## Inventory & Expiry Control (inventory_&_expiry_control.png)
- Objetivo: ver stock por lote con caducidad.
- Layout: toolbar con filtros (estado, categoria, sucursal, search), tabla densa con columnas Item, Lote, Stock, Caduca, Estado (chips Expired/Near/Good), acciones.
- Componentes: PageHeader, Filters pills, Table con header sticky, Badges semanticos, Quick actions (ver lote, descartar).
- Acciones: buscar por item/lote, marcar lote como revisado/retirado, ordenar por fecha.
- Estados: loading skeleton; empty state "sin lotes"; error banner.
- Multi-branch: filtro y badge sucursal; acciones muestran sucursal en confirm dialog.
- Kitchen mode: aumentar alto de fila/controles, contrastes mas fuertes.

## Expiry & Stock Alerts (expiry_&_stock_alerts.png)
- Objetivo: reaccion rapida a riesgo de caducidad/stock.
- Layout: KPI de riesgo financiero arriba, tabla roja/ambar con quick actions, panel lateral de acciones rapidas.
- Componentes: StatCard, Table con filas coloreadas por severidad, QuickActions card, Badges, Confirm dialog para disposals.
- Acciones: Mark as Disposed, Prioritize Use, Ver lote; limpiar alerta.
- Filtros: severidad, categoria, sucursal, search.
- Estados: loading, empty (sin alertas), error.
- Multi-branch: selector visible; cada accion confirma sucursal.
- Kitchen mode: mantener colores semanticos fuertes y botones 48px.

## Kitchen Waste Management (kitchen_waste_management.png)
- Objetivo: registrar merma y visualizar impacto.
- Layout 3 columnas: formulario (izq), historico (centro), analytics (der) con donut y totales/CO2e.
- Componentes: WasteLogForm, HistoryList con badges de categoria, WasteDonutCard, StatCards de total merma/coste/CO2, filtros rapidos de rango/turno.
- Acciones: guardar registro, editar/eliminar linea, exportar CSV.
- Filtros: fecha/rango, categoria, sucursal, search en historico.
- Estados: loading, empty (sin registros), error.
- Multi-branch: filtro sucursal; mostrar badge en registros.
- Kitchen mode: inputs y botones mas altos; contraste elevado en donut y totales.

## Event Creation Wizard (event_creation_wizard.png)
- Objetivo: crear evento en 3 pasos guiados.
- Layout: stepper superior (3 pasos), columna principal con formulario, columna derecha con SummaryCard de costos/line items.
- Componentes: EventWizardStepLayout, FormFields (nombre, fecha, pax, sala, servicios), Buttons Next/Back, SummaryCard con totales y badges de estado.
- Acciones: siguiente/anterior, guardar borrador, confirmar evento.
- Filtros: no aplica; puede haber selector de plantilla/menu.
- Estados: loading inicial, validacion inline, error en submit.
- Multi-branch: sucursal visible en summary; validacion por org activa.
- Kitchen mode: targets 48px, tipografia mas clara.

## Kitchen Production Workflow (kitchen_production_workflow.png)
- Objetivo: control operativo en tiempo real (kanban).
- Layout: sidebar de categorias/estaciones, 3 columnas (Pendiente/En curso/Listo) scrollable horizontal, cards con progreso.
- Componentes: Sidebar filter, KanbanColumn, TaskCard (estacion, tiempo estimado, progress bar, badge critical/on track), Kitchen toggle visible.
- Acciones: mover card entre columnas (drag o botones), marcar done, reasignar estacion, abrir detalle rapido.
- Filtros: estacion, turno, sucursal.
- Estados: loading skeleton de cards, empty por columna, error banner.
- Multi-branch: selector topbar; badge de sucursal en cards si multiorg.
- Kitchen mode: cards mas altas, textos claros, botones grandes.

## Supplier & Procurement Hub (supplier_&_procurement_hub.png)
- Objetivo: gestionar proveedores y salud de abastecimiento.
- Layout: header con tabs (Overview/Suppliers/Purchase Orders), filtros avanzados, tabla densa con ratings (confiabilidad/finanzas), panel de acciones rapidas.
- Componentes: PageHeader, Tabs, Filters pills, Table con badges de salud, Search, Button primario (Nuevo proveedor/PO).
- Acciones: crear proveedor, abrir detalle split-view, exportar lista, cambiar estado activo/inactivo.
- Filtros: categoria, salud, sucursal, search.
- Estados: loading skeleton, empty con CTA, error banner.
- Multi-branch: filtro sucursal; badge en fila si aplica.
- Kitchen mode: mantener densidad pero aumentar focus ring.

## Staff Scheduling Grid (staff_scheduling_grid.png)
- Objetivo: planificar turnos semanales.
- Layout: toolbar con sucursal/semana/rol, botones Copy/Paste/Publish, grid semanal virtualizado con celdas por rol/turno y alertas (understaffed/overtime).
- Componentes: PageHeader, Filters, Buttons ghost/primary, VirtualizedGrid, Tooltip de turno, Legend de estados.
- Acciones: crear/editar shift, duplicar semana, publicar roster, resolver alertas.
- Filtros: sucursal, semana, rol/area, search por persona.
- Estados: loading (skeleton grid), empty (sin turnos), error.
- Multi-branch: selector obligatorio; badge en header con sucursal activa.
- Kitchen mode: celdas mas altas y fuentes mas claras para visibilidad.

## Operational Insights & Reports (operational_insights_&_reports.png)
- Objetivo: analitica operativa visual.
- Layout: filtros arriba (fecha/sucursal), grid de ChartCards: donut waste, stacked bars costos, line ventas, heatmap horas pico.
- Componentes: PageHeader, Filters, ChartCard wrapper, legend minimal, download/refresh actions.
- Acciones: cambiar rango, descargar CSV/PDF, alternar vista (semanal/mensual).
- Estados: loading skeleton en cada chart; empty para falta de datos; error banner per card.
- Multi-branch: filtro sucursal; mostrar en titulo de cada chart.
- Kitchen mode: sin cambios fuertes; mantener contraste.

## Purchase Order Detail (purchase_order_details.png)
- Objetivo: revisar y aprobar pedido.
- Layout: header con estado (Awaiting Approval), proveedor y totales; tabla de lineas; barra de aprobacion en pie; panel de notas/comentarios.
- Componentes: PageHeader compacto, StatusBadge, Table lineas (item, qty, uom, price, subtotal, estado), TotalsCard, ApprovalBar (Aprobar/Rechazar/Descargar).
- Acciones: aprobar/rechazar, descargar PDF, editar cantidades (si permitido), agregar comentario.
- Filtros: no aplica; search en lineas opcional.
- Estados: loading (skeleton tabla), empty (sin lineas), error.
- Multi-branch: mostrar sucursal en header y en confirm dialogs.
- Kitchen mode: botones de barra 48px, foco claro.

## Recipe & Product Catalog (recipe_&_product_catalog.png)
- Objetivo: navegar recetas/productos con densidad visual.
- Layout: grid de cards con imagen, nombre, coste por porcion, badges; panel lateral para scaling/porciones; toolbar con filtros.
- Componentes: PageHeader, Filters (categoria/costo), Search, Cards con overlay glass y boton "Ver receta", SidePanel con slider de porciones y resumen nutricional/costo.
- Acciones: buscar, filtrar, ajustar porciones, abrir detalle, duplicar receta.
- Filtros: categoria, tipo (receta/producto), coste max, sucursal.
- Estados: loading grid skeleton, empty con CTA "Crear receta", error.
- Multi-branch: badge sucursal si aplica; datos filtran por org.
- Kitchen mode: cards con borde mas marcado y texto mas brillante.

## Kitchen Production Planner (kitchen_production_planner.png)
- Objetivo: plan diario agregando KPIs y progreso.
- Layout: fila de KPIs operativos, barra de progreso, tarjetas por estacion/tiempo, botones "Mark as Done".
- Componentes: PageHeader, StatCards, ProgressCard, TaskGroups por bloque horario, Buttons success/danger segun estado.
- Acciones: marcar tarea completada, reordenar prioridad, cambiar estacion, exportar plan.
- Filtros: dia/rango, estacion, sucursal.
- Estados: loading/empty/error en lista de tareas.
- Multi-branch: selector sucursal; badge en grupos.
- Kitchen mode: botones grandes, contrastes altos, targets 48px.
