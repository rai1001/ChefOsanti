# Component Library (obligatorios)

## Base
- AppShell (Sidebar/Topbar)
- PageHeader (title + actions + filters slot)
- Card (surface + border + shadow)
- StatCard (KPI + icon + delta)
- Badge (success/warn/danger/info)
- Button (primary/secondary/ghost/danger)
- Input (text, search)
- Select
- Toggle (Kitchen mode)
- Modal / Drawer (para detalles rápidos)
- Table (dense + sticky header opcional)
- Tabs
- Pagination

## Domain Components
- AlertsTableRow (expiry/waste)
- WasteLogForm
- WasteDonutCard
- ProductionKanbanColumn + TaskCard
- EventWizardStepLayout + SummaryCard
- SupplierSplitViewList + SupplierDetailPanel
- PurchaseOrderDetailTable + ApprovalBar
- StaffSchedulingGrid (virtualizado)
- ReportsChartCard (recharts)

## Reglas de estilo
- Todas las surfaces usan el mismo token de fondo y borde.
- No crear estilos inline salvo width/progress.
- Nada de grises inconsistentes: usar tokens.
