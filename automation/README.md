# Automation workflow

Esta carpeta concentra los scripts y la documentación para recrear el stack limpio (Supabase+Vercel) sin tener que investigar cada comando. Los pasos son:

1. Consultar `01_setup.md` para vincular el repo con el nuevo Supabase/Vercel.  
2. Aplicar `bootstrap.sql` (`automation/sql/bootstrap.sql`) luego de rotar los secrets y crear el usuario admin.  
3. Cuando termines las pruebas, ejecutar `cleanup.sql` para dejar la base como al principio.  
4. Repetir el ciclo desde el punto 1 cuando necesites iniciar de cero.

Los archivos `.md` a continuación detallan cada fase; úsalos como checklist antes de desplegar.
