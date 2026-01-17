# 📅 Plan de Sprints (Detalle Técnico)

Este documento detalla los entregables y el alcance técnico de cada Sprint de la reconstrucción.

---

## Sprint 0: Cimientos y Configuración

**Objetivo**: Establecer la base técnica, configurar el repositorio, herramientas de calidad y autenticación.

### 📝 Tareas
1.  **Repo Init**: Inicializar proyecto Vite + React + TS. Configurar `eslint`, `prettier`, `vitest`, `playwright`.
2.  **UI Kit Base**: Configurar Tailwind, crear componentes base (Button, Input, Card, Modal, Layout).
3.  **Supabase Setup**:
    - Inicializar proyecto Supabase local.
    - Tabla `profiles` (trigger on auth.users).
    - Tablas `orgs`, `org_memberships`, `hotels` (Estructura Multi-tenant).
    - RLS Policies básicas para `orgs` y `memberships`.
4.  **Auth Module**:
    - Login Page (Email/Password).
    - Register Page.
    - Auth Context/Provider.
    - Protected Route Guard.

### ✅ Definition of Done
- [ ] Proyecto corre en local sin errores.
- [ ] Linter y tests (Unit/E2E) pasan.
- [ ] Login y Logout funcionan contra Supabase local.
- [ ] Usuario puede ver su organización asignada.
- [ ] Coverage > 90%.

---

## Sprint 1: Datos Maestros (Core Data)

**Objetivo**: Implementar las entidades fundamentales que alimentarán el resto del sistema.

### 📝 Tareas
1.  **Staff Module**:
    - Tabla `staff_roles`, `staff_members`.
    - CRUD de Empleados.
    - Asignación de Roles.
2.  **Suppliers Module (Purchasing I)**:
    - Tabla `suppliers` (Proveedores).
    - Tabla `supplier_items` (Catálogo del proveedor).
    - UI para gestión de proveedores y sus productos.
3.  **Units & Categories**:
    - Tablas de unidades de medida y conversiones.
    - Categorías de productos.

### ✅ Definition of Done
- [ ] Se pueden crear/editar/listar Empleados y Proveedores.
- [ ] Validaciones de duplicados y campos obligatorios.
- [ ] RLS asegura que solo veo datos de mi Org.
- [ ] Tests unitarios de dominio (validación de emails, roles).
- [ ] Coverage > 90%.

---

## Sprint 2: Compras e Inventario (Purchasing & Inventory)

**Objetivo**: Gestionar el flujo de entrada de materiales y su almacenamiento.

### 📝 Tareas
1.  **Purchase Orders (Pedidos)**:
    - Tablas `purchase_orders`, `purchase_order_lines`.
    - Flujo: Borrador -> Enviado -> Recibido.
    - UI: Formulario maestro-detalle para pedidos.
2.  **Inventory Core**:
    - Tablas `inventory_locations` (Almacenes/Neveras).
    - Tabla `stock_levels` (Stock actual por item y ubicación).
    - Trigger/Función: Al recibir pedido -> Incrementar stock.
3.  **Counts (Inventarios Físicos)**:
    - Tabla `inventory_counts`.
    - UI para realizar conteo físico y ajustar stock.

### ✅ Definition of Done
- [ ] Crear un pedido, enviarlo y recibirlo actualiza el stock.
- [ ] Se puede consultar el stock actual por ubicación.
- [ ] Histórico de movimientos de stock.
- [ ] Tests de integración para el flujo Pedido -> Stock.
- [ ] Coverage > 90%.

---

## Sprint 3: Ingeniería de Menú (Recipes & Waste)

**Objetivo**: Definir cómo se transforman los ingredientes en platos y gestionar las pérdidas.

### 📝 Tareas
1.  **Recipes Module**:
    - Tablas `recipes`, `recipe_ingredients`, `recipe_steps`.
    - Cálculo de costes (Escandallo) basado en precio de ingredientes.
    - UI visual para recetas (fotos, pasos).
2.  **Allergens**:
    - Tabla `allergens`, `recipe_allergens`.
    - Cálculo automático de alérgenos.
3.  **Waste Module**:
    - Tabla `waste_logs`.
    - Registro de mermas (motivo, cantidad, coste).

### ✅ Definition of Done
- [ ] Crear receta con ingredientes y ver coste calculado.
- [ ] Detectar alérgenos.
- [ ] Registrar una merma descuenta stock.
- [ ] Coverage > 90%.

---

## Sprint 4: Operaciones y Eventos (Events & Production)

**Objetivo**: El "Core Business". Gestión de eventos y planificación de producción.

### 📝 Tareas
1.  **Events Module**:
    - Tablas `events`, `event_services` (Menús, Salas).
    - BEO (Banquet Event Order) digital.
    - Calendario de eventos.
2.  **Production Planning**:
    - Tablas `production_plans`, `production_tasks`.
    - Generar plan de producción basado en eventos confirmados.
    - Cálculo de necesidades de compra (Shopping List).

### ✅ Definition of Done
- [ ] Crear evento, asignar menú y generar orden de servicio.
- [ ] Generar lista de tareas de cocina para un día.
- [ ] Calcular qué ingredientes faltan para los eventos de la semana.
- [ ] Coverage > 90%.

---

## Sprint 5: Inteligencia y Reportes (Dashboard & Reporting)

**Objetivo**: Capa de visualización y herramientas avanzadas.

### 📝 Tareas
1.  **Dashboard**:
    - Widgets: Ventas hoy, Food Cost real vs teórico, Próximos eventos.
    - Daily Briefing (Resumen del día).
2.  **Reporting**:
    - Reportes exportables (PDF/Excel): Compras por proveedor, Valoración de inventario.
3.  **Importer & OCR**:
    - Módulo de importación masiva (Excel).
    - (Opcional) Integración OCR para albaranes (Google Gemini/OpenAI).

### ✅ Definition of Done
- [ ] Dashboard carga en < 1s.
- [ ] Reportes coinciden con los datos transaccionales.
- [ ] Importador valida errores antes de insertar.
- [ ] App completa y lista para despliegue.
- [ ] Coverage > 90%.
