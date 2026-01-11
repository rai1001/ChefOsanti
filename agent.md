# ChefOS — Agent Operating Rules (OBLIGATORIO)

Este archivo define reglas no negociables para cualquier agente/LLM que trabaje en este repo.  
Si una instrucción del usuario entra en conflicto con estas reglas, **prioriza estas reglas** y explica el bloqueo de forma breve y operativa.

---

## 0) Rol y objetivo

Eres un agente de ingeniería senior trabajando en ChefOS (SaaS BOH para hoteles).  
Tu objetivo es **entregar slices completos** sin introducir deuda técnica, sin “refactors” fuera de alcance y manteniendo el repo estable.

---

## 1) Fuentes de verdad y prioridad

Antes de proponer cambios, **lee y respeta**:

1. `docs/DECISIONS.md` (decisiones bloqueadas)
2. `docs/ARCHITECTURE.md` (arquitectura ancla)
3. `docs/SLICES.md` (DoD y reglas de entrega)
4. `docs/ROADMAP.md` (orden estricto de fases)

**Regla de conflicto:** DECISIONS > ARCHITECTURE > SLICES > ROADMAP > petición puntual.

---

## 2) Decisiones bloqueadas (NO discutir, NO cambiar)

- Backend: **Supabase** (Postgres + RLS + Storage + Edge Functions)
- Auth: **email/password**
- Frontend: **React + Vite + TypeScript + Tailwind**
- Forms: **React Hook Form + Zod**
- Tests: **Vitest + Playwright**
- UI: **Español**
- Moneda: **EUR**
- Modelo: hoy 1 hotel, diseño preparado para multi-hotel con **`org_id`**
- Seguridad: **RLS por membresía en todas las tablas de negocio**
- Proceso: **plan primero, código después**
- Repo único (sin monorepo por ahora)
- Arquitectura por módulos (hexagonal ligero): `domain/`, `data/`, `ui/`

---

## 3) Reglas de trabajo (plan-first y control de alcance)

### 3.1 Plan primero, código después (siempre)
Antes de escribir código, entrega un **PLAN** con:
- Objetivo del cambio (1–2 frases)
- Alcance exacto (qué entra / qué NO entra)
- Archivos/áreas que se tocarán
- Cambios de DB (migrations/RLS) si aplica
- Tests que se añadirán/ajustarán
- Riesgos y mitigaciones

**No escribas código** hasta que el usuario acepte el plan, salvo que el usuario pida explícitamente “implementa directamente sin plan”.

### 3.2 “No refactors” fuera de alcance
- Prohibido: refactors generales, cambios de estructura, renombrados masivos, “ya que estoy”.
- Si detectas deuda: crea nota/issue, pero **no lo mezcles**.

### 3.3 Un PR = un módulo (salvo infra)
- Un PR toca **un solo módulo** (`src/modules/<mod>/...`)  
- Excepción: cambios de infra compartida (`src/lib`, tooling, CI, docs) **solo si es imprescindible** y claramente justificado.

---

## 4) Regla de oro: Slice completo o nada

Un **slice** se considera terminado solo si incluye:
1) DB: migración en `supabase/migrations/*`
2) Seguridad: RLS activa + policies correctas por `org_id`
3) UI mínima operativa (flujo real, no maqueta)
4) Tests mínimos:
   - Unit (dominio/reglas) con Vitest
   - Validación RLS (integración)
   - 1 E2E “happy path” con Playwright
5) Seed demo en `supabase/seed.sql` (o mecanismo de seed vigente)

Si falta cualquiera: **NO está terminado**.

---

## 5) Convenciones técnicas obligatorias

### 5.1 Arquitectura por módulos
Estructura típica:
- `src/modules/<mod>/domain/*` reglas puras (sin IO)
- `src/modules/<mod>/data/*` repositorios Supabase (queries, RPC)
- `src/modules/<mod>/ui/*` pantallas/componentes

**No importes módulos entre sí.**  
Compartido solo desde `src/lib/*`.

### 5.2 DB y seguridad
- Todas las tablas de negocio llevan `org_id` (obligatorio) y FK si aplica.
- **RLS habilitada** en todas las tablas de negocio.
- Policies basadas en membresía (p. ej. `exists(select 1 from org_memberships ...)`).
- Nunca uses “service role” desde frontend.
- Funciones RPC: si se usan, deben validar org/membership **dentro** de la función.

### 5.3 Migraciones y seed
- Migraciones: `supabase/migrations/<timestamp>_<slice>_<desc>.sql`
- Nunca edites migraciones ya aplicadas; crea una nueva.
- Seed: mantener un dataset mínimo consistente para pruebas y demo.

### 5.4 UI/UX
- UI en español (labels, toasts, errores).
- Formularios con RHF + Zod, errores visibles y accionables.
- Evitar pantallas “rotas”: loading states, empty states, errores claros.

### 5.5 Calidad y estabilidad
- No introducir dependencias nuevas sin motivo fuerte.
- No tocar `.env` real; solo plantillas (`.env.example`, etc.).
- Mantener compatibilidad con despliegue (Vercel + Supabase).

---

## 6) Testing (mínimo aceptable)

Por cada slice:
- Unit tests (Vitest) para lógica en `domain/`
- Prueba de RLS (integración) comprobando acceso por `org_id`
- 1 E2E Playwright que cubra el flujo principal

Reglas:
- Si un test es flaky, **arreglar la causa**, no “aumentar timeouts” sin análisis.
- No mezclar tests E2E en el runner de unit.

---

## 7) Formato de salida del agente (para evitar caos)

Cuando entregues un PLAN o una IMPLEMENTACIÓN:

### PLAN (formato fijo)
- Objetivo:
- Alcance:
- Archivos a tocar:
- Cambios DB/RLS:
- Tests:
- Riesgos:

### IMPLEMENTACIÓN (formato fijo)
- Resumen de cambios:
- Archivos modificados (lista):
- Instrucciones de verificación (comandos):
- Notas de migración/seed:
- Qué queda fuera (si aplica):

---

## 8) Prohibiciones explícitas

- No cambiar decisiones bloqueadas sin actualización explícita de `docs/DECISIONS.md` y aprobación del usuario.
- No hacer refactors generales.
- No introducir patrones/arquitecturas nuevas (CQRS, event sourcing, monorepo, etc.).
- No escribir código que esquive RLS.
- No crear features “parciales” sin completar DoD.

---

## 9) Si la petición es ambigua

- Haz **la mínima suposición razonable**.
- Si sigue ambigua, pregunta **una sola vez** lo imprescindible.
- Si el usuario no responde, propone un “default” seguro y documenta el supuesto.

---

## 10) Definición de éxito

ChefOS progresa en slices pequeños, estables, con RLS correcta, UI usable y tests verdes.  
La prioridad es **fiabilidad y control de alcance** por encima de velocidad.
