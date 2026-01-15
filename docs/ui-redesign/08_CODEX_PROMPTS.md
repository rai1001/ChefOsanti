# Prompts Codex (VS Code) — ChefOS UI Redesign

## REGLA GLOBAL (obligatoria)
Antes de modificar cualquier página, abre:
- `/docs/ui-redesign/reference/INDEX.md`
- y la imagen específica de esta página en `/docs/ui-redesign/reference/<archivo>.png`

Replica layout, spacing, tokens, bordes, sombras y densidad visual. **No inventes estilos alternativos.**

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
No cambies lógica de negocio salvo que sea necesario para UI.
Devuélveme SOLO los archivos modificados o creados, con rutas completas.

---

## PROMPT 0 — Preparación (tokens + theme)
Referencia visual: (aplicar a todo el sistema, ver INDEX.md)
Implementa un sistema de tokens de diseño para ChefOS con CSS variables y Tailwind.
Requisitos:
- Crear archivo `src/styles/theme.css` con variables: --bg, --surface, --border, --text, --muted, --accent, --danger, --warning, --success.
- Crear modo `kitchen` como clase en `body` que sobrescribe variables para mayor contraste.
- Actualizar `tailwind.config.js` para mapear colores a variables.
- Añadir estilos base para `body` con background gradient dark y tipografía.
Criterio:
- Ningún componente usa hex hardcodeado; todo sale de tokens.
- Kitchen mode cambia contraste visiblemente.

---

## PROMPT 1 — AppShell unificado + Topbar
Referencia visual: ver INDEX.md (dashboard/tabla)
Implementa/rediseña `AppLayout` para coincidir con estilo premium dark glass.
Requisitos:
- Topbar: Search, Branch selector, Notifications, User menu, Kitchen toggle
- Sidebar: navegación principal (Dashboard, Events, Production, Purchasing, Inventory, Waste, Reports, Staff, Settings)
Criterio:
- Layout consistente en todas las páginas, responsive.

---

## PROMPT 2 — Componentes base: Card, Button, Badge, Table
Referencia visual: ver INDEX.md (cards/tablas)
Crea/actualiza `src/components/ui/`:
- `Card.tsx`, `Button.tsx`, `Badge.tsx`, `Table.tsx` (dense).
Requisitos:
- Button: primary/secondary/ghost/danger
- Badge: success/warn/danger/info
- Table: header sticky opcional, row hover
Criterio:
- Todos consumen tokens (sin hex).

---

## PROMPT 3 — Login 1:1
Referencia visual exacta:
- `/docs/ui-redesign/reference/chefos_secure_login.png`
Rediseña `src/pages/Login.tsx` para replicar el estilo.

---

## PROMPT 4 — Executive Dashboard 1:1
Referencia visual exacta:
- `/docs/ui-redesign/reference/executive_operations_dashboard.png`
Rediseña `src/pages/Dashboard.tsx` para replicar KPIs + chart card + activity feed.

---

## PROMPT 5 — Events Overview 1:1
Referencia visual exacta:
- `/docs/ui-redesign/reference/events_management_overview.png`
Rediseña `src/pages/Events.tsx` (tabla densa + filtros + CTA).

---

## PROMPT 6 — Inventory & Expiry Control 1:1
Referencia visual exacta:
- `/docs/ui-redesign/reference/inventory_&_expiry_control.png`
Rediseña `src/pages/Inventory.tsx` (dense table + status chips).

---

## PROMPT 7 — Expiry & Stock Alerts 1:1
Referencia visual exacta:
- `/docs/ui-redesign/reference/expiry_&_stock_alerts.png`
Rediseña `src/pages/ExpiryAlerts.tsx` (KPIs + tabla roja/ámbar + quick actions).

---

## PROMPT 8 — Waste Management 1:1
Referencia visual exacta:
- `/docs/ui-redesign/reference/kitchen_waste_management.png`
Rediseña `src/pages/Waste.tsx` (3 columnas + donut + totals + CO2e).

---

## PROMPT 9 — Event Creation Wizard 1:1
Referencia visual exacta:
- `/docs/ui-redesign/reference/event_creation_wizard.png`
Rediseña `src/pages/EventWizard.tsx` (stepper + form + summary card).

---

## PROMPT 10 — Kitchen Production Workflow 1:1
Referencia visual exacta:
- `/docs/ui-redesign/reference/kitchen_production_workflow.png`
Rediseña `src/pages/ProductionWorkflow.tsx` (sidebar categorías + kanban + task cards).

---

## PROMPT 11 — Supplier & Procurement Hub 1:1
Referencia visual exacta:
- `/docs/ui-redesign/reference/supplier_&_procurement_hub.png`
Rediseña `src/pages/Suppliers.tsx` (tabs + filtros + tabla densa).

---

## PROMPT 12 — Staff Scheduling Grid 1:1 + performance
Referencia visual exacta:
- `/docs/ui-redesign/reference/staff_scheduling_grid.png`
Implementa/actualiza `src/pages/StaffScheduling.tsx` con virtualización si aplica.

---

## PROMPT 13 — Reports Operational Insights 1:1
Referencia visual exacta:
- `/docs/ui-redesign/reference/operational_insights_&_reports.png`
Rediseña `src/pages/Reports.tsx` (donut + bars + line + heatmap).

---

## PROMPT 14 — Purchase Order Detail 1:1
Referencia visual exacta:
- `/docs/ui-redesign/reference/purchase_order_details.png`
Rediseña `src/pages/PurchaseOrderDetail.tsx` (header + items + totals + approvals).

---

## PROMPT 15 — Recipe & Product Catalog 1:1
Referencia visual exacta:
- `/docs/ui-redesign/reference/recipe_&_product_catalog.png`
Rediseña `src/pages/Recipes.tsx` o equivalente (cards + panel lateral).
