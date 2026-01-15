# ChefOS UI Redesign (North Star)

Objetivo: redisenar toda la UI de ChefOS para que coincida **exactamente** con el estilo "premium dark glass" de las pantallas de referencia (login, dashboard, waste, alerts, event wizard, kitchen workflow, suppliers, scheduling, reports, inventory).

Principio operativo:
- No se reescribe la logica de negocio salvo que sea necesario para soportar UI/UX.
- Se prioriza consistencia visual, densidad usable y performance (tablas y grids densos).

Entregables:
1) Tokens de diseno (Tailwind + CSS variables)
2) Libreria de componentes base (cards, tables, badges, inputs, modals, charts)
3) Especificacion de paginas
4) Roadmap por sprints
5) Prompts para Codex (VS Code)
6) Checklist de QA visual

Estado base (Fundación listos):
- Tokens consolidados en `src/styles/theme.css` + Tailwind (colores, radios, sombras, spacing, densidad, kitchen mode).
- AppShell unificado con topbar + sidebar, search, selector de sucursal, notificaciones, toggles de kitchen/densidad y Command Palette (Ctrl/Cmd+K).
- Componentes base disponibles en `src/modules/shared/ui`: Card, Button, Badge, FormField/Input, Select, Table, PageHeader, Modal, Drawer, Skeleton/Banner/DataState.
- KitchenMode aplicado via `body.kitchen`; densidad guardada en `data-density` y localStorage.

Reglas anti-desvio (obligatorias):
- Antes de tocar una pantalla, abre `/docs/ui-redesign/reference/INDEX.md`, la imagen PNG correspondiente y `src/router.tsx` para confirmar la ruta real (ver `CODEX_CONTEXT.md`). No renombres ni crees paginas nuevas.
- Usa solo tokens de `src/styles/theme.css` + Tailwind; sin hex sueltos ni estilos inline (salvo widths/progress puntuales).
- Si falta una libreria (charts), deja placeholder estilado y TODO sin mover rutas.
- Compara visualmente con la referencia antes de cerrar: glass, densidad, badges, headers sticky, topbar/sidebar/toggles funcionando.

## Referencias visuales (source of truth)

Estas capturas son la referencia exacta del redisen. No se inventa un estilo nuevo.

- Login  
  ![Login](./reference/chefos_secure_login.png)

- Executive Dashboard  
  ![Dashboard](./reference/executive_operations_dashboard.png)

- Events Management  
  ![Events](./reference/events_management_overview.png)

- Inventory & Expiry Control  
  ![Inventory](./reference/inventory_&_expiry_control.png)

- Expiry & Stock Alerts  
  ![Expiry Alerts](./reference/expiry_&_stock_alerts.png)

- Kitchen Waste Management  
  ![Waste](./reference/kitchen_waste_management.png)

- Event Creation Wizard  
  ![Event Wizard](./reference/event_creation_wizard.png)

- Kitchen Production Workflow  
  ![Production Workflow](./reference/kitchen_production_workflow.png)

- Reports (Operational Insights)  
  ![Reports](./reference/operational_insights_&_reports.png)

- Suppliers Hub  
  ![Suppliers](./reference/supplier_&_procurement_hub.png)

- Staff Scheduling  
  ![Scheduling](./reference/staff_scheduling_grid.png)

- Purchase Order Detail  
  ![PO Detail](./reference/purchase_order_details.png)
