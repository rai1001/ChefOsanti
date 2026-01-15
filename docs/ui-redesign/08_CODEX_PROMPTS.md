# Prompts Codex (VS Code) - ChefOS UI Redesign

## REGLA GLOBAL (obligatoria)
Antes de modificar cualquier pantalla:
- Abre `/docs/ui-redesign/reference/INDEX.md` y la imagen especifica en `/docs/ui-redesign/reference/<archivo>.png`.
- Abre `src/router.tsx` y `/docs/ui-redesign/CODEX_CONTEXT.md` para confirmar la ruta real del componente. No crees ni renombres paginas.
- Usa solo tokens de `src/styles/theme.css` + Tailwind. Nada de hex sueltos.

Replica layout, spacing, tokens, bordes, sombras y densidad visual. **No inventes estilos alternativos.**

## REGLA DE RUTAS/NOMBRES (evita desalineacion)
Modifica unicamente estos archivos existentes (no crear otros):
- AppShell: `src/modules/core/ui/AppLayout.tsx` (topbar/sidebar/toggles).
- Tokens/base: `src/styles/theme.css`, `src/index.css`.
- Componentes base: `src/modules/shared/ui/{Card.tsx,Button.tsx,Badge.tsx,Table.tsx,...}`.
- Login: `src/modules/auth/ui/LoginPage.tsx`.
- Dashboard: `src/modules/dashboard/ui/DashboardPage.tsx`.
- Events overview: `src/modules/events/ui/EventsBoardPage.tsx`.
- Event wizard: `src/modules/events/ui/NewEventPage.tsx`.
- Production workflow: `src/modules/production/ui/GlobalProductionPage.tsx`.
- Waste: `src/modules/waste/ui/WastePage.tsx`.
- Expiry & Stock Alerts: `src/modules/inventory/ui/ExpiryAlertsPage.tsx`.
- Inventory/Stock list: `src/modules/purchasing/ui/StockPage.tsx` (usa la referencia inventory).
- Suppliers hub: `src/modules/purchasing/ui/SuppliersPage.tsx` (detalle en `SupplierDetailPage.tsx`).
- Purchase order detail: `src/modules/purchasing/ui/PurchaseOrderDetailPage.tsx`.
- Events purchasing (si aplica tabla): `src/modules/purchasing/ui/EventOrdersPage.tsx`.
- Staff scheduling: `src/modules/scheduling/ui/SchedulingPage.tsx`.
- Reports: `src/modules/reporting/ui/ReportsPage.tsx`.
- Recipes/Product catalog: `src/modules/recipes/ui/{RecipesPage.tsx,ProductsPage.tsx}` segun coverage.

Si falta una libreria (ej. charts), deja placeholder estilado y TODO explicito sin mover rutas.

---

## CABECERA (pegar al inicio de cada prompt)
Contexto:
Lee primero:
- /docs/ui-redesign/CODEX_CONTEXT.md
- /docs/ui-redesign/reference/INDEX.md
- /docs/ui-redesign/01_UI_NORTH_STAR.md
- /docs/ui-redesign/02_DESIGN_TOKENS.md

Regla:
Replica estrictamente el estilo visual de la imagen de referencia.
No inventes variantes.
No cambies logica de negocio salvo que sea necesario para UI.
Devuelveme SOLO los archivos modificados o creados, con rutas completas.

---

## PROMPT 0 - Preparacion (tokens + theme)
Referencia visual: (aplicar a todo el sistema, ver INDEX.md)
Implementa un sistema de tokens de diseno para ChefOS con CSS variables y Tailwind.
Requisitos:
- Crear/ajustar `src/styles/theme.css` con variables: --bg, --surface, --border, --text, --muted, --accent, --danger, --warning, --success.
- Crear modo `kitchen` como clase en `body` que sobrescribe variables para mayor contraste.
- Actualizar `tailwind.config.js` para mapear colores a variables.
- Anadir estilos base para `body` con background gradient dark y tipografia.
Busqueda/rutas: confirmar en router, no crear otros archivos.
Criterio:
- Ningun componente usa hex hardcodeado; todo sale de tokens.
- Kitchen mode cambia contraste visiblemente.

---

## PROMPT 1 - AppShell unificado + Topbar
Referencia visual: ver INDEX.md (dashboard/tabla)
Implementa/redisena `src/modules/core/ui/AppLayout.tsx` para estilo premium dark glass.
Requisitos:
- Topbar: Search, Branch selector, Notifications, User menu, Kitchen toggle, Densidad.
- Sidebar: navegacion principal (Dashboard, Events, Production, Purchasing, Inventory/Stock, Waste, Reports, Staff).
Criterio:
- Layout consistente en todas las paginas, responsive, usando tokens.

---

## PROMPT 2 - Componentes base: Card, Button, Badge, Table
Referencia visual: ver INDEX.md (cards/tablas)
Actualiza `src/modules/shared/ui/{Card.tsx,Button.tsx,Badge.tsx,Table.tsx}` y utilidades en `src/styles/theme.css`/`src/index.css`.
Requisitos:
- Button: primary/secondary/ghost/outline/danger; estados hover/focus/disabled; size icon.
- Badge: success/warn/danger/info; pill uppercase.
- Table: header sticky opcional, row hover, alineacion numerica derecha, soporte densidad.
Criterio:
- Todos consumen tokens (sin hex).

---

## PROMPT 3 - Login 1:1
Referencia exacta:
- `/docs/ui-redesign/reference/chefos_secure_login.png`
Redisena `src/modules/auth/ui/LoginPage.tsx` para replicar el estilo.

---

## PROMPT 4 - Executive Dashboard 1:1
Referencia exacta:
- `/docs/ui-redesign/reference/executive_operations_dashboard.png`
Redisena `src/modules/dashboard/ui/DashboardPage.tsx` (KPIs + chart card + activity feed).

---

## PROMPT 5 - Events Overview 1:1
Referencia exacta:
- `/docs/ui-redesign/reference/events_management_overview.png`
Redisena `src/modules/events/ui/EventsBoardPage.tsx` (tabla densa + filtros + CTA).

---

## PROMPT 6 - Inventory & Expiry Control 1:1
Referencia exacta:
- `/docs/ui-redesign/reference/inventory_&_expiry_control.png`
Redisena `src/modules/purchasing/ui/StockPage.tsx` (o pagina de inventario equivalente) con tabla densa + status chips.

---

## PROMPT 7 - Expiry & Stock Alerts 1:1
Referencia exacta:
- `/docs/ui-redesign/reference/expiry_&_stock_alerts.png`
Redisena `src/modules/inventory/ui/ExpiryAlertsPage.tsx` (KPIs + tabla roja/ambar + quick actions).

---

## PROMPT 8 - Waste Management 1:1
Referencia exacta:
- `/docs/ui-redesign/reference/kitchen_waste_management.png`
Redisena `src/modules/waste/ui/WastePage.tsx` (3 columnas + donut + totals + CO2e).

---

## PROMPT 9 - Event Creation Wizard 1:1
Referencia exacta:
- `/docs/ui-redesign/reference/event_creation_wizard.png`
Redisena `src/modules/events/ui/NewEventPage.tsx` (stepper + form + summary card).

---

## PROMPT 10 - Kitchen Production Workflow 1:1
Referencia exacta:
- `/docs/ui-redesign/reference/kitchen_production_workflow.png`
Redisena `src/modules/production/ui/GlobalProductionPage.tsx` (sidebar categorias + kanban + task cards).

---

## PROMPT 11 - Supplier & Procurement Hub 1:1
Referencia exacta:
- `/docs/ui-redesign/reference/supplier_&_procurement_hub.png`
Redisena `src/modules/purchasing/ui/SuppliersPage.tsx` (tabs + filtros + tabla densa; detalle en `SupplierDetailPage.tsx` si aplica).

---

## PROMPT 12 - Staff Scheduling Grid 1:1 + performance
Referencia exacta:
- `/docs/ui-redesign/reference/staff_scheduling_grid.png`
Actualiza `src/modules/scheduling/ui/SchedulingPage.tsx` con virtualizacion si aplica.

---

## PROMPT 13 - Reports Operational Insights 1:1
Referencia exacta:
- `/docs/ui-redesign/reference/operational_insights_&_reports.png`
Redisena `src/modules/reporting/ui/ReportsPage.tsx` (donut + bars + line + heatmap; usar ChartCard wrapper).

---

## PROMPT 14 - Purchase Order Detail 1:1
Referencia exacta:
- `/docs/ui-redesign/reference/purchase_order_details.png`
Redisena `src/modules/purchasing/ui/PurchaseOrderDetailPage.tsx` (header + items + totals + approvals).

---

## PROMPT 15 - Recipe & Product Catalog 1:1
Referencia exacta:
- `/docs/ui-redesign/reference/recipe_&_product_catalog.png`
Redisena `src/modules/recipes/ui/RecipesPage.tsx` y/o `ProductsPage.tsx` (cards + panel lateral) segun cobertura existente.
