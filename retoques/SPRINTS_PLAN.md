# Sprint Plan - Retoques Pendientes

Objetivo: agrupar el backlog pendiente en sprints con dependencias claras.

## Orden propuesto
1) Sprint 9 - Staff Vacation and Compensation (done)
2) Sprint 10 - Scheduling Monthly View (done)
3) Sprint 11 - Inventory Expiry and Preparations (done)
4) Sprint 12 - Procurement and Orders
5) Sprint 13 - Recipes, Categories, Mise en Place
6) Sprint 14 - Dashboard, Briefing, Reports
7) Sprint 15 - Integrations and Event Metadata

## Dependencias clave
- Scheduling mensual depende de compensaciones (Sprint 9).
- Lead times y estados de pedidos antes de briefing y dashboard operativo (Sprint 12 -> Sprint 14).
- Tipos de producto y caducidad antes de reglas de alertas y costos (Sprint 11 -> Sprint 13).
- Integraciones de albaranes dependen de inventario y compras (Sprints 11/12).

## Entregables por sprint
Cada sprint debe incluir:
- Migraciones DB + RLS
- RPCs para logica critica
- UI solo para visualizacion/captura
- QA basica (happy path + errores)
