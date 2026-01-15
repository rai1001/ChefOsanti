# Acceptance Criteria (UI Redesign)

## Visual
- Todo color/borde/sombra/radio sale de tokens (`theme.css`/Tailwind); cero hex sueltos.
- Jerarquia tipografica uniforme (H1 32-36, labels uppercase 11-12, body 14); glass y gradientes iguales a referencia.
- Tablas densas legibles con header sticky, hover y alineacion numerica; badges semanticos consistentes.
- Hover/focus/active presentes en buttons/inputs; glow suave en CTAs primarios.

## UX
- Search global Ctrl/Cmd+K visible y funcional (o placeholder realista si backend falta).
- Selector de sucursal persistente en AppShell y reflejado en filtros/pantallas; badge de sucursal en filas criticas.
- Acciones criticas con confirm dialog contextual (item + sucursal); estados loading/empty/error en listas.
- Kitchen Mode aumenta contraste y targets (48px) sin romper layout; toggle accesible en topbar.
- Densidad conmutables (compact/comfortable) afectan tablas/controles sin romper alineacion.

## Tech
- Componentes reusables (`modules/shared/ui` y `ui` base) sin estilos duplicados; AppShell unico.
- Virtualizacion en grids grandes (scheduling, tablas >200 filas) o, si no viable, dejar nota tecnica.
- Charts envueltos en ChartCard; si libreria no esta disponible, dejar placeholder estilado y TODO explicito.
- Performance razonable: sin renders masivos bloqueantes; uso de skeletons para evitar layout shift.
