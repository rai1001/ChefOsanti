-- Improve Upsert Logic for Events Import
-- Allows updating status (cancelled/confirmed) and ends_at on re-import

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
       -- 1. Upsert Event
       -- Added: Update status and ends_at on conflict
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
           status = excluded.status,
           ends_at = excluded.ends_at
       returning id into v_event_id;
       
       -- 2. Create/Update Space Booking
       if v_row.normalized->>'space_id' is not null then
          insert into public.space_bookings (org_id, event_id, space_id, starts_at, ends_at)
          values (
             v_org_id,
             v_event_id,
             (v_row.normalized->>'space_id')::uuid,
             (v_row.normalized->>'starts_at')::timestamptz,
             coalesce((v_row.normalized->>'ends_at')::timestamptz, (v_row.normalized->>'starts_at')::timestamptz + interval '1 hour')
          )
          on conflict do nothing;
       end if;

    end if;
  end loop;

  -- Finalize Job
  update public.import_jobs set status = 'committed' where id = p_job_id;
  
  return v_job.summary;
end;
$$;
