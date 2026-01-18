## 01_setup: link Supabase + Vercel

1. **Supabase baseline**  
   - Crea un nuevo proyecto Supabase y copia su `project_ref`.  
   - Ejecuta `npx supabase link --project-ref <ref>` en este repo.  
   - Corre `npx supabase db push` para aplicar `supabase/migrations/00000000000000_base.sql`.

2. **Vercel**  
   - Crea un proyecto `chef-vX` en Vercel y apunta las variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL` al URL y anon key del nuevo Supabase.  
   - En la terminal: `npx vercel login` → `npx vercel link` → selecciona el equipo y el proyecto.  
   - Si necesitas redeploy: `npx vercel --prod --force`.

3. **Verificación rápida**  
   - `npx vercel projects ls` debe listar el proyecto.  
   - `npx supabase projects list` debe mostrar el nuevo ref como linked.  
   - Ajusta `.vercel/project.json` si es necesario y recarga VSCode (`Developer: Reload Window`) para que la extensión muestre deployments.
