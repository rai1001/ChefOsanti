## 03_bootstrap: populate synthetic data

1. **Prerequisite**: ya debes tener el user admin creado (`raisada1001@gmail.com`) usando la service-role key.  
2. **Ejecuta** `automation/sql/bootstrap.sql` en Supabase Studio; contiene los inserts para org, hotel, eventos, spaces, services, production y compras.  
3. **Verifica**  
   - `select * from public.orgs` y `public.hotels` muestran registros.  
   - `select * from public.events` y `public.event_services` devuelven los datos.  
   - Las llamadas RPC (`/rpc/dashboard_event_highlights`, `/rpc/dashboard_rolling_grid`) retornan `200`.

4. **Debug rápido**: si un insert falla por constraint, revisa el mensaje para adaptar el script (usando `gen_random_uuid()` y `on conflict do nothing`).  
5. **Reinicia app**: después de aplicar el bootstrap redeploy o refresca el frontend (`chev-v2`). Ahora ya deberías tener un hotel visible y el dashboard completo.
