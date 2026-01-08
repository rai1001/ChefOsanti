-- IMP1: Universal Importer (Staging + Validation + Commit)

-- 1. Tables for Staging
create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  entity text not null check (entity in ('suppliers', 'supplier_items', 'events')),
  status text not null check (status in ('staged', 'validated', 'committed', 'failed')) default 'staged',
  filename text not null,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.import_rows (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.import_jobs(id) on delete cascade,
  row_number int not null,
  raw jsonb not null,
  normalized jsonb null,
  errors text[] not null default '{}',
  action text null check (action in ('insert', 'update', 'skip')),
  created_at timestamptz not null default now()
);

create index import_rows_job_idx on public.import_rows(job_id);

-- 2. Indexes for Upserts (Target Tables)
-- Suppliers: already has unique(org_id, name)
-- Supplier Items: already has unique(supplier_id, name)
-- Events: needs unique index for safe upsert
create unique index if not exists events_upsert_idx on public.events (org_id, hotel_id, title, starts_at);


-- 3. RLS
alter table public.import_jobs enable row level security;
alter table public.import_rows enable row level security;

-- Jobs Policies
create policy "Jobs select member" on public.import_jobs for select
  using (exists (select 1 from public.org_memberships m where m.org_id = import_jobs.org_id and m.user_id = auth.uid()));

create policy "Jobs insert member" on public.import_jobs for insert
  with check (exists (select 1 from public.org_memberships m where m.org_id = import_jobs.org_id and m.user_id = auth.uid()));

-- Only creator can update status (via RPC usually, but strict RLS is good)
create policy "Jobs update creator" on public.import_jobs for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Rows Policies (inherit from job)
create policy "Rows select member" on public.import_rows for select
  using (exists (select 1 from public.import_jobs j join public.org_memberships m on m.org_id = j.org_id where j.id = import_rows.job_id and m.user_id = auth.uid()));

-- 4. RPCs

-- RPC: import_stage_data
-- Receives parsed JSON rows from client to avoid CSV parsing in SQL/Edge
create or replace function public.import_stage_data(
  p_org_id uuid,
  p_entity text,
  p_filename text,
  p_rows jsonb -- array of objects
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_job_id uuid;
  v_user_id uuid;
  v_row jsonb;
  v_idx int := 1;
begin
  v_user_id := auth.uid();
  
  -- Auth check
  if not exists (select 1 from public.org_memberships where org_id = p_org_id and user_id = v_user_id) then
    raise exception 'Access denied to org';
  end if;

  -- Create Job
  insert into public.import_jobs (org_id, created_by, entity, filename, status, summary)
  values (p_org_id, v_user_id, p_entity, p_filename, 'staged', jsonb_build_object('total', jsonb_array_length(p_rows)))
  returning id into v_job_id;

  -- Insert Rows (Bulk insert optimization possible, but loop is safer for row_number tracking for now)
  -- For strict ordering, we iterate.
  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    insert into public.import_rows (job_id, row_number, raw)
    values (v_job_id, v_idx, v_row);
    v_idx := v_idx + 1;
  end loop;

  return v_job_id;
end;
$$;


-- RPC: import_validate
create or replace function public.import_validate(p_job_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_job public.import_jobs%rowtype;
  v_row public.import_rows%rowtype;
  v_errors text[];
  v_normalized jsonb;
  v_action text;
  
  -- Lookups
  v_target_id uuid;
  v_org_id uuid;
  
  -- Counters
  c_ok int := 0;
  c_error int := 0;
  c_insert int := 0;
  c_update int := 0;
begin
  select * into v_job from public.import_jobs where id = p_job_id;
  v_org_id := v_job.org_id;

  -- Verify ownership
  if v_job.created_by <> auth.uid() then
    raise exception 'Access denied to job';
  end if;

  -- Iterate rows
  for v_row in select * from public.import_rows where job_id = p_job_id order by row_number
  loop
    v_errors := '{}';
    v_normalized := v_row.raw;
    v_action := 'insert'; -- default

    -- Validation Logic by Entity
    if v_job.entity = 'suppliers' then
       -- Requerido: name
       if v_row.raw->>'name' is null or v_row.raw->>'name' = '' then
          v_errors := array_append(v_errors, 'Missing name');
       end if;
       
       -- Check Duplicate/Upsert
       if v_errors = '{}' then 
          select id into v_target_id from public.suppliers where org_id = v_org_id and name = (v_row.raw->>'name');
          if v_target_id is not null then
             v_action := 'update';
             v_normalized := v_normalized || jsonb_build_object('id', v_target_id);
          end if;
       end if;

    elsif v_job.entity = 'supplier_items' then
       -- Requerido: supplier_name, name
       if v_row.raw->>'supplier_name' is null then v_errors := array_append(v_errors, 'Missing supplier_name'); end if;
       if v_row.raw->>'name' is null then v_errors := array_append(v_errors, 'Missing name'); end if;

       -- Lookup Supplier
       if v_row.raw->>'supplier_name' is not null then
          select id into v_target_id from public.suppliers where org_id = v_org_id and name = (v_row.raw->>'supplier_name');
          if v_target_id is null then
             v_errors := array_append(v_errors, 'Supplier not found: ' || (v_row.raw->>'supplier_name'));
          else
             v_normalized := v_normalized || jsonb_build_object('supplier_id', v_target_id);
             
             -- Check Item Exists
             if v_row.raw->>'name' is not null then
                perform 1 from public.supplier_items where supplier_id = v_target_id and name = (v_row.raw->>'name');
                if found then v_action := 'update'; end if;
             end if;
          end if;
       end if;

       -- Validate Unit
       if v_row.raw->>'purchase_unit' not in ('kg', 'ud') then
          v_errors := array_append(v_errors, 'Invalid unit (must be kg or ud)');
       end if;
       
    elsif v_job.entity = 'events' then
       -- Requerido: hotel_name, title, starts_at
       if v_row.raw->>'hotel_name' is null then v_errors := array_append(v_errors, 'Missing hotel_name'); end if;
       if v_row.raw->>'title' is null then v_errors := array_append(v_errors, 'Missing title'); end if;
       if v_row.raw->>'starts_at' is null then v_errors := array_append(v_errors, 'Missing starts_at'); end if;

       -- Lookup Hotel
       if v_row.raw->>'hotel_name' is not null then
          select id into v_target_id from public.hotels where org_id = v_org_id and name = (v_row.raw->>'hotel_name');
          if v_target_id is null then
             v_errors := array_append(v_errors, 'Hotel not found: ' || (v_row.raw->>'hotel_name'));
          else
             v_normalized := v_normalized || jsonb_build_object('hotel_id', v_target_id);
             
             -- Check Exists
             perform 1 from public.events where org_id = v_org_id and hotel_id = v_target_id 
                         and title = (v_row.raw->>'title') and starts_at = (v_row.raw->>'starts_at')::timestamptz;
             if found then v_action := 'update'; end if;
          end if;
       end if;
    end if;

    -- Update row status
    update public.import_rows 
    set errors = v_errors, normalized = v_normalized, action = v_action
    where id = v_row.id;

    -- Update counters
    if array_length(v_errors, 1) > 0 then
      c_error := c_error + 1;
    else
      c_ok := c_ok + 1;
      if v_action = 'insert' then c_insert := c_insert + 1; else c_update := c_update + 1; end if;
    end if;
  end loop;

  -- Update Job
  update public.import_jobs
  set status = 'validated',
      summary = jsonb_build_object(
        'total', (c_ok + c_error),
        'ok', c_ok,
        'errors', c_error,
        'inserted', c_insert,
        'updated', c_update
      )
  where id = p_job_id
  returning summary into v_job.summary;

  return v_job.summary;
end;
$$;


-- RPC: import_commit
create or replace function public.import_commit(p_job_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_job public.import_jobs%rowtype;
  v_row public.import_rows%rowtype;
  v_summary jsonb;
  v_org_id uuid;
begin
  select * into v_job from public.import_jobs where id = p_job_id;
  v_org_id := v_job.org_id;

  if v_job.status <> 'validated' then raise exception 'Job must be validated'; end if;
  if (v_job.summary->>'errors')::int > 0 then raise exception 'Cannot commit with errors'; end if;

  -- Iterate and Apply
  for v_row in select * from public.import_rows where job_id = p_job_id order by row_number
  loop
    if v_job.entity = 'suppliers' then
       insert into public.suppliers (org_id, name)
       values (v_org_id, v_row.normalized->>'name')
       on conflict (org_id, name) do nothing; -- Already checked upsert logic in validate, but safest is do update/nothing

    elsif v_job.entity = 'supplier_items' then
       insert into public.supplier_items (supplier_id, name, purchase_unit, pack_size, rounding_rule, price_per_unit, notes)
       values (
         (v_row.normalized->>'supplier_id')::uuid,
         v_row.normalized->>'name',
         v_row.normalized->>'purchase_unit',
         (v_row.normalized->>'pack_size')::numeric,
         coalesce(v_row.normalized->>'rounding_rule', 'none'),
         (v_row.normalized->>'price')::numeric,
         v_row.normalized->>'notes'
       )
       on conflict (supplier_id, name) do update
       set purchase_unit = excluded.purchase_unit,
           price_per_unit = excluded.price_per_unit;

    elsif v_job.entity = 'events' then
       insert into public.events (org_id, hotel_id, title, starts_at, ends_at, status, notes)
       values (
         v_org_id,
         (v_row.normalized->>'hotel_id')::uuid,
         v_row.normalized->>'title',
         (v_row.normalized->>'starts_at')::timestamptz,
         (v_row.normalized->>'ends_at')::timestamptz,
         coalesce(v_row.normalized->>'status', 'confirmed'),
         v_row.normalized->>'notes'
       )
       on conflict (org_id, hotel_id, title, starts_at) do update
       set notes = excluded.notes,
           ends_at = excluded.ends_at;
    end if;
  end loop;

  -- Finalize Job
  update public.import_jobs set status = 'committed' where id = p_job_id;
  
  return v_job.summary;
end;
$$;
