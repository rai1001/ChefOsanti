## 02_secrets: rotate and load environment variables

1. **Rotate keys (critical)**  
   - Supabase: genera nuevas `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL`.  
   - Gemini/OCR/etc.: sustituye los valores en Supabase secrets + Vercel env vars.

2. **Supabase secrets**  
   ```bash
   npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service-role>"
   npx supabase secrets set VITE_GEMINI_API_KEY="<gemini>"
   ```

3. **Vercel env vars**  
   - Usa la UI o `vercel env add` para agregar `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `VITE_GEMINI_API_KEY`, `VITE_ALLOW_INSECURE_SUPABASE=false`.  
   - Asegúrate de marcar la visibilidad (Production, Preview, Development) según el entorno.

4. **Validar**  
   - `npx vercel env ls` debe listar las variables.  
   - Si actualizas `.env.local`, no lo subas a Git (agrega a `.gitignore` si hace falta).
