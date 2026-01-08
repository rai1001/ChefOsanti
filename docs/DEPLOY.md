# Supabase Cloud Deploy

## Proyectos
- Staging: `chefos-staging`
- Producción: `chefos-prod`

## Preparación
- Instala CLI y autentica: `supabase login` (usa token personal, no lo subas al repo).
- Crea `.env.staging` y `.env.prod` desde las plantillas `.env.staging.example` / `.env.prod.example` sin exponer claves reales.
- Dentro de `supabase/`, revisa que el proyecto esté enlazado con el ref correcto antes de ejecutar comandos.

## Pipeline por entorno (staging / prod)
1) Enlazar proyecto (repetir para cada ref):  
   `supabase link --project-ref <ref>`
2) Aplicar migraciones y recursos de almacenamiento:  
   `supabase db push`
3) Desplegar edge functions (todas las existentes):  
   `supabase functions deploy ocr_process`
4) Cargar secretos (Auth/Functions, incl. service role y OCR_PROVIDER):  
   `supabase secrets set --env-file .env.staging`  
   `supabase secrets set --env-file .env.prod`
5) Configurar Auth (Supabase Studio → Authentication → URL Configuration):  
   - Site URL: URL pública del frontend (staging/prod).  
   - Redirect URLs: incluir la Site URL, variantes https, y `http://localhost:4173` para pruebas locales.
6) Hosting frontend (Supabase/otro): definir variables de entorno de build/hosting:  
   - `VITE_SUPABASE_URL`  
   - `VITE_SUPABASE_ANON_KEY`

## Checklist de humo tras desplegar
- Login/logout con Supabase Auth.
- Dashboard carga sin errores.
- Eventos: board y detalle funcionan.
- Subida de adjunto OCR y creación de job.
- Pedidos borrador y flujo de compras.
- Generar roster en Scheduling.
