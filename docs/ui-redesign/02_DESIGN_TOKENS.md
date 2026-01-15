# Design Tokens (ChefOS)

## Paleta base (conceptual)
- Background: #0b1220 a #0f172a (gradiente suave)
- Surface/Card: rgba(255,255,255,0.03) - 0.06 con blur
- Border: rgba(148,163,184,0.12) (muy fino)
- Text primary: #e5e7eb
- Text secondary: #94a3b8
- Accent: cyan/teal + azul (acciones primarias)
- Critical: rojo
- Warning: ámbar
- Success: verde

## Shadows
- card: 0 12px 50px rgba(0,0,0,0.55)
- soft: 0 6px 24px rgba(0,0,0,0.35)

## Radius
- Card: 16px-20px (2xl)
- Inputs: 12px-14px
- Badges: 10px-12px

## Tailwind implementation
- Usar CSS variables para colores (recomendado):
  --bg, --surface, --border, --text, --muted, --accent, --danger, --warning, --success

Kitchen Mode:
- variables alternas: --text más brillante, --border más fuerte, fondos menos transparentes
