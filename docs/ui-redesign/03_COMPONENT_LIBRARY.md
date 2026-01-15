# Component Library (obligatoria)

Todo consume tokens de `theme.css`/Tailwind. Sin hex sueltos ni estilos inline salvo width/progress puntuales.

## Base
- AppShell: topbar sticky con search pill, selector de sucursal, notificaciones, toggle kitchen/densidad, logout; sidebar con secciones; responsive con nav pills horizontales en mobile.
- PageHeader: titulo + subtitulo + slot de acciones/filtros; usa jerarquia H1 32-36px, etiquetas uppercase 11-12px.
- Card/Glass panel: borde `var(--border)/0.12`, blur 18-28px, radio 16-20px, sombras soft/card.
- StatCard: icono en pill, label muted, valor fuerte, delta con color semantico (+ verde, - rojo); puede incluir mini sparkline placeholder hasta tener charts.
- Button: variantes primary/secondary/ghost/outline/danger; estados hover/focus/disabled; min 44px alto; opcion icon-only (`size=icon`); glow suave en primary.
- Badge: variantes success/warn/error/info/neutral; pill uppercase 11-12px; usar fondos semanticos 0.15 + borde 0.35.
- Input/Search: altura por token; fondo surface-2, borde border/0.2; focus accent + halo; search con icono leading y hint Ctrl+K opcional.
- Select: mismo estilo que input; soporta pill compacto para toolbar.
- Toggle Kitchen: pill con estado On/Off y borde accent; al activar, aplicar clase `body.kitchen`.
- Modal/Drawer: superficie glass, header con titulo/accion, cuerpo scrollable, footer con botones; overlay oscuro 60% + blur ligero.
- Table: densa, header sticky (fondo glass 0.03), hover fila glass 0.04; numeros alineados a la derecha; columna de acciones 120px; soporta `compact/comfortable` via data-density; badges para estados.
- Tabs: fondo glass, borde inferior accent en activo; uso en Suppliers/Reports.
- Pagination: pills con outline; pagina activa en primary, disabled sin sombra.
- Skeleton/Banner: usar helpers de `modules/shared/ui` para cargas y avisos.

## Domain Components
- AlertsTableRow: severidad por fila (rojo/ambar), badges de estado, CTA contextual (Dispose/Prioritize/View); incluye chip de sucursal.
- WasteLogForm: campos categoria, causa, cantidad, coste; acciones guardar/cancelar; validacion RHF+Zod; botones 44px.
- WasteDonutCard: contenedor para donut (Recharts u otro) con leyenda lateral; usa Card + header.
- ProductionKanbanColumn/TaskCard: columna con titulo y contador; cards con estacion, tiempo estimado, progress bar, badge critical/on-track, CTA rapido.
- EventWizardStepLayout + SummaryCard: stepper (3 pasos), form area, resumen costeo a la derecha; botones Next/Back con estados disabled/loading.
- SupplierSplitViewList + SupplierDetailPanel: lista izquierda densa con search/filtros, panel derecho glass con tabs/resumen/contacto/metricas.
- PurchaseOrderDetailTable + ApprovalBar: tabla de lineas con cantidades, unidades, precio, subtotal; barra inferior con total, impuestos, botones Aprobar/Rechazar/Descargar.
- StaffSchedulingGrid: grid virtualizado semanal con celdas rol/turno; badges understaffed/overtime; scroll sync horizontal/vertical.
- ReportsChartCard: envoltorio glass para charts con header, filtro, toolbar download; placeholder hasta instalar Recharts.

## Reglas de estilo
- Todas las surfaces usan el mismo fondo/borde; no mezclar grises.
- Focus visible y consistente en inputs/buttons; targets 44px+ (mas en kitchen).
- Densidad controlada por tokens y toggle; mantener sticky headers en tablas largas.
- Acciones criticas con confirm dialog contextual (item + sucursal).
