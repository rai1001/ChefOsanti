# Template de slice

## Metadatos
- Nombre: `<Slice>`
- Módulo(s): `<modulo>`
- Responsable / fecha: `<quien> / YYYY-MM-DD`
- Estado: Propuesto | En curso | Hecho

## Alcance
- Objetivo usuario/negocio.
- Suposiciones y límites (no mezclar módulos).

## Diseño
- Modelos y relaciones nuevas/ajustadas.
- RLS: políticas por tabla (lectura/escritura) y claims usados.
- UI: pantallas/componentes nuevos, rutas, estados vacíos/errores.

## Plan (checklist)
- [ ] Migración creada y aplicada.
- [ ] RLS habilitada y políticas definidas.
- [ ] Seed idempotente actualizado.
- [ ] Adaptadores `data` y tipos `domain`.
- [ ] UI mínima funcional en `ui`.
- [ ] Tests DB (pgTAP) y unit/integration/e2e según aplique.
- [ ] Documentado en DECISIONS/ROADMAP si corresponde.

## DoD slice
- Comandos pasan: `npx supabase db reset`, `npx supabase test db`, `pnpm test`, `pnpm exec playwright test`.
- RLS verificada por tests.
- Seeds no rompen idempotencia.
- Sin deuda de refactor cruzando módulos.
