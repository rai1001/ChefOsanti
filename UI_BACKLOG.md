# UI Backlog (priorizado)

## Top 10 Quick Wins (1–2h)
1) PageHeader reutilizable (título/subtítulo/acciones) y aplicarlo a listas/detalles clave (event orders, suppliers). Impacto: jerarquía y coherencia. Riesgo bajo.
2) ErrorBanner y InlineError estandarizados en formularios/modales (login, DraftOrdersModal). Impacto: claridad de fallos. Riesgo bajo.
3) Skeletons básicos para tablas/listas (event orders, suppliers). Impacto: evita layout shift. Riesgo bajo.
4) Botones 44px con focus-ring consistente + variantes primario/secundario/destructivo. Impacto: accesibilidad BOH. Riesgo medio-bajo.
5) EmptyState con CTA claros en listas vacías (staff, suppliers, event orders). Impacto: orientación. Riesgo bajo.
6) Tooltips/help en campos técnicos (rounding rule, pack size, alias). Impacto: reduce errores. Riesgo bajo.
7) ConfirmDialog para acciones destructivas (borrado de líneas/órdenes) reutilizable. Impacto: evita errores. Riesgo medio.
8) Copys de acciones en español orientado a verbo (“Generar borradores”, “Recalcular compras”, “Reservar stock”). Impacto: claridad. Riesgo bajo.
9) Estados de carga local en botones (loading spinner en “Generar pedidos”, “Reservar”). Impacto: feedback. Riesgo bajo.
10) Badge de conflicto/shortage visible en tablas de compras/stock. Impacto: prioridad operativa. Riesgo bajo.

## Mejoras estructurales (1–3 días)
1) Patrones DataTable/DataList responsivos con cabecera fija, acciones alineadas y filtros/búsqueda comunes (suppliers, orders, staff). Riesgo medio.
2) Sistema de tokens (spacing, tipografía, radios, sombras) centralizado en CSS variables/Tailwind config para coherencia global. Riesgo medio.
3) Biblioteca de componentes base (PageHeader, ErrorBanner, Skeleton, ConfirmDialog, FormField) y migración progresiva de pantallas críticas. Riesgo medio.
4) Navegación/breadcrumbs en AppLayout con selección visible de hotel/org y aviso si falta selección. Riesgo medio.
5) Flujo de formularios con validación inline + resumen de errores para envíos fallidos (reporting, suppliers, staff). Riesgo medio.
6) Modo “operativo” compacto en tablas (densidad controlada) con toggle compacto/normal. Riesgo medio.

## Mejoras futuras (post-MVP)
1) Tema visual refinado (dark/light) con contraste garantizado.
2) Virtualización para tablas grandes (inventario, suppliers).
3) Biblioteca de iconos consistente y set de microinteracciones (transiciones suaves, estado guardado).
4) Guía de estilo escrita (Figma/MD) con ejemplos de layout y patrones de flujo.
5) Automatizar smoke UI con Playwright capturando screenshots principales para regresiones visuales.
