-- Update import_commit to Sync (Delete Missing) for Events
-- Logic: 
-- 1. Track inserted/updated event_ids.
-- 2. Determine time range of the import (min_start, max_start).
-- 3. Delete events for the same Organization + Hotel within that range that were NOT touched.

CREATE OR REPLACE FUNCTION public.import_commit(p_job_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_job public.import_jobs%rowtype;
  v_row public.import_rows%rowtype;
  v_org_id uuid;
  v_event_id uuid;
  v_touched_ids uuid[] := '{}';
  v_min_date timestamptz;
  v_max_date timestamptz;
  v_hotel_id uuid;
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
       -- Capture Hotel ID (assume consistent per job, or take latest)
       v_hotel_id := (v_row.normalized->>'hotel_id')::uuid;

       insert into public.events (org_id, hotel_id, title, starts_at, ends_at, status, notes)
       values (
         v_org_id,
         v_hotel_id,
         v_row.normalized->>'title',
         (v_row.normalized->>'starts_at')::timestamptz,
         coalesce((v_row.normalized->>'ends_at')::timestamptz, (v_row.normalized->>'starts_at')::timestamptz + interval '1 hour'),
         coalesce(v_row.normalized->>'status', 'confirmed'),
         v_row.normalized->>'notes'
       )
       on conflict (org_id, hotel_id, title, starts_at) do update
       set notes = excluded.notes,
           ends_at = excluded.ends_at
       returning id into v_event_id;

       -- Track ID for Sync Delete
       v_touched_ids := array_append(v_touched_ids, v_event_id);

       -- Create Space Booking if space_id resolved (Manual Upsert)
       if v_row.normalized->>'space_id' is not null then
           update public.space_bookings 
           set starts_at = (v_row.normalized->>'starts_at')::timestamptz,
               ends_at = coalesce((v_row.normalized->>'ends_at')::timestamptz, (v_row.normalized->>'starts_at')::timestamptz + interval '1 hour')
           where event_id = v_event_id 
             and space_id = (v_row.normalized->>'space_id')::uuid;
             
           if not found then
               insert into public.space_bookings (id, org_id, event_id, space_id, starts_at, ends_at)
               values (
                 gen_random_uuid(),
                 v_org_id,
                 v_event_id,
                 (v_row.normalized->>'space_id')::uuid,
                 (v_row.normalized->>'starts_at')::timestamptz,
                 coalesce((v_row.normalized->>'ends_at')::timestamptz, (v_row.normalized->>'starts_at')::timestamptz + interval '1 hour')
               );
           end if;
       end if;
       
    end if;
  end loop;

  -- Post-Loop: Sync (Delete Missing) for Events
  if v_job.entity = 'events' and array_length(v_touched_ids, 1) > 0 then
      -- Calculate Time Range from the IMPORTED rows (source of truth)
      select min((normalized->>'starts_at')::timestamptz), max((normalized->>'starts_at')::timestamptz)
      into v_min_date, v_max_date
      from public.import_rows 
      where job_id = p_job_id;

      -- Pad max date to end of day? No, user implies "files cover periods".
      -- If file has Jan 1 and Jan 31, we assume it covers the whole confirmed range.
      -- Safer: Delete events within the v_min_date -> v_max_date window.
      -- Even safer: If the file represents a "Sheet", it's usually a contiguous block.
      
      -- Executing Delete
      delete from public.events
      where org_id = v_org_id
        and hotel_id = v_hotel_id
        and starts_at >= v_min_date
        and starts_at <= v_max_date + interval '1 day' -- buffer for same-day shifts?
        -- Actually, strictly between min and max matching might miss "other events on the same min/max days"?
        -- If I import Jan 1, 10:00.
        -- And DB has Jan 1, 12:00 (not in file).
        -- v_min = Jan 1 10:00, v_max = Jan 1 10:00.
        -- Deleting >= 10:00 and <= 10:00 would exclude 12:00.
        -- Correction: We want to cover the "Day Range".
        -- Let's truncate v_min to start of day, and v_max to end of day.
        
      and starts_at >= date_trunc('day', v_min_date)
      and starts_at <  date_trunc('day', v_max_date) + interval '1 day'
      and id <> ALL(v_touched_ids);
      
      -- Update summary with deleted count? (Not critical for now, JSON return is strict schema)
  end if;

  -- Finalize Job
  update public.import_jobs set status = 'committed' where id = p_job_id;
  
  return v_job.summary;
end;
$function$;
