# 🚧 Guardrails y Reglas de Oro (Reconstrucción)

Estas reglas son **INQUEBRANTABLES**. Cualquier desviación de estas reglas se considerará un fallo en la tarea.

## 1. Calidad y Testing (Prioridad Absoluta)
- **Coverage Mínimo**: El proyecto **DEBE** mantener un **90% de coverage** global.
- **TDD (Test Driven Development)**: Se recomienda encarecidamente escribir los tests antes que la implementación.
- **Tipos de Tests**:
  - **Unit**: Para toda la lógica de dominio (`src/modules/*/domain`).
  - **Integration**: Para los hooks y servicios de datos (`src/modules/*/data`). Mockear Supabase.
  - **E2E**: Al menos 1 test "Happy Path" crítico por Sprint usando Playwright.

## 2. Arquitectura Modular Estricta
- **Estructura de Carpetas**:
  ```
  src/modules/<nombre-modulo>/
  ├── domain/       # Tipos, interfaces, schemas Zod, lógica pura. 0 dependencias de UI/React.
  ├── data/         # Servicios, repositorios, hooks de React Query, llamadas a Supabase.
  └── ui/           # Componentes React, Páginas, Hooks de vista.
  ```
- **Dependencias**:
  - `ui` puede depender de `data` y `domain`.
  - `data` puede depender de `domain`.
  - `domain` **NO** puede depender de nada (solo utilidades puras).
  - Un módulo **NO** debe importar directamente de otro módulo hermano (ej. `purchasing` importando de `events/ui`).
  - Comunicación entre módulos: A través de `src/lib/shared` o eventos (si aplica).

## 3. Base de Datos y Seguridad (RLS)
- **RLS (Row Level Security)**: **OBLIGATORIO** en todas las tablas.
- **Tenant Isolation**: Todas las tablas de negocio deben tener `org_id`.
- **Policies**: Las políticas de seguridad deben verificar siempre la membresía del usuario en la `org_id`.
- **SQL**: Usar migraciones SQL puras. No usar el editor visual de Supabase para cambios finales.

## 4. UI/UX e Idioma
- **Idioma UI**: **ESPAÑOL**. Etiquetas, botones, mensajes de error y feedback al usuario deben estar en español.
- **Idioma Código**: **INGLÉS**. Variables, funciones, comentarios y commits deben estar en inglés.
- **Estilos**: Usar Tailwind CSS exclusivamente. Evitar CSS Modules o Styled Components salvo excepción justificada.
- **Feedback**: Usar componentes de feedback (Toasts, Alerts) para todas las acciones asíncronas.

## 5. Control de Versiones (Git)
- **Atomic Commits**: Commits pequeños y descriptivos.
- **Convention**: Conventional Commits (`feat: ...`, `fix: ...`, `docs: ...`).
- **Sprint Close**: Al finalizar cada Sprint, se debe hacer un commit de cierre y asegurar que la rama está limpia y testeada.
- **No código muerto**: No dejar código comentado ni archivos sin usar.

## 6. Comportamiento del Agente
- **Plan Primero**: Antes de escribir código para un Sprint, lee los requisitos y planifica los archivos a crear.
- **Verificación Constante**: Ejecuta los tests después de cada cambio significativo.
- **No Asumir**: Si una especificación es ambigua, pregunta al usuario o consulta la documentación de referencia (`docs/reconstruction/*`).
- **Limpieza**: Si creas archivos temporales, bórralos al terminar.
