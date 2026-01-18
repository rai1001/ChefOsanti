# Roles y permisos

- **Admin**: acceso a todo; puede crear orgs/hoteles, ver dashboards, gestionar usuarios y datos maestros.
- **Planner**: crea eventos, menús, pedidos y revisa KPIs.
- **Purchasing**: genera pedidos, revierte estados (ordered/received) y confirma PO.
- **Chef/Kitchen**: agenda producción, vé estados de stock, actualiza tareas y backups.
- **Viewer**: solo dashboards y reportes.

Las políticas RLS (save for every table) usan `auth.uid()` y `org_id` para permitir el acceso adecuado.
