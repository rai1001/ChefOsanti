-- Fix Import Validation Logic
-- 1. Updates import_validate to use hotel_id correctly (instead of hotel_name)
-- 2. Checks for empty/whitespace strings better
-- 3. Handles space logic properly

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

  if v_job.created_by <> auth.uid() then
    -- Optional: check stronger roles if needed, for now just creator
    -- raise exception 'Access denied to job';
  end if;

  -- Iterate rows
  for v_row in select * from public.import_rows where job_id = p_job_id order by row_number
  loop
    v_errors := '{}';
    v_normalized := v_row.raw;
    v_action := 'insert';

    if v_job.entity = 'suppliers' then
       if trim(coalesce(v_row.raw->>'name', '')) = '' then v_errors := array_append(v_errors, 'Missing name'); end if;
       if v_errors = '{}' then 
          select id into v_target_id from public.suppliers where org_id = v_org_id and name = (v_row.raw->>'name');
          if v_target_id is not null then v_action := 'update'; v_normalized := v_normalized || jsonb_build_object('id', v_target_id); end if;
       end if;

    elsif v_job.entity = 'supplier_items' then
       if trim(coalesce(v_row.raw->>'supplier_name', '')) = '' then v_errors := array_append(v_errors, 'Missing supplier_name'); end if;
       if trim(coalesce(v_row.raw->>'name', '')) = '' then v_errors := array_append(v_errors, 'Missing name'); end if;

       if v_row.raw->>'supplier_name' is not null then
          select id into v_target_id from public.suppliers where org_id = v_org_id and name = (v_row.raw->>'supplier_name');
          if v_target_id is null then v_errors := array_append(v_errors, 'Supplier not found: ' || (v_row.raw->>'supplier_name'));
          else
             v_normalized := v_normalized || jsonb_build_object('supplier_id', v_target_id);
             perform 1 from public.supplier_items where supplier_id = v_target_id and name = (v_row.raw->>'name');
             if found then v_action := 'update'; end if;
          end if;
       end if;

    elsif v_job.entity = 'events' then
       -- CHECK hotel_id NOT hotel_name
       if v_row.raw->>'hotel_id' is null then v_errors := array_append(v_errors, 'Missing hotel_id'); end if;
       if trim(coalesce(v_row.raw->>'title', '')) = '' then v_errors := array_append(v_errors, 'Missing title'); end if;
       if v_row.raw->>'starts_at' is null then v_errors := array_append(v_errors, 'Missing starts_at'); end if;

       if v_row.raw->>'hotel_id' is not null then
           -- Verify hotel belongs to org
           perform 1 from public.hotels where id = (v_row.raw->>'hotel_id')::uuid and org_id = v_org_id;
           if not found then v_errors := array_append(v_errors, 'Invalid hotel_id'); end if;
       end if;

       -- Lookup Space (Optional - warn/skip if missing, or just pass id if provided?)
       -- Logic: If space_name provided, try to resolve it. If not found, ignore (creates booking without space? or fails?)
       -- Current requirement: "Mode Planning: las columnas restantes se interpretan como Salas"
       -- If space resolves, we add space_id.
       if v_row.raw->>'space_name' is not null and v_row.raw->>'hotel_id' is not null then
           select id into v_target_id from public.spaces 
           where org_id = v_org_id 
             and hotel_id = (v_row.raw->>'hotel_id')::uuid 
             and lower(name) = lower(v_row.raw->>'space_name');
           
           if v_target_id is not null then
                v_normalized := v_normalized || jsonb_build_object('space_id', v_target_id);
           else
                -- If space not found, do we error? 
                -- Ideally yes, unless we auto-create.
                -- Let's ERROR for now to prompt user to create spaces, or maybe just warn?
                -- "Space not found" is a valid error.
                v_errors := array_append(v_errors, 'Space not found: ' || (v_row.raw->>'space_name'));
           end if;
       end if;

       -- Check Duplicate
       if v_errors = '{}' then 
           select id into v_target_id from public.events 
           where org_id = v_org_id 
             and hotel_id = (v_row.raw->>'hotel_id')::uuid 
             and title = (v_row.raw->>'title') 
             and starts_at = (v_row.raw->>'starts_at')::timestamptz;
           
           if v_target_id is not null then
               v_action := 'update';
               v_normalized := v_normalized || jsonb_build_object('event_id', v_target_id);
           end if;
       end if;

    end if;

    update public.import_rows 
    set errors = v_errors, normalized = v_normalized, action = v_action
    where id = v_row.id;

    if array_length(v_errors, 1) > 0 then c_error := c_error + 1;
    else c_ok := c_ok + 1; if v_action = 'insert' then c_insert := c_insert + 1; else c_update := c_update + 1; end if;
    end if;
  end loop;

  update public.import_jobs
  set status = 'validated',
      summary = jsonb_build_object('total', (c_ok + c_error), 'ok', c_ok, 'errors', c_error, 'inserted', c_insert, 'updated', c_update)
  where id = p_job_id
  returning summary into v_job.summary;

  return v_job.summary;
end;
$$;
