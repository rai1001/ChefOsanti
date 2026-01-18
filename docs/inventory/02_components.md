# Componentes clave

1. **AppShell** (topbar + sidebar): nav principal, select sucursal, botones Kitchen/Density, Command Palette (Ctrl+K).
2. **KPICard**: tarjeta con métricas (producción, alertas, ventas) y gráficos mini.
3. **CalendarGrid**: tabla semanal para staff y eventos con indicadores de urgencia/understaffed.
4. **EventTable**: listado denso con chips de estado y acciones rápidas (importar, exportar, ver detalles).
5. **WizardStepper**: modal/stepper para crear eventos, con componentes Step, Summary, QuickActions.
6. **InventoryTable**: vista con badges de caducidad, chips de ubicación, filtros y skeletons.
7. **ModalConfirm**: diálogos con confirmación para acciones críticas (eliminar, generar pedido).
8. **ImporterPage**: interfaz para subir Excel/CSV con scan OCR, validaciones y pasos de staging.
9. **CommandPalette**: overlay para acceder rápidamente a rutas y recursos internos.
10. **SkeletonGrid/Banners**: representaciones de loading/empty/error coherentes.

Todos los componentes repiten tokens de `theme.css` y se entregan en Tailwind con clase dark-mode (body.kitchen). 
