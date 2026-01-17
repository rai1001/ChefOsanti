-- Fix import_commit to create space_bookings
CREATE OR REPLACE FUNCTION public.import_commit(p_job_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_job public.import_jobs%rowtype;
  v_row public.import_rows%rowtype;
  v_summary jsonb;
  v_org_id uuid;
  v_event_id uuid;
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
         coalesce((v_row.normalized->>'ends_at')::timestamptz, (v_row.normalized->>'starts_at')::timestamptz + interval '1 hour'),
         coalesce(v_row.normalized->>'status', 'confirmed'),
         v_row.normalized->>'notes'
       )
       on conflict (org_id, hotel_id, title, starts_at) do update
       set notes = excluded.notes,
           ends_at = excluded.ends_at
       returning id into v_event_id;

       -- Create Space Booking if space_id resolved
       if v_row.normalized->>'space_id' is not null then
           insert into public.space_bookings (id, org_id, event_id, space_id, starts_at, ends_at)
           values (
             gen_random_uuid(),
             v_org_id,
             v_event_id,
             (v_row.normalized->>'space_id')::uuid,
             (v_row.normalized->>'starts_at')::timestamptz,
             coalesce((v_row.normalized->>'ends_at')::timestamptz, (v_row.normalized->>'starts_at')::timestamptz + interval '1 hour')
           )
           on conflict (event_id, space_id) do update
           set starts_at = excluded.starts_at,
               ends_at = excluded.ends_at;
       end if;
       
    end if;
  end loop;

  -- Finalize Job
  update public.import_jobs set status = 'committed' where id = p_job_id;
  
  return v_job.summary;
end;
$function$;

-- BACKFILL MISSING BOOKINGS FOR LATEST JOB
INSERT INTO space_bookings (id, org_id, event_id, space_id, starts_at, ends_at)
SELECT
  gen_random_uuid(),
  j.org_id,
  e.id,
  (r.normalized->>'space_id')::uuid,
  (r.normalized->>'starts_at')::timestamptz,
  coalesce((r.normalized->>'ends_at')::timestamptz, (r.normalized->>'starts_at')::timestamptz + interval '1 hour')
FROM import_rows r
JOIN import_jobs j ON j.id = r.job_id
JOIN events e ON
  e.org_id = j.org_id
  AND e.hotel_id = (r.normalized->>'hotel_id')::uuid
  AND e.title = (r.normalized->>'title')
  AND e.starts_at = (r.normalized->>'starts_at')::timestamptz
WHERE
  j.id = 'd5ec906e-521a-4f1a-8b4e-d4b1b7163820' -- LATEST JOB ID
  AND r.normalized->>'space_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM space_bookings sb
    WHERE sb.event_id = e.id AND sb.space_id = (r.normalized->>'space_id')::uuid
  );
