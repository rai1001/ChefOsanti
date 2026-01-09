-- IMP1 Extension: Support for 'products' and 'staff'

-- 1. Update check constraint on import_jobs
alter table public.import_jobs drop constraint if exists import_jobs_entity_check;
alter table public.import_jobs add constraint import_jobs_entity_check check (entity in ('suppliers', 'supplier_items', 'events', 'products', 'staff'));

-- 2. Update import_validate to handle products and staff
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
       if v_row.raw->>'name' is null or v_row.raw->>'name' = '' then
          v_errors := array_append(v_errors, 'Missing name');
       end if;
       if v_errors = '{}' then 
          select id into v_target_id from public.suppliers where org_id = v_org_id and name = (v_row.raw->>'name');
          if v_target_id is not null then
             v_action := 'update';
             v_normalized := v_normalized || jsonb_build_object('id', v_target_id);
          end if;
       end if;

    elsif v_job.entity = 'supplier_items' then
       if v_row.raw->>'supplier_name' is null then v_errors := array_append(v_errors, 'Missing supplier_name'); end if;
       if v_row.raw->>'name' is null then v_errors := array_append(v_errors, 'Missing name'); end if;
       if v_row.raw->>'supplier_name' is not null then
          select id into v_target_id from public.suppliers where org_id = v_org_id and name = (v_row.raw->>'supplier_name');
          if v_target_id is null then
             v_errors := array_append(v_errors, 'Supplier not found: ' || (v_row.raw->>'supplier_name'));
          else
             v_normalized := v_normalized || jsonb_build_object('supplier_id', v_target_id);
             if v_row.raw->>'name' is not null then
                perform 1 from public.supplier_items where supplier_id = v_target_id and name = (v_row.raw->>'name');
                if found then v_action := 'update'; end if;
             end if;
          end if;
       end if;
       if v_row.raw->>'purchase_unit' not in ('kg', 'ud') then
          v_errors := array_append(v_errors, 'Invalid unit (must be kg or ud)');
       end if;
       
    elsif v_job.entity = 'events' then
       if v_row.raw->>'hotel_name' is null then v_errors := array_append(v_errors, 'Missing hotel_name'); end if;
       if v_row.raw->>'title' is null then v_errors := array_append(v_errors, 'Missing title'); end if;
       if v_row.raw->>'starts_at' is null then v_errors := array_append(v_errors, 'Missing starts_at'); end if;
       if v_row.raw->>'hotel_name' is not null then
          select id into v_target_id from public.hotels where org_id = v_org_id and name = (v_row.raw->>'hotel_name');
          if v_target_id is null then
             v_errors := array_append(v_errors, 'Hotel not found: ' || (v_row.raw->>'hotel_name'));
          else
             v_normalized := v_normalized || jsonb_build_object('hotel_id', v_target_id);
             perform 1 from public.events where org_id = v_org_id and hotel_id = v_target_id 
                         and title = (v_row.raw->>'title') and starts_at = (v_row.raw->>'starts_at')::timestamptz;
             if found then v_action := 'update'; end if;
          end if;
       end if;

    elsif v_job.entity = 'products' then
       if v_row.raw->>'name' is null or v_row.raw->>'name' = '' then
          v_errors := array_append(v_errors, 'Missing name');
       end if;
       if v_row.raw->>'base_unit' not in ('kg', 'ud') then
          v_errors := array_append(v_errors, 'Invalid base_unit (must be kg or ud)');
       end if;
       if v_errors = '{}' then 
          select id into v_target_id from public.products where org_id = v_org_id and name = (v_row.raw->>'name');
          if v_target_id is not null then
             v_action := 'update';
             v_normalized := v_normalized || jsonb_build_object('id', v_target_id);
          end if;
       end if;

    elsif v_job.entity = 'staff' then
       if v_row.raw->>'full_name' is null or v_row.raw->>'full_name' = '' then
          v_errors := array_append(v_errors, 'Missing full_name');
       end if;
       if v_errors = '{}' then 
          select id into v_target_id from public.staff_members where org_id = v_org_id and full_name = (v_row.raw->>'full_name');
          if v_target_id is not null then
             v_action := 'update';
             v_normalized := v_normalized || jsonb_build_object('id', v_target_id);
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


-- 3. Update import_commit to handle products and staff
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
       on conflict (org_id, name) do nothing;

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

    elsif v_job.entity = 'products' then
       insert into public.products (org_id, name, base_unit, active)
       values (
         v_org_id,
         v_row.normalized->>'name',
         v_row.normalized->>'base_unit',
         coalesce((v_row.normalized->>'active')::boolean, true)
       )
       on conflict (org_id, name) do update
       set base_unit = excluded.base_unit,
           active = excluded.active;

    elsif v_job.entity = 'staff' then
       insert into public.staff_members (org_id, full_name, role, employment_type, home_hotel_id, notes, shift_pattern, max_shifts_per_week, active)
       values (
         v_org_id,
         v_row.normalized->>'full_name',
         coalesce(v_row.normalized->>'role', 'cocinero'),
         coalesce(v_row.normalized->>'employment_type', 'fijo'),
         (v_row.normalized->>'home_hotel_id')::uuid,
         v_row.normalized->>'notes',
         coalesce(v_row.normalized->>'shift_pattern', 'rotativo'),
         coalesce((v_row.normalized->>'max_shifts')::int, 5),
         coalesce((v_row.normalized->>'active')::boolean, true)
       )
       on conflict (org_id, full_name) do update
       set role = excluded.role,
           employment_type = excluded.employment_type,
           active = excluded.active;
    end if;
  end loop;

  -- Finalize Job
  update public.import_jobs set status = 'committed' where id = p_job_id;
  
  return v_job.summary;
end;
$$;
