# ChefOS UI Redesign (North Star)

Objetivo: Rediseñar toda la UI de ChefOS para que coincida **exactamente** con el estilo “premium dark glass” de las pantallas de referencia (login, dashboard, waste, alerts, event wizard, kitchen workflow, suppliers, scheduling, reports, inventory).

Principio operativo:
- No se reescribe la lógica de negocio salvo que sea necesario para soportar UI/UX.
- Se prioriza consistencia visual, densidad usable y performance (tablas y grids densos).

Entregables:
1) Tokens de diseño (Tailwind + CSS variables)
2) Librería de componentes base (cards, tables, badges, inputs, modals, charts)
3) Especificación de páginas
4) Roadmap por sprints
5) Prompts para Codex (VS Code)
6) Checklist de QA visual

## Referencias visuales (source of truth)

Estas capturas son la referencia exacta del rediseño. No se inventa un estilo nuevo.

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
