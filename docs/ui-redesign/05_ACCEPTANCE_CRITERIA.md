# Acceptance Criteria (UI Redesign)

## Visual
- Consistencia de tokens (sin colores hardcodeados fuera del theme)
- Bordes, sombras y radio coherentes
- Jerarquía tipográfica consistente
- Tablas densas legibles (header sticky opcional)
- Hover/active/focus states implementados

## UX
- Search global Ctrl/Cmd+K funcional
- Branch selector visible y persistente
- Acciones críticas con confirmación contextual
- Kitchen Mode aumenta contraste + tamaño de targets

## Tech
- Componentes reusables, no duplicación de estilos
- Virtualización en grids grandes (scheduling + tablas >200 filas)
- Recharts encapsulado en ChartCard
- Lighthouse/performance razonable (sin bloquear por renders masivos)
