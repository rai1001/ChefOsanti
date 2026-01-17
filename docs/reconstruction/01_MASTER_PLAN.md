# Plan Maestro de Reconstrucción de ChefOS

Este documento define la estrategia para reconstruir la aplicación **ChefOS** desde cero, asegurando un código limpio, arquitectura sólida y alta cobertura de tests.

## 🎯 Objetivo
Replicar la funcionalidad actual de ChefOS en una base de código nueva ("Greenfield"), eliminando la deuda técnica acumulada por migraciones históricas y garantizando una arquitectura modular y testable.

## 🛠 Tech Stack (Definición Estricta)

### Core
- **Lenguaje**: TypeScript (Strict Mode).
- **Runtime**: Node.js (Latest LTS).
- **Framework Web**: React 18+ con Vite.
- **Estilos**: Tailwind CSS (con `clsx` y `tailwind-merge`).

### Backend & Data
- **Plataforma**: Supabase (PostgreSQL).
- **Auth**: Supabase Auth.
- **API**: Supabase JS Client (`@supabase/supabase-js`).
- **Estado Servidor**: TanStack Query (React Query) v5.
- **Formularios**: React Hook Form + Zod.

### Testing (Requisito: 90% Coverage)
- **Unit/Integration**: Vitest + React Testing Library.
- **E2E**: Playwright.
- **Coverage**: `@vitest/coverage-v8`.

### Arquitectura
- **Modular Monolith**: `src/modules/<feature>/{domain,data,ui}`.
- **Clean Architecture Light**: Separación estricta entre Dominio (reglas), Data (Supabase/API) y UI (React).

## 📅 Estrategia de Sprints (Pasos Lógicos)

La reconstrucción se dividirá en 6 Sprints lógicos. Cada sprint debe completarse, testearse y comitearse antes de pasar al siguiente.

| Sprint | Nombre | Módulos Clave | Objetivo |
| :--- | :--- | :--- | :--- |
| **0** | **Cimientos** | `core`, `auth`, `shared` | Setup, Auth, Layout Base, UI Kit, Configuración de Tests. |
| **1** | **Datos Maestros** | `orgs`, `staff`, `suppliers` | Gestión de Organizaciones, Usuarios, Proveedores e Items. |
| **2** | **Compras e Inventario** | `purchasing`, `inventory` | Pedidos de Compra (PO), Workflows, Stock y Ubicaciones. |
| **3** | **Ingeniería de Menú** | `recipes`, `waste` | Recetas, Escandallos, Alérgenos y Gestión de Mermas. |
| **4** | **Operaciones de Eventos** | `events`, `production` | Gestión de Eventos, Menús, Órdenes de Evento (BEO) y Producción. |
| **5** | **Inteligencia y Reportes** | `dashboard`, `reporting`, `importer` | Dashboards, KPIs, Importadores Excel/CSV y OCR. |

## 🚀 Flujo de Trabajo por Sprint

1.  **Analizar**: Leer los requisitos del Sprint en `03_SPRINTS.md`.
2.  **Schema**: Definir y aplicar el esquema de base de datos consolidado (SQL).
3.  **Domain**: Implementar tipos y lógica pura en `domain/`.
4.  **Tests (TDD)**: Escribir tests unitarios iniciales.
5.  **Data**: Implementar repositorios/servicios en `data/`.
6.  **UI**: Implementar componentes y páginas en `ui/`.
7.  **Verificar**: Ejecutar `npm test` y asegurar **90% coverage**.
8.  **Commit**: `git commit -m "feat(sprint-X): complete sprint X"` y `git push`.

## 📂 Estructura de Archivos de Referencia
Todos los documentos necesarios para guiar a la IA se encuentran en esta carpeta `docs/reconstruction/`:
1.  `01_MASTER_PLAN.md`: Este archivo.
2.  `02_GUARDRAILS.md`: Reglas inquebrantables.
3.  `03_SPRINTS.md`: Detalle técnico paso a paso.
4.  `04_PROMPT.md`: Prompt maestro para iniciar el trabajo.
