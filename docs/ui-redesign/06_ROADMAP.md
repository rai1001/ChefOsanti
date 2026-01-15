# Roadmap UI Redesign (ChefOS)

Prioridad: reproducir referencias 1:1 sin inventar estilo. Cada sprint entrega pantallas completas con tokens, estados y toggles funcionando.

## Sprint 0 - Fundacion
- [x] Consolidar tokens en `theme.css` + Tailwind (colores, radios, sombras, spacing, densidad, kitchen mode).
- [x] AppShell unificado (topbar+sidebar) con search, selector de sucursal, notificaciones, kitchen toggle, densidad toggle.
- [x] Componentes base: Card, Button, Badge, Input/Search, Select, Table, PageHeader, Modal/Drawer, Skeleton/Banner.
- [x] KitchenMode wiring (clase body.kitchen) y Command Palette UI (Ctrl/Cmd+K).
- [x] Doc/guia de uso (este folder) actualizada y lista.

## Sprint 1 - Core visual
- [x] Login redisen 1:1 (glass, glow, jerarquia exacta).
- [x] Executive Dashboard 1:1 (KPI cards, chart card, activity panel, filtros sucursal/fecha).
- [x] Inventory & Expiry Control 1:1 (tabla densa + chips estado + filtros).
- [x] Expiry & Stock Alerts 1:1 (KPI riesgo + tabla severidad + quick actions).

## Sprint 2 - Operaciones
- [x] Kitchen Production Workflow 1:1 (kanban 3 columnas + sidebar + badges critical).
- [x] Waste Management 1:1 (3 columnas: form, historico, analytics donut + totales/CO2).
- [x] Event Creation Wizard 1:1 (stepper 3 pasos + summary card).
- [x] Kitchen Production Planner 1:1 (KPIs + progreso + botones Mark as Done).

## Sprint 3 - Administracion
- [x] Supplier & Procurement Hub 1:1 (tabs + filtros avanzados + tabla densa).
- [x] Purchase Order Detail 1:1 (header estado + tabla lineas + approval bar).
- [x] Staff Scheduling Grid 1:1 con virtualizacion y alertas (understaffed/overtime).

## Sprint 4 - Reports + Catologo + Hardening
- [x] Operational Insights & Reports 1:1 (donut waste, stacked bars costos, line ventas, heatmap).
- [x] Recipe & Product Catalog 1:1 (cards con imagen + side panel scaling).
- [x] QA visual completa: tokens consistentes, estados hover/focus, responsive, kitchen mode, multi-branch visible.
- [x] Skeletons/empty/error coherentes en todas las tablas/listas; confirm dialogs para acciones criticas.

## Definicion de "Done"
- Pantalla replica la referencia (layout, tokens, densidad, estados).
- Sin hex ni estilos sueltos; todo via tokens.
- Kitchen mode y selector de sucursal visibles donde aplica.
- Loading/empty/error presentes; acciones criticas con confirm dialog.
- Performance aceptable en tablas largas y scheduling (virtualizacion si procede).

## Next Up (pendiente)
- Backlog libre: nuevas pantallas o iteraciones.
