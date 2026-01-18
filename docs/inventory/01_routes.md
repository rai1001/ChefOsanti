# Inventario de Rutas y Páginas

Este repositorio replica las pantallas críticas de ChefOS actual. Las rutas identificadas son:

- `/` → Home informativo y redirección a login si no hay sesión.
- `/login` → Login principal con campos correo/contraseña y enlaces a soporte.
- `/dashboard` → Vista ejecutiva con KPIs (producción, pedidos, alertas) y timeline de eventos.
- `/events` → Listado de eventos con filtros (fecha, sucursal) y acceso al calendario rojo verde.
- `/events/new` → Wizard de creación de eventos (detalles, servicios, espacios, resumen).
- `/inventory` → Gestión de inventario con alertas de caducidad, chips de estado y filtros por almacén.
- `/orders` → Pedidos por eventos/diarios con estados (draft/approved/ordered/received).
- `/staff` → Calendario de staff semanal (navegador 7 días) y formulario de permisos/vacaciones.
- `/settings` → Administración: proveedores, recetas, menús y tokens.

Las rutas adicionales previstas se documentarán en sprints posteriores.
