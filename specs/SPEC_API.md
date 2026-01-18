# API Contracts
1. Dashboard RPCs: `dashboard_rolling_grid` (aggregates events/purchase/production/staff) and `dashboard_event_highlights`.
2. Events service: select list, insert wizard data, update status; server actions call `insert into events` with validations.
3. Importer: upload file => insert rows in staging table, call `import_commit` RPC to finalize.
4. Production: select tasks, update status via server action (service role) with RLS.
5. Orders: CRUD operations via server functions, ensure org_id matches.
6. Staff: scheduler reads shifts from `shifts` table; mutations run server action verifying vacancy rules.
