-- IMP1: Secure Importer Policies & RPCs

-- 1. Updates to Policies (Fix status update)

-- Only creator can update status, OR members can update via RPC if needed?
-- Actually the previous policy was:
-- create policy "Jobs update creator" on public.import_jobs for update using (created_by = auth.uid()) with check (created_by = auth.uid());
-- This is fine for direct updates. But validation/commit RPCs run as SECURITY DEFINER so they bypass RLS.
-- However, we want to ensure role-based access in the RPCs.

-- 2. Secure RPCs

-- RPC: import_stage_data
create or replace function public.import_stage_data(
  p_org_id uuid,
  p_entity text,
  p_filename text,
  p_rows jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_job_id uuid;
  v_user_id uuid;
  v_role text;
  v_row jsonb;
  v_idx int := 1;
begin
  v_user_id := auth.uid();
  
  -- Role Validation
  select role into v_role from public.org_memberships where org_id = p_org_id and user_id = v_user_id;
  if v_role is null then raise exception 'Access denied to org'; end if;
  if v_role not in ('admin', 'owner', 'manager', 'purchaser') then raise exception 'Insufficient permissions'; end if;

  -- Create Job
  insert into public.import_jobs (org_id, created_by, entity, filename, status, summary)
  values (p_org_id, v_user_id, p_entity, p_filename, 'staged', jsonb_build_object('total', jsonb_array_length(p_rows)))
  returning id into v_job_id;

  -- Insert Rows
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
  v_target_id uuid;
  v_role text;
  v_org_id uuid;
  
  c_ok int := 0;
  c_error int := 0;
  c_insert int := 0;
  c_update int := 0;
begin
  select * into v_job from public.import_jobs where id = p_job_id;
  v_org_id := v_job.org_id;

  -- Role Validation
  select role into v_role from public.org_memberships where org_id = v_org_id and user_id = auth.uid();
  if v_role is null or v_role not in ('admin', 'owner', 'manager', 'purchaser') then
    raise exception 'Insufficient permissions';
  end if;
  
  if v_job.created_by <> auth.uid() and v_role <> 'owner' and v_role <> 'admin' then
     -- Optional: allow admins to validate others' jobs? For now enforcing ownership or admin
     raise exception 'Access denied to job';
  end if;

  -- ... (Validation Logic from previous migration, effectively same logic but ensuring function is replaced with new security checks)
  -- To keep this file concise and focused on security, I am copying the Logic block. 
  -- In a real migration system, we might split logic from security wrappers, but here we replace the function.
  
  for v_row in select * from public.import_rows where job_id = p_job_id order by row_number
  loop
    v_errors := '{}';
    v_normalized := v_row.raw;
    v_action := 'insert';

    -- [LOGIC BLOCK START] - Re-using logic from IMP1
    if v_job.entity = 'suppliers' then
       if v_row.raw->>'name' is null or v_row.raw->>'name' = '' then v_errors := array_append(v_errors, 'Missing name'); end if;
       if v_errors = '{}' then 
          select id into v_target_id from public.suppliers where org_id = v_org_id and name = (v_row.raw->>'name');
          if v_target_id is not null then v_action := 'update'; v_normalized := v_normalized || jsonb_build_object('id', v_target_id); end if;
       end if;
    
    elsif v_job.entity = 'supplier_items' then
       if v_row.raw->>'supplier_name' is null then v_errors := array_append(v_errors, 'Missing supplier_name'); end if;
       if v_row.raw->>'name' is null then v_errors := array_append(v_errors, 'Missing name'); end if;
       if v_row.raw->>'supplier_name' is not null then
          select id into v_target_id from public.suppliers where org_id = v_org_id and name = (v_row.raw->>'supplier_name');
          if v_target_id is null then v_errors := array_append(v_errors, 'Supplier not found: ' || (v_row.raw->>'supplier_name'));
          else
             v_normalized := v_normalized || jsonb_build_object('supplier_id', v_target_id);
             if v_row.raw->>'name' is not null then
                perform 1 from public.supplier_items where supplier_id = v_target_id and name = (v_row.raw->>'name');
                if found then v_action := 'update'; end if;
             end if;
          end if;
       end if;
       if v_row.raw->>'purchase_unit' not in ('kg', 'ud') then v_errors := array_append(v_errors, 'Invalid unit (must be kg or ud)'); end if;

    elsif v_job.entity = 'events' then
       if v_row.raw->>'hotel_name' is null then v_errors := array_append(v_errors, 'Missing hotel_name'); end if;
       if v_row.raw->>'title' is null then v_errors := array_append(v_errors, 'Missing title'); end if;
       if v_row.raw->>'starts_at' is null then v_errors := array_append(v_errors, 'Missing starts_at'); end if;
       if v_row.raw->>'hotel_name' is not null then
          select id into v_target_id from public.hotels where org_id = v_org_id and name = (v_row.raw->>'hotel_name');
          if v_target_id is null then v_errors := array_append(v_errors, 'Hotel not found: ' || (v_row.raw->>'hotel_name'));
          else
             v_normalized := v_normalized || jsonb_build_object('hotel_id', v_target_id);
             perform 1 from public.events where org_id = v_org_id and hotel_id = v_target_id and title = (v_row.raw->>'title') and starts_at = (v_row.raw->>'starts_at')::timestamptz;
             if found then v_action := 'update'; end if;
          end if;
       end if;
    end if;
    -- [LOGIC BLOCK END]

    update public.import_rows set errors = v_errors, normalized = v_normalized, action = v_action where id = v_row.id;

    if array_length(v_errors, 1) > 0 then c_error := c_error + 1;
    else c_ok := c_ok + 1; if v_action = 'insert' then c_insert := c_insert + 1; else c_update := c_update + 1; end if;
    end if;
  end loop;

  update public.import_jobs
  set status = 'validated', summary = jsonb_build_object('total', (c_ok + c_error), 'ok', c_ok, 'errors', c_error, 'inserted', c_insert, 'updated', c_update)
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
  v_org_id uuid;
  v_role text;
begin
  select * into v_job from public.import_jobs where id = p_job_id;
  v_org_id := v_job.org_id;

  -- Role Validation
  select role into v_role from public.org_memberships where org_id = v_org_id and user_id = auth.uid();
  if v_role is null or v_role not in ('admin', 'owner') then
    -- Only Admins/Owners can COMMIT imports? Or trusted purchasers too? 
    -- Let's stick strictly to high privilege for Commits for now, or maybe allow 'manager'.
    if v_role not in ('manager', 'purchaser') then
         raise exception 'Insufficient permissions to commit data';
    end if;
  end if;

  if v_job.status <> 'validated' then raise exception 'Job must be validated'; end if;
  if (v_job.summary->>'errors')::int > 0 then raise exception 'Cannot commit with errors'; end if;

  for v_row in select * from public.import_rows where job_id = p_job_id order by row_number
  loop
    if v_job.entity = 'suppliers' then
       insert into public.suppliers (org_id, name) values (v_org_id, v_row.normalized->>'name') on conflict (org_id, name) do nothing;
    elsif v_job.entity = 'supplier_items' then
       insert into public.supplier_items (supplier_id, name, purchase_unit, pack_size, rounding_rule, price_per_unit, notes)
       values ((v_row.normalized->>'supplier_id')::uuid, v_row.normalized->>'name', v_row.normalized->>'purchase_unit', (v_row.normalized->>'pack_size')::numeric, coalesce(v_row.normalized->>'rounding_rule', 'none'), (v_row.normalized->>'price')::numeric, v_row.normalized->>'notes')
       on conflict (supplier_id, name) do update set purchase_unit = excluded.purchase_unit, price_per_unit = excluded.price_per_unit;
    elsif v_job.entity = 'events' then
       insert into public.events (org_id, hotel_id, title, starts_at, ends_at, status, notes)
       values (v_org_id, (v_row.normalized->>'hotel_id')::uuid, v_row.normalized->>'title', (v_row.normalized->>'starts_at')::timestamptz, (v_row.normalized->>'ends_at')::timestamptz, coalesce(v_row.normalized->>'status', 'confirmed'), v_row.normalized->>'notes')
       on conflict (org_id, hotel_id, title, starts_at) do update set notes = excluded.notes, ends_at = excluded.ends_at;
    end if;
  end loop;

  update public.import_jobs set status = 'committed' where id = p_job_id;
  return v_job.summary;
end;
$$;
