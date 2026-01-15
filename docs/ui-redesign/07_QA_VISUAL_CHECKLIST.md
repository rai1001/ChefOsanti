# QA Visual Checklist

## Tokens y surfaces
- [ ] Sin hex hardcodeados (solo via tokens/theme).
- [ ] Bordes y sombras estandar en cards/panels/tablas; blur consistente (panel 28px, card 18px).
- [ ] Gradiente de fondo activo y sin parches planos.
- [ ] Radius coherente (cards 16-20px, inputs 12px).

## Tipografia
- [ ] H1 32-36 semibold; labels tabla 11-12 uppercase; body 14.
- [ ] Secondary text en muted, no grises aleatorios.
- [ ] Jerarquia clara en PageHeader (etiqueta + titulo + subtitulo).

## Estados e interaccion
- [ ] Hover en filas/celdas y cards; focus visible en inputs/buttons.
- [ ] Loading skeletons presentes donde la data tarda; empty states con mensaje + CTA.
- [ ] Confirm dialog en acciones criticas (dispose/prioritize/approve/reject).
- [ ] Sticky header en tablas largas; alineacion numerica a la derecha.

## Kitchen Mode / Densidad
- [ ] Toggle kitchen visible; targets 48px; texto mas brillante y bordes mas fuertes.
- [ ] Toggle de densidad afecta alturas de filas/controles sin romper alineacion.

## Multi-branch / Shell
- [ ] Sucursal activa visible en topbar y filtros; badge de sucursal en filas criticas.
- [ ] Search global Ctrl/Cmd+K visible; navigation coherente en sidebar/topbar responsive.
