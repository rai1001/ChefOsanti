# Inventario de UI (ChefOS)

## Autenticación
- Ruta/pantalla: `/login`
- Objetivo: iniciar sesión Supabase.
- Componentes: formulario email/pass, botones submit.
- Problemas: estados de error poco visibles; foco/focus-ring mínimo; copy técnico (“Inicia sesión”) sin ayuda; sin enlace a selección de org/hotel tras login. Severidad S3.
- Propuesta: ErrorBanner claro, hints de credenciales demo, focus visible, CTA a soporte.

## Layout base / Navegación
- Rutas: layout general (AppLayout), sidebar/menu principal.
- Objetivo: navegar entre módulos.
- Componentes: header, breadcrumbs mínimos, sidebar simple.
- Problemas: jerarquía visual débil (títulos pequeños), falta de breadcrumbs, acciones flotando sin PageHeader; densidad inconsistente. S2.
- Propuesta: PageHeader reutilizable (título/subtítulo/acciones), consistencia de paddings; badges de estado en encabezados.

## Dashboard
- Ruta: `/dashboard`
- Objetivo: KPIs y briefs diarios.
- Componentes: widgets, calendar/briefs.
- Problemas: carga sin skeleton; estados de error no manejados; copy mixto ES/EN. S3.
- Propuesta: skeleton de tarjetas, ErrorBanner, traducir copy.

## Eventos
- Rutas: listado eventos, detalle evento, servicios (service cards), modales de menú/overrides.
- Objetivo: gestionar servicios, necesidades, compras.
- Componentes: ServiceMenuCard, DraftOrdersModal, OcrReviewModal, etc.
- Problemas: muchos modales densos sin secciones ni ayudas; botones estrechos; warnings de mapping/alias sin acciones claras; estados de carga dispersos. S2.
- Propuesta: PageHeader con acciones primarias, botones 44px, tooltips en conceptos (alias, pack/rounding), Empty/Error states en listas de servicios.

## Compras (Purchasing)
- Rutas: proveedores, supplier detail, items, pedidos (purchase_orders), borradores de evento (event_purchase_orders).
- Objetivo: gestionar proveedores, alias, pedidos.
- Componentes: tablas, formularios, importers.
- Problemas: tablas sin filtros/orden; falta confirmaciones para acciones destructivas; error messages genéricos; densidad irregular; loading global. S2.
- Propuesta: DataTable patrón con filas compactas y acciones alineadas; ConfirmDialog reutilizable; inline errors en formularios; skeleton en tablas.

## Importador
- Ruta: importer page.
- Objetivo: importar CSV/Excel.
- Componentes: UniversalImporter modal.
- Problemas: pasos poco claros, mapping inputs sin help text; acciones “Validar Datos”/“Confirmar” sin contexto; estados de error no persisten. S3.
- Propuesta: inline steps/badges, tooltips, mensajes persistentes, botones con iconos de estado.

## Producción
- Rutas: production plan, tasks, global production.
- Objetivo: planificar tareas.
- Componentes: ProductionPlanView, TaskForm, TaskCard.
- Problemas: tablas sin indicadores de progreso; falta filtros rápidos; botones pequeños. S3.
- Propuesta: chips de estado, filtros predefinidos, botones 44px, skeleton.

## Importer / Inventory
- Rutas: inventory/stock (base en ingredients/stock_levels).
- Objetivo: visualizar niveles de stock (incipiente).
- Problemas: sin UI dedicada; dependerá de listas de suppliers/items. S4.
- Propuesta: tablero simple con stock por hotel y reservas (nuevo).

## Staff
- Rutas: staff list/detail.
- Problemas: sin estados vacíos claros; formularios sin ayuda. S3.
- Propuesta: EmptyState con CTA, FormField estándar.

## Scheduling
- Rutas: scheduling/roster.
- Problemas: tablas densas sin hover ni focus; falta legendas de turnos; botones pequeños. S2.
- Propuesta: DataList responsiva, badges de turnos, botones accesibles.

## Reporting
- Ruta: reporting dashboard/generación de informes.
- Problemas: forms sin feedback de envío; listas sin skeleton; errores genéricos. S3.
- Propuesta: botones con loading, ErrorBanner, skeletons.

## Waste
- Ruta: waste page.
- Problemas: tablas sin filtros, estados vacíos pobres. S3.
- Propuesta: filtros rápidos, EmptyState con CTA crear.

## Shared components
- Botones: estilos heterogéneos (borde vs sólido). Falta sistema de variantes. S2.
- FormField: existe pero no se usa consistente.
- EmptyState: presente pero con copy genérico.
- Toast/Error: múltiples patrones (ErrorMessage, Toast, alertas). S2.
- Skeleton: inexistente.
