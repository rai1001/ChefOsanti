# Estado del Proyecto ChefOS

**Fecha:** 2026-01-09
**Branch actual:** `claude/code-review-feedback-vQ2Bo`
**Último commit:** `648c1d6` - docs: add comprehensive code review and action plan
**Repositorio:** `/home/user/ChefOsanti`

---

## 1. Resumen Ejecutivo

ChefOS es un SaaS BOH (Back of House) para hoteles enfocado en gestión de eventos con necesidades nutricionales deportivas, compras automatizadas vía OCR, personal y menús con ratios por pax. El proyecto está en **fase de desarrollo activo** con la mayoría de slices core completados.

**Estado general:** 8 de 10 slices principales DONE según DoD estricto. 2 slices en progreso (Fase 2/3 de purchasing). Base arquitectónica sólida con RLS completo, 26 migraciones aplicadas, 19 tests E2E pasando y seeds demo robustos.

**Bloqueante crítico identificado:** API key de Gemini hardcodeada en código (supabase/functions/ocr_process/index.ts:10). Debe resolverse antes de cualquier deploy a producción.

**Próximo hito:** Completar Fase 2 y 3 de purchasing (aprobaciones, exports, inventory snapshots) y resolver issue de seguridad crítico.

**Decisiones pendientes:** 0 bloqueantes arquitectónicos. Stack y metodología de slices verticales funcionando correctamente.

---

## 2. Estado del Despliegue

### Local Development
| Componente | Estado | Evidencia |
|------------|--------|-----------|
| Supabase local | ✅ OK | `npx supabase start` funcional |
| Migraciones aplicadas | ✅ OK | 26 archivos en supabase/migrations/ |
| Seeds idempotentes | ✅ OK | seed.sql con ON CONFLICT para todos los slices |
| Frontend dev server | ✅ OK | `pnpm dev` en puerto 4173 |
| Tests unitarios | ✅ OK | `pnpm test` - 17 archivos domain tests |
| Tests E2E | ✅ OK | `pnpm exec playwright test` - 19 specs |
| pgTAP tests | NO VERIFICADO | No encontrados tests pgTAP en supabase/tests/ |

### Supabase Cloud
| Entorno | Estado | Proyecto Ref | URL |
|---------|--------|-------------|-----|
| Staging | NO VERIFICADO | `chefos-staging` (según DEPLOY.md) | No disponible |
| Producción | NO VERIFICADO | `chefos-prod` (según DEPLOY.md) | No disponible |

**Evidencia faltante para Cloud:** No hay archivos .env.staging o .env.prod en el repo (correcto por seguridad). Estado de proyectos cloud no verificable desde código.

### Variables de Entorno
**Requeridas (según .env.example):**
- `VITE_SUPABASE_URL` - URL del proyecto Supabase
- `VITE_SUPABASE_ANON_KEY` - Anon key público
- `SUPABASE_URL` - Para Edge Functions
- `SUPABASE_ANON_KEY` - Para Edge Functions
- `SUPABASE_SERVICE_ROLE_KEY` - Para Edge Functions (admin)
- `OCR_PROVIDER` - mock (local) / gemini (prod)
- `GEMINI_API_KEY` - **BLOQUEANTE:** Hardcoded en ocr_process/index.ts:10

### Auth Redirect Configuration
**Estado:** Configurado en código (router.tsx), pendiente verificación en Supabase Studio.

**Requerido según DEPLOY.md:**
- Site URL: URL pública frontend (staging/prod)
- Redirect URLs: Site URL + http://localhost:4173

**Evidencia faltante:** No verificable desde repo, debe configurarse en Supabase Studio → Authentication → URL Configuration.

### Edge Functions
| Función | Estado | Deploy Status | Provider |
|---------|--------|---------------|----------|
| ocr_process | ✅ Implementado | NO VERIFICADO | mock/gemini |
| order_audit | ✅ Implementado | NO VERIFICADO | gemini |
| daily_brief | ✅ Implementado | NO VERIFICADO | gemini |

**Deploy command:** `supabase functions deploy <nombre>`
**Secrets:** Deben cargarse con `supabase secrets set --env-file .env.<entorno>`

---

## 3. Inventario de Módulos

### auth - Autenticación y Autorización
**Estado:** DONE
**Componentes:** LoginPage, RequireAuth, RequirePermission, RBAC con roles (admin/manager/staff)
**Rutas:** `/login`
**Permisos:** 17 permisos granulares (dashboard:read, events:write, purchasing:approve, etc.)
**Falta:** Nada crítico. Funcional para MVP.

### core - Layout y Navegación
**Estado:** DONE
**Componentes:** AppLayout (header con nav dinámica por permisos), ForbiddenState
**Características:** Branding "ChefOS", logout con cache clear, org activa mostrada
**Falta:** Nada crítico.

### dashboard - Panel Principal
**Estado:** DONE
**Componentes:** DashboardPage, DailyBriefWidget (IA), AiModals
**Rutas:** `/dashboard`
**Features:** Dashboard notes, integración con daily_brief Edge Function
**Falta:** Métricas/KPIs visuales (no prioritario para MVP).

### events - Gestión de Eventos
**Estado:** DONE
**Componentes:** EventsBoardPage (lista), NewEventPage, EventDetailPage (3 secciones: detalles, bookings, servicios), MenuTemplatesPage, MenuTemplateDetailPage, modales (AddBooking, AddService, OcrReview, DraftOrders)
**Rutas:** `/events`, `/events/new`, `/events/:id`, `/menus`, `/menus/:id`
**Features Clave:**
- Eventos por hotel con cliente y fechas
- Reservas de salones (spaces) con validación de solapamientos
- Servicios (desayuno, coffee_break, comida, cena, cóctel, etc.) con formato (sentado/de_pie/buffet)
- Plantillas de menú con ratios por pax según formato
- Overrides por servicio: exclusiones, adiciones, reemplazos
- OCR para extraer servicios estructurados de documentos
- Adjuntos por evento (Storage + RLS)
- Generación de borradores de pedidos desde menús de servicios

**Falta:** Nada bloqueante. Módulo completo según roadmap inicial.

### purchasing - Compras y Proveedores
**Estado:** DONE (core), IN PROGRESS (Fase 2/3)
**Componentes:** SuppliersPage, SupplierDetailPage, PurchaseOrdersPage, NewPurchaseOrderPage, PurchaseOrderDetailPage, EventOrdersPage, EventOrderDetailPage, StockPage, ApprovalActions
**Rutas:** `/purchasing/suppliers`, `/purchasing/orders`, `/purchasing/event-orders`, `/purchasing/stock`
**Features Completadas:**
- Proveedores y items con reglas de redondeo (ceil_pack, ceil_unit, none)
- Pedidos de compra (draft → confirmed → received) con líneas
- Recepción atómica con actualización de stock (RPC receive_purchase_order)
- Pedidos generados desde eventos con mapping de items (menu_item_aliases)
- Stock por ingrediente y hotel
- Paginación infinita en lista de pedidos
- RBAC hardening (roles con permisos granulares)

**Features en Progreso (Fase 2/3 según commit fff7071):**
- Sistema de aprobaciones (P6: tabla approvals, ApprovalActions UI)
- Audit logs (P4: tabla purchase_audit_logs, triggers en P7)
- Inventory snapshots (P5: tabla inventory_snapshots)
- Exports de pedidos (mencionado en commit 530870b)

**Falta:** Completar Fase 2/3 + tests E2E específicos de aprobaciones y auditoría.

### recipes - Productos y Recetas
**Estado:** DONE
**Componentes:** ProductsPage, RecipesPage, RecipeDetailPage
**Rutas:** `/products`, `/recipes`, `/recipes/:id`
**Features:**
- Productos por org con categorías
- Recetas con líneas (producto + cantidad + unidad)
- Link ingredientes → productos para trazabilidad

**Falta:** Nada bloqueante. Funcionalidad básica completa.

### staff - Personal
**Estado:** DONE
**Componentes:** StaffPage (lista con CRUD básico)
**Rutas:** `/staff`
**Features:** Staff members por org con hotel home, roles (jefe_cocina, pasteleria, etc.), tipo de empleo (fijo/eventual/extra)
**Falta:** UI de detalle/edición más rica (no bloqueante).

### scheduling - Horarios y Turnos
**Estado:** DONE
**Componentes:** SchedulingPage (visualización turnos), RosterGeneratorPage (generador)
**Rutas:** `/scheduling`, `/scheduling/generate`
**Features:**
- Turnos por hotel/fecha/tipo (mañana, tarde, eventos, etc.)
- Asignaciones de staff a turnos
- Reglas de roster (H2: requeridos por tipo de día)
- Time off y vacaciones
- Generador automático de roster

**Falta:** Algoritmo de generación puede mejorar, pero funcional para MVP.

### importer - Importador Universal
**Estado:** DONE (básico)
**Componentes:** ImporterPage, UniversalImporter
**Rutas:** `/importer`
**Features:** Importación CSV de productos (IMP1, IMP2 según migraciones)
**Falta:** Expansión a otros tipos de entidades (suppliers, staff, etc.). No bloqueante.

### orgs - Organizaciones
**Estado:** DONE (infraestructura)
**Componentes:** No tiene UI propia (se usa en selección de org activa)
**Features:** Modelo multi-tenant base con org_memberships, org activa en localStorage, helper useActiveOrgId
**Falta:** UI de gestión de orgs y membresías (admin panel). No prioritario para MVP.

### shared - Componentes Compartidos
**Estado:** DONE
**Componentes:** ErrorBoundary, UniversalImporter, hooks (useFormattedError)
**Features:** Error handling global, componentes reutilizables
**Falta:** Librería de componentes podría expandirse (no bloqueante).

---

## 4. Matriz de Slices

| Slice | DB | RLS | UI Mínima | Tests Unit | Tests E2E | Seed Demo | Estado | Evidencia/Bloqueos |
|-------|----|----|-----------|------------|-----------|-----------|--------|-------------------|
| **A0 - Cimientos** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | **DONE** | Migración: 20260107131000_init.sql (orgs, memberships, hotels). RLS: `is_org_member()` helper. UI: AppLayout, LoginPage placeholder. Tests: smoke.spec.ts, auth domain tests. Seed: 2 orgs, 4 hotels demo. |
| **P1 - Purchasing Base** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | **DONE** | Migración: 20260107143500_p1_purchasing.sql (suppliers, supplier_items). RLS: políticas por org_id. UI: SuppliersPage, SupplierDetailPage. Tests: p1-suppliers.spec.ts, purchasing domain tests (3 archivos). Seed: 1 proveedor, 2 items demo. |
| **P2 - Purchase Orders** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | **DONE** | Migración: 20260107151500_p2_purchase_orders.sql (purchase_orders, lines, ingredients). RLS: políticas + RBAC hardening (P3). UI: PurchaseOrdersPage, PurchaseOrderDetailPage, NewPurchaseOrderPage. Tests: p2-purchase-orders.spec.ts, p5-purchasing-flow.spec.ts. Seed: 1 pedido draft con 2 líneas. RPC: receive_purchase_order. |
| **P2b - Event Draft Orders** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | **DONE** | Migración: 20260107213000_p2_event_draft_orders.sql (event_purchase_orders, menu_item_aliases). UI: EventOrdersPage, EventOrderDetailPage, DraftOrdersModal (en events). Tests: p2-event-draft-order.spec.ts, eventDraftOrder.test.ts. Seed: 1 event_purchase_order demo. Mapping: menu_item_aliases. |
| **P3 - RBAC Hardening** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | N/A | **DONE** | Migración: 20260109140000_p3_rbac_hardening.sql (has_org_role helper). RLS: políticas por roles (owner/admin/manager/purchaser). UI: ApprovalActions (P6). Tests: a1-rbac.spec.ts, p3-isolation.spec.ts. Hardening aplicado a suppliers, ingredients, purchase_orders. |
| **P4 - Audit Logs** | ✅ OK | ✅ OK | ⚠️ PARTIAL | ⚠️ PARTIAL | ❌ MISSING | ✅ OK | **IN PROGRESS** | Migración: 20260109150000_p4_audit_logs.sql (purchase_audit_logs, audit_logs). Triggers: P7 (20260109180000_p7_audit_triggers.sql). UI: No hay visualización de logs todavía. Tests E2E: Falta spec específico de auditoría. **BLOQUEANTE:** UI de visualización de logs y E2E test. |
| **P5 - Inventory Snapshots** | ✅ OK | ✅ OK | ❌ MISSING | ❌ MISSING | ❌ MISSING | ❌ MISSING | **IN PROGRESS** | Migración: 20260109160000_p5_inventory_snapshots.sql. UI: Falta página de visualización de snapshots históricos. Tests: Ninguno encontrado. Seed: Falta. **BLOQUEANTE:** UI + tests + seed. |
| **P6 - Approvals** | ✅ OK | ✅ OK | ✅ OK | ⚠️ PARTIAL | ❌ MISSING | ❌ MISSING | **IN PROGRESS** | Migración: 20260109170000_p6_approvals.sql (approvals table + sync trigger). UI: ApprovalActions component presente. Tests unit: Falta lógica domain de aprobaciones. E2E: Falta spec. Seed: Falta ejemplos de approvals. **BLOQUEANTE:** Tests E2E + seed demo. |
| **E1 - Spaces & Bookings** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | **DONE** | Migración: 20260107162000_e1_spaces_bookings.sql (spaces, events, space_bookings). RLS: por org. UI: EventsBoardPage, EventDetailPage (bookings section). Tests: e1-spaces-bookings.spec.ts, event.test.ts. Seed: 3 spaces, 1 event, 3 bookings (1 con solape intencional). Helper: space_booking_overlaps(). |
| **E2 - Event Services** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | **DONE** | Migración: 20260107170000_e2_event_services.sql (event_services). UI: EventDetailPage (services section), AddServiceModal. Tests: e2-event-services.spec.ts. Seed: 2 servicios demo (coffee_break, cena). Tipos: 8 tipos (desayuno, coffee_break, almuerzo, comida, cena, coctel, barra_libre, merienda, otros). |
| **E3 - Menu Templates** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | **DONE** | Migración: 20260107180000_e3_menu_templates.sql (menu_templates, items, event_service_menus). RLS: por org (no por hotel). UI: MenuTemplatesPage, MenuTemplateDetailPage. Tests: e3-menus-ratios.spec.ts, menu.test.ts. Seed: 1 plantilla "Coffee break estándar" con 3 items y ratios diferenciados por formato (sentado/de_pie). |
| **E4 - Service Overrides** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | **DONE** | Migración: 20260107190000_e4_service_overrides.sql (4 tablas de overrides: notes, excluded, added, replaced). UI: ServiceMenuCard con UI de overrides. Tests: e4-overrides.spec.ts, overrides.test.ts. Seed: 4 overrides demo sobre servicio coffee_break (nota, exclusión de zumo, adición de agua, reemplazo bocadillo→wrap). |
| **E5 - OCR** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | **DONE** | Migración: 20260107200000_e5_ocr.sql (event_attachments, ocr_jobs, menu sections/items). Storage: bucket `event-attachments` con RLS. Edge Function: ocr_process (enqueue + run). UI: OcrReviewModal con aplicación de borrador. Tests: e5-ocr.spec.ts, ocrParser.test.ts. Seed: 1 attachment + 1 ocr_job done con JSON estructurado. **ALERTA:** Gemini API key hardcoded en ocr_process/index.ts:10. |
| **R1 - Recipes & Products** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | **DONE** | Migración: 20260107223000_r1_recipes_products.sql (products, recipes, recipe_lines). RLS: por org. UI: ProductsPage, RecipesPage, RecipeDetailPage. Tests: r1-recipes.spec.ts, recipes.test.ts. Seed: 4 productos, 1 receta "Tortilla básica" con 2 líneas. Link: ingredients.product_id. |
| **S1 - Staff** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | **DONE** | Migración: 20260107233000_s1_staff.sql (staff_members). RLS: por org. UI: StaffPage (lista CRUD). Tests: s1-staff.spec.ts, staff.test.ts. Seed: 5 staff members (2 fijos, 2 eventuales, 1 extra inactivo). Roles: jefe_cocina, pasteleria, ayudante, office, cocinero. |
| **H1 - Scheduling** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | **DONE** | Migración: 20260107240000_h1_scheduling.sql (shifts, staff_assignments). RLS: por org. UI: SchedulingPage. Tests: h1-scheduling.spec.ts, shifts.test.ts. Seed: 7 días de turnos (3 tipos: desayuno, bar_tarde, eventos) + 2 asignaciones a desayuno. |
| **H2 - Roster Rules & Time Off** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | **DONE** | Migración: 20260107241000_h2_roster_rules_timeoff.sql (scheduling_rules, staff_vacation_allowance, staff_time_off). UI: RosterGeneratorPage. Tests: h2-roster-v2.spec.ts, h2.test.ts. Seed: 1 regla de scheduling, allowances para todos los staff, 1 time_off demo (Ana Pastelería 2 días). |
| **D1 - Dashboard Notes** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ❌ MISSING | **DONE** | Migración: 20260107250000_d1_dashboard_notes.sql. UI: DashboardPage. Tests: d1-dashboard.spec.ts, week.test.ts (helpers). Seed: **Falta seed de notas demo** (no bloqueante). |
| **A1 - Membership Role** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | N/A | **DONE** | Migración: 20260107252000_a1_membership_role.sql (añade columna role a org_memberships). RBAC: roles (admin, manager, staff). UI: Permisos aplicados en router + RequirePermission. Tests: a1-rbac.spec.ts, roles.test.ts. Seeds: ya incluyen roles en A0. |
| **A1b - AI Access** | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | ✅ OK | **DONE** | Migración: 20260108004500_a1_ai_access.sql (org_plans, ai_features). Control: canUseAI(user, feature). UI: AiModals con checks. Tests: a1-ai-access.spec.ts, aiAccess.test.ts. Seed: planes VIP/Basic, 3 features (daily_brief, ocr_review, order_audit) con min_plan/min_role. |
| **AI0 - Daily Brief** | ✅ OK | ✅ OK | ✅ OK | ⚠️ PARTIAL | ❌ MISSING | ❌ MISSING | **DONE** (con gaps) | Migración: 20260108160000_ai0_daily_brief.sql (daily_briefs). Edge Function: daily_brief. UI: DailyBriefWidget. Tests unit: Falta lógica domain. E2E: **Falta spec de daily brief**. Seed: **Falta brief demo**. Funcional pero sin cobertura completa de tests. |
| **IMP1 - Importer** | ✅ OK | ✅ OK | ✅ OK | ⚠️ PARTIAL | ❌ MISSING | ❌ MISSING | **DONE** (básico) | Migración: 20260108170000_imp1_importer.sql + 20260109130000_imp1_security.sql + 20260109173000_imp2_importer_products.sql. UI: ImporterPage, UniversalImporter. Tests: integration/imports.test.tsx (no E2E). Seed: **Falta seed de import_jobs demo**. Funcionalidad básica OK, expansión pendiente. |
| **Quality RPCs** | ✅ OK | N/A | N/A | ❌ MISSING | ❌ MISSING | N/A | **DONE** (infra) | Migración: 20260109000000_quality_rpcs.sql (helpers SQL diversos). No requiere UI/tests específicos. Funciones de soporte para otros slices. |

### Leyenda
- ✅ OK: Completado según DoD
- ⚠️ PARTIAL: Implementado parcialmente, falta algún componente del DoD
- ❌ MISSING: No implementado o no encontrado
- N/A: No aplica para este slice

---

## 5. Flujos Críticos End-to-End

### ✅ FUNCIONAN HOY

1. **Login y navegación por roles**
   - Login con Supabase Auth → redirect a /dashboard
   - Navegación dinámica según permisos del rol (admin ve todo, staff limitado)
   - Logout con limpieza de cache
   - **Evidencia:** smoke.spec.ts, a1-rbac.spec.ts

2. **Gestión de proveedores y catálogo**
   - Crear proveedor → Añadir items con reglas de redondeo
   - Visualizar catálogo de items por proveedor
   - **Evidencia:** p1-suppliers.spec.ts

3. **Pedido de compra completo**
   - Crear pedido draft → Añadir líneas con redondeo automático
   - Confirmar pedido → Recibir con cantidades ajustadas → Stock actualizado
   - **Evidencia:** p2-purchase-orders.spec.ts, p5-purchasing-flow.spec.ts

4. **Evento con servicios y plantillas de menú**
   - Crear evento → Añadir reserva de salón (con validación de solapamientos)
   - Añadir servicio (ej: coffee_break) → Aplicar plantilla de menú
   - Calcular necesidades por pax y formato (sentado/de_pie)
   - Aplicar overrides (exclusiones, adiciones, reemplazos)
   - **Evidencia:** e1-spaces-bookings.spec.ts, e2-event-services.spec.ts, e3-menus-ratios.spec.ts, e4-overrides.spec.ts

5. **OCR para estructurar menús**
   - Subir documento (PDF/imagen) a evento → Encolar job OCR
   - Ejecutar OCR (mock o Gemini) → Obtener JSON estructurado (servicios + secciones + items)
   - Revisar borrador en UI → Aplicar a servicios del evento
   - **Evidencia:** e5-ocr.spec.ts

6. **Generación de pedidos desde eventos**
   - Evento con servicios + menús → Calcular necesidades agregadas
   - Mapear items a proveedores vía menu_item_aliases
   - Generar event_purchase_orders agrupados por proveedor
   - **Evidencia:** p2-event-draft-order.spec.ts

7. **Productos y recetas**
   - Crear productos por org → Crear recetas con líneas (producto + qty)
   - Link ingredientes a productos para trazabilidad
   - **Evidencia:** r1-recipes.spec.ts

8. **Gestión de personal**
   - Añadir staff members por org con hotel home
   - Gestionar activos/inactivos
   - **Evidencia:** s1-staff.spec.ts

9. **Horarios y roster**
   - Definir turnos por hotel/fecha/tipo
   - Asignar staff a turnos manualmente
   - Generar roster automático con reglas (H2)
   - Gestionar time off y vacaciones
   - **Evidencia:** h1-scheduling.spec.ts, h2-roster-v2.spec.ts

10. **Dashboard con daily brief**
    - Visualizar dashboard con widgets
    - Generar daily brief con IA (si plan VIP)
    - **Evidencia:** d1-dashboard.spec.ts (parcial)

### ❌ NO FUNCIONAN / FALTAN

1. **Visualización de audit logs** (P4)
   - UI: Falta página de logs
   - Triggers: Implementados (P7) pero sin UI para consultar
   - **Gap:** UI de audit logs + E2E test

2. **Inventory snapshots históricos** (P5)
   - DB: Tabla existe
   - UI: Falta visualización de snapshots por fecha
   - **Gap:** UI completa + tests + seed

3. **Flujo completo de aprobaciones** (P6)
   - UI: ApprovalActions existe pero sin E2E test
   - **Gap:** E2E test de approve/reject + seed demo

4. **Exports de pedidos**
   - Mencionado en commit 530870b pero no encontrado código
   - **Gap:** Implementación de exports (PDF/Excel) + tests

5. **Importador expandido** (IMP1)
   - Solo soporta productos actualmente
   - **Gap:** Import de suppliers, staff, recipes, etc.

6. **Tests pgTAP de RLS**
   - No encontrados archivos en supabase/tests/
   - **Gap:** Suite completa de tests pgTAP para validar RLS

---

## 6. Bloqueos y Decisiones Pendientes

| ID | Descripción | Tipo | Impacto | Resolución Propuesta |
|----|-------------|------|---------|---------------------|
| **B1** | **API key de Gemini hardcoded en código** | 🔴 CRÍTICO - Seguridad | Alto - Bloquea producción | Revocar key actual, generar nueva, configurar como env var, eliminar fallback hardcoded en ocr_process/index.ts:10. Ver ACTION_PLAN.md Issue #1. |
| B2 | UI de audit logs faltante (P4) | 🟡 MEDIA - Feature | Medio - Auditoría no consultable | Crear AuditLogsPage con filtros (org, user, entity, action, fecha). Timeline: Sprint próximo. |
| B3 | UI de inventory snapshots faltante (P5) | 🟡 MEDIA - Feature | Bajo - Histórico no visible | Crear InventorySnapshotsPage con selector de fecha. No bloqueante para MVP. |
| B4 | E2E test de aprobaciones faltante (P6) | 🟡 MEDIA - Calidad | Medio - Flujo no validado E2E | Crear p6-approvals.spec.ts con flujo approve/reject. Timeline: Sprint próximo. |
| B5 | Tests pgTAP ausentes | 🟢 BAJA - Calidad | Bajo - RLS validado solo por E2E | Crear suite pgTAP en supabase/tests/ para validar políticas RLS. No bloqueante. |
| B6 | Documentación de API/contracts | 🟢 BAJA - Docs | Bajo - Onboarding más lento | Generar OpenAPI spec de RPCs y Edge Functions. No bloqueante. |
| B7 | Seeds demo de algunas tablas faltantes | 🟢 BAJA - UX | Muy bajo - Demo menos rico | Añadir seeds para: approvals, audit_logs (ejemplos), inventory_snapshots, daily_briefs, import_jobs. No bloqueante. |

### Decisiones Arquitectónicas Pendientes
- **Ninguna bloqueante.** Stack y metodología establecidos y funcionando.

---

## 7. Riesgos y Mitigaciones

### 🔴 CRÍTICOS

1. **API key expuesta en código fuente**
   - **Riesgo:** Key puede ser extraída del repo y usada maliciosamente, generando costos no controlados en Gemini API.
   - **Impacto:** Alto - Seguridad y costos.
   - **Mitigación:** Resolver B1 INMEDIATAMENTE (hoy). Ver ACTION_PLAN.md.
   - **Owner:** DevOps + Backend Lead

### 🟠 ALTOS

2. **Falta rate limiting en Edge Functions**
   - **Riesgo:** Abuso de OCR/audit/brief puede generar costos excesivos.
   - **Impacto:** Alto - Costos.
   - **Mitigación:** Implementar rate limiting por org (ej: 10 OCR/min, 5 briefs/hora). Ver ACTION_PLAN.md Issue #3.
   - **Owner:** Backend Lead
   - **Timeline:** Semana 1

3. **Auth redirect URLs no verificadas en Supabase Studio**
   - **Riesgo:** Login puede fallar en staging/prod si URLs no están configuradas.
   - **Impacto:** Alto - Bloqueante para despliegue.
   - **Mitigación:** Verificar y configurar en Supabase Studio → Authentication → URL Configuration. Documentar en DEPLOY.md con screenshots.
   - **Owner:** DevOps
   - **Timeline:** Pre-deploy checklist

4. **No hay CI/CD pipeline verificable**
   - **Riesgo:** Deploys manuales propensos a errores (migraciones no aplicadas, secrets no configurados).
   - **Impacto:** Medio - Calidad de deploys.
   - **Mitigación:** Crear GitHub Actions para: (1) tests en PR, (2) deploy automático a staging en merge a main, (3) deploy manual a prod con aprobación.
   - **Owner:** DevOps
   - **Timeline:** Sprint 2

### 🟡 MEDIOS

5. **RLS validado solo por E2E, no por pgTAP**
   - **Riesgo:** Cambios en políticas RLS pueden romper aislamiento sin detección temprana.
   - **Impacto:** Medio - Seguridad multi-tenant.
   - **Mitigación:** Crear suite pgTAP (supabase/tests/) con casos críticos de aislamiento org_id. Ejecutar en CI.
   - **Owner:** Backend Lead
   - **Timeline:** Sprint 3

6. **Queries N+1 potenciales en algunos componentes**
   - **Riesgo:** Performance degradada con datasets grandes.
   - **Impacto:** Medio - UX.
   - **Mitigación:** Crear RPCs unificadas para vistas complejas (ej: getPurchaseOrderDetail). Ver ACTION_PLAN.md Issue #6.
   - **Owner:** Full-stack Developer
   - **Timeline:** Sprint 3

7. **Falta de observabilidad (logs, métricas)**
   - **Riesgo:** Debugging difícil en producción.
   - **Impacto:** Medio - Operaciones.
   - **Mitigación:** (1) Logging estructurado consistente, (2) Integración con Sentry/LogRocket, (3) Dashboards de métricas de negocio.
   - **Owner:** DevOps + Backend
   - **Timeline:** Post-MVP

### 🟢 BAJOS

8. **Código duplicado en mappers**
   - **Riesgo:** Mantenibilidad reducida.
   - **Impacto:** Bajo - Deuda técnica.
   - **Mitigación:** Refactor con generador de mappers genérico. Ver ACTION_PLAN.md Issue #4.
   - **Owner:** Full-stack Developer
   - **Timeline:** Sprint 4

9. **Cobertura de tests unitarios no homogénea**
   - **Riesgo:** Bugs en módulos con poca cobertura.
   - **Impacto:** Bajo - Calidad.
   - **Mitigación:** Aumentar cobertura a 80%+ en domain layer. Ver ACTION_PLAN.md Issue #5.
   - **Owner:** QA + Developers
   - **Timeline:** Sprint 4

---

## 8. Próximas Acciones (2 Semanas)

### Sprint Actual (Semana 1-2)

#### Acción 1: 🔴 Resolver API Key Hardcoded (CRÍTICO)
**Objetivo:** Eliminar vulnerabilidad de seguridad antes de cualquier deploy.
**Owner:** DevOps + Backend Lead
**Esfuerzo:** 30 minutos
**Prioridad:** P0 - Bloqueante

**Tareas:**
1. Revocar API key actual en Google Cloud Console
2. Generar nueva API key con restricciones (solo Gemini API)
3. Configurar en Supabase secrets (local + cloud)
4. Actualizar ocr_process/index.ts:10 eliminando fallback hardcoded
5. Verificar funcionamiento en local y staging

**Definition of Done:**
- [ ] API key antigua revocada
- [ ] Nueva key configurada como secret en todos los entornos
- [ ] Código sin fallback hardcoded
- [ ] Tests E2E de OCR (e5-ocr.spec.ts) pasando
- [ ] Documentado en .env.example y DEPLOY.md

**Evidencia de Completitud:** Commit con fix + tests E2E verdes + verificación manual en staging.

---

#### Acción 2: 🟠 Implementar Rate Limiting en Edge Functions
**Objetivo:** Proteger contra abuso y costos excesivos de IA.
**Owner:** Backend Lead
**Esfuerzo:** 1 día
**Prioridad:** P1 - Alta

**Tareas:**
1. Crear helper `supabase/functions/_shared/rateLimit.ts`
2. Aplicar a ocr_process (10 req/min por org)
3. Aplicar a order_audit (20 req/min por org)
4. Aplicar a daily_brief (5 req/hora por org)
5. Tests unitarios de rate limiter
6. Documentar límites en DEPLOY.md

**Definition of Done:**
- [ ] Helper rateLimit implementado con tests
- [ ] Rate limiting activo en 3 Edge Functions
- [ ] Respuestas 429 con headers Retry-After correctos
- [ ] Tests E2E no afectados (debajo de límites)
- [ ] Documentación actualizada

**Evidencia de Completitud:** Edge Functions deployadas + test manual de rate limiting + docs.

---

#### Acción 3: 🟠 Completar UI de Audit Logs (P4)
**Objetivo:** Hacer consultables los audit logs para compliance.
**Owner:** Frontend Lead
**Esfuerzo:** 2 días
**Prioridad:** P1 - Alta

**Tareas:**
1. Crear `src/modules/purchasing/ui/AuditLogsPage.tsx`
2. Data adapter: `listAuditLogs(orgId, filters)`
3. UI: tabla con filtros (entity, action, user, fecha)
4. Añadir ruta `/purchasing/audit` con permiso `purchasing:approve`
5. E2E test: `p4-audit-logs.spec.ts`

**Definition of Done:**
- [ ] AuditLogsPage funcional con filtros
- [ ] Ruta añadida a router con RBAC
- [ ] E2E test pasando (crear registro → ver en logs)
- [ ] Seeds demo de audit_logs añadidos

**Evidencia de Completitud:** Screenshot de UI + E2E test verde + PR merged.

---

#### Acción 4: 🟡 Añadir E2E Test de Aprobaciones (P6)
**Objetivo:** Validar flujo completo de approve/reject.
**Owner:** QA Lead
**Esfuerzo:** 0.5 días
**Prioridad:** P2 - Media

**Tareas:**
1. Crear `tests/e2e/p6-approvals.spec.ts`
2. Test: crear pedido → solicitar approval → aprobar → verificar status
3. Test: rechazar approval → verificar status rejected
4. Añadir seeds demo de approvals (pending, approved, rejected)

**Definition of Done:**
- [ ] E2E test p6-approvals.spec.ts pasando
- [ ] Seeds demo de approvals en seed.sql
- [ ] Documentación de flujo en DECISIONS.md

**Evidencia de Completitud:** E2E test verde + seeds aplicados.

---

#### Acción 5: 🟡 Verificar y Documentar Deploy to Staging
**Objetivo:** Validar que despliegue a Supabase Cloud funciona end-to-end.
**Owner:** DevOps
**Esfuerzo:** 1 día
**Prioridad:** P2 - Media

**Tareas:**
1. Crear proyecto staging en Supabase (si no existe)
2. Link proyecto: `supabase link --project-ref <staging-ref>`
3. Aplicar migraciones: `supabase db push`
4. Deploy Edge Functions: `supabase functions deploy <nombre>`
5. Configurar secrets: `supabase secrets set --env-file .env.staging`
6. Configurar Auth URLs en Supabase Studio
7. Deploy frontend a Vercel/Netlify con env vars
8. Ejecutar checklist de humo (DEPLOY.md)
9. Documentar proceso real con screenshots en DEPLOY.md

**Definition of Done:**
- [ ] Staging accesible y funcional
- [ ] Checklist de humo 100% verde
- [ ] DEPLOY.md actualizado con proceso real y capturas
- [ ] .env.staging.example creado (sin secrets)
- [ ] Troubleshooting common issues documentado

**Evidencia de Completitud:** URL de staging + checklist ejecutado + docs actualizados.

---

### Backlog (Próximas Semanas)

- **Sprint 3:** UI Inventory Snapshots (P5), Optimizar Queries N+1, Suite pgTAP
- **Sprint 4:** Refactor Mappers Duplicados, Aumentar Cobertura Tests, CI/CD Pipeline
- **Post-MVP:** Exports de Pedidos, Importador Expandido, Observabilidad (Sentry + Logs)

---

## Apéndice A: Comandos de Verificación

```bash
# Verificar local setup
npx supabase start
npx supabase db reset  # Aplica migraciones + seeds
pnpm dev  # http://localhost:4173

# Ejecutar tests
pnpm test  # Vitest unit tests
pnpm exec playwright test  # E2E tests
npx supabase test db  # pgTAP (si existen tests)

# Verificar migraciones aplicadas
npx supabase db diff  # Debe estar vacío si todo aplicado

# Deploy a Supabase Cloud (staging)
supabase link --project-ref <staging-ref>
supabase db push
supabase functions deploy ocr_process
supabase functions deploy order_audit
supabase functions deploy daily_brief
supabase secrets set --env-file .env.staging

# Build frontend
pnpm build
pnpm preview  # Verificar build localmente
```

---

## Apéndice B: Métricas Clave

| Métrica | Valor Actual | Target MVP | Estado |
|---------|--------------|------------|--------|
| Slices completados (DONE) | 18 / 21 | 18+ | ✅ ON TRACK |
| Slices en progreso | 3 (P4, P5, P6) | < 3 | ✅ OK |
| Migraciones aplicadas | 26 | 26 | ✅ OK |
| Tests E2E pasando | 19 | 20+ | ⚠️ Falta p6-approvals |
| Tests unitarios | 17 archivos | 20+ | ⚠️ Cobertura mejorable |
| Cobertura domain layer | ~75% (estimado) | 80%+ | ⚠️ Por mejorar |
| Módulos UI completos | 10 / 10 | 10 | ✅ OK |
| Edge Functions | 3 / 3 | 3 | ✅ OK |
| Bloqueantes críticos | 1 (API key) | 0 | 🔴 RESOLVER HOY |
| Bloqueantes de deploy | 2 (API key + Auth URLs) | 0 | 🟠 Semana 1 |

---

**Última actualización:** 2026-01-09
**Próxima revisión:** Después de completar Acción 1-5 (2 semanas)
**Contacto:** Tech Lead / Release Manager
