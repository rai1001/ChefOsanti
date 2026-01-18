# App architecture
- `app/layout.tsx`: global layout, ThemeProvider (dark mode), AppShell component.
- `app/page.tsx`: home placeholder.
- `app/login/page.tsx`: NextAuth sign-in.
- `routes`: use server actions for writes using service role key stored server-side.
- `lib/supabase/server.ts`: init with service key for internal actions; `lib/supabase/client.ts` for browser with anon key + RLS.
- `middleware.ts`: protect route access, load org_id and redirect to login.
- Role flow: once logged, middleware ensures membership and sets org in request.
