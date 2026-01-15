# Design Tokens (ChefOS)

Base: dark glass premium, tipografia Manrope, densidad alta. Todos los colores salen de variables CSS ya definidas en `src/styles/theme.css` y mapeadas en Tailwind.

## Colores (RGB sin hex sueltos)
- --bg: 11 18 32 (fondo base) | --bg-soft: 15 23 42 (degradado superior).
- --surface: 17 27 48 (card glass) | --surface-2: 24 36 59 | --surface-3: 30 44 72.
- --border: 148 163 184 (usar con alpha 0.12-0.2).
- --text: 226 232 240 | --muted: 148 163 184.
- Accents: --accent 34 211 238 | --accent-strong 14 165 233 | --accent-alt 59 130 246.
- Semanticos: --success 34 197 94 | --warning 251 146 60 | --danger 248 113 113.
- Glass helper: --glass 255 255 255 (solo para overlays ligeros).

## Surfaces y blur
- Panel: fondo `rgb(var(--surface)/0.45)` + borde `rgb(var(--border)/0.16)` + blur 28px.
- Card: fondo `rgb(var(--surface)/0.35)` + borde `rgb(var(--border)/0.12)` + blur 18px.
- Hover: subir borde a `rgb(var(--accent)/0.3)` y desplazar -1px.
- Gradiente base body: radial accent + radial alt + linear `--bg-soft -> --bg` (ver `index.css`).

## Shadows
- Soft: `0 12px 36px rgba(3,7,18,0.35)`.
- Card: `0 24px 60px rgba(3,7,18,0.55)`.
- CTA glow: `0 10px 24px rgb(var(--accent)/0.25)`.

## Radius y espaciado
- --radius-sm 12px (inputs), --radius-md 16px, --radius-lg 20px (cards).
- Badges: 999px (pill) con padding 4px 8px.
- Spacing base: --ds-spacing-{1..6} = 4/8/12/16/24/32px.
- Controles: --ds-control-height 42px (48px en kitchen/comfortable).
- Filas tabla: --ds-table-row-y 10px (14px en kitchen/comfortable).

## Tipografia
- --font-sans/--font-display: Manrope 400-800.
- H1: 32-36px, semibold; H2: 20-22px; body: 14px, muted 400; labels tabla 11-12px uppercase tracking.

## Estados y bordes
- Focus inputs: borde accent + halo `rgb(var(--accent)/0.2)`.
- Badges: success/warn/error/info usan fondo semantico 0.15 + borde 0.35.
- Tablas: header sticky con fondo glass 0.03 y blur 6px; hover fila `rgb(var(--glass)/0.04)`.

## Kitchen Mode (clase body.kitchen)
- Textos mas brillantes (--text 241 245 249), borde mas fuerte (--border 203 213 225), superficies menos transparentes (--surface 22 34 57).
- Accent reforzado (--accent 56 189 248), warning 251 191 36.
- Controles mas altos (48px) y padding de filas +4px; mantener radios y sombras.
