# Plan Rewrite
## MVP
- Sprint0: scaffold Next/Postgres/Prisma, docs, scripts, home page.
- Sprint1: Auth + AppShell + Dashboard load with RPCs.
- Sprint2: Events/Orders/Inventory CRUD + importer UI.
- Sprint3: Staff scheduler + production components + QA.
## Checklists
- Tests: vitest/unit (components), integration (api routes), e2e (login+dashboard using playwright).
- Security: RLS policies, no service role on client, CSP headers.
## Strategy
1. Baseline: run SPEC_SUPABASE_SCHEMA.sql on new Supabase project via db push.
2. Seed minimal data via SQL script for tests.
3. Track incremental migrations via Prisma.
4. Deploy each sprint on `main`, keep history clean.
