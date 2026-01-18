-- IMP3: Restore products import + auto-create suppliers from product rows

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
  v_space_id uuid;
  v_org_id uuid;
  v_supplier_id uuid;
  v_name text;
  v_base_unit text;
  v_purchase_unit text;
  v_supplier_name text;

  c_ok int := 0;
  c_error int := 0;
  c_insert int := 0;
  c_update int := 0;
begin
  select * into v_job from public.import_jobs where id = p_job_id;
  v_org_id := v_job.org_id;

  if v_job.created_by <> auth.uid() then
    -- Optional: keep creator check soft to match current behavior.
  end if;

  for v_row in select * from public.import_rows where job_id = p_job_id order by row_number
  loop
    v_errors := '{}';
    v_normalized := v_row.raw;
    v_action := 'insert';

    if v_job.entity = 'suppliers' then
      if trim(coalesce(v_row.raw->>'name', '')) = '' then
        v_errors := array_append(v_errors, 'Missing name');
      end if;
      if v_errors = '{}' then
        select id into v_target_id
        from public.suppliers
        where org_id = v_org_id and name = (v_row.raw->>'name');
        if v_target_id is not null then
          v_action := 'update';
          v_normalized := v_normalized || jsonb_build_object('id', v_target_id);
        end if;
      end if;

    elsif v_job.entity = 'supplier_items' then
      v_supplier_name := trim(coalesce(v_row.raw->>'supplier_name', v_row.raw->>'proveedor', v_row.raw->>'supplier', ''));
      if v_supplier_name = '' then
        v_errors := array_append(v_errors, 'Missing supplier_name');
      end if;
      if trim(coalesce(v_row.raw->>'name', '')) = '' then
        v_errors := array_append(v_errors, 'Missing name');
      end if;

      if v_supplier_name <> '' then
        select id into v_target_id
        from public.suppliers
        where org_id = v_org_id and name = v_supplier_name;
        if v_target_id is null then
          v_errors := array_append(v_errors, 'Supplier not found: ' || v_supplier_name);
        else
          v_normalized := v_normalized || jsonb_build_object('supplier_id', v_target_id, 'supplier_name', v_supplier_name);
          perform 1 from public.supplier_items where supplier_id = v_target_id and name = (v_row.raw->>'name');
          if found then v_action := 'update'; end if;
        end if;
      end if;

      v_purchase_unit := lower(trim(coalesce(v_row.raw->>'purchase_unit', v_row.raw->>'purchaseUnit', v_row.raw->>'unidad_compra', v_row.raw->>'unidad compra', '')));
      if v_purchase_unit in ('kg', 'kgs', 'kilo', 'kilogramo', 'kilogramos') then
        v_purchase_unit := 'kg';
      elsif v_purchase_unit in ('ud', 'uds', 'unidad', 'unidades', 'unit', 'units', 'pcs', 'pieza', 'pzas') then
        v_purchase_unit := 'ud';
      end if;
      if v_purchase_unit not in ('kg', 'ud') then
        v_errors := array_append(v_errors, 'Invalid unit (must be kg or ud)');
      else
        v_normalized := v_normalized || jsonb_build_object('purchase_unit', v_purchase_unit);
      end if;

    elsif v_job.entity = 'events' then
      if v_row.raw->>'hotel_id' is null then v_errors := array_append(v_errors, 'Missing hotel_id'); end if;
      if trim(coalesce(v_row.raw->>'title', '')) = '' then v_errors := array_append(v_errors, 'Missing title'); end if;
      if v_row.raw->>'starts_at' is null then v_errors := array_append(v_errors, 'Missing starts_at'); end if;

      if v_row.raw->>'hotel_id' is not null then
        perform 1 from public.hotels where id = (v_row.raw->>'hotel_id')::uuid and org_id = v_org_id;
        if not found then v_errors := array_append(v_errors, 'Invalid hotel_id'); end if;
      end if;

      if v_row.raw->>'space_name' is not null and v_row.raw->>'hotel_id' is not null then
        select id into v_space_id
        from public.spaces
        where org_id = v_org_id
          and hotel_id = (v_row.raw->>'hotel_id')::uuid
          and lower(name) = lower(v_row.raw->>'space_name');
        if v_space_id is null then
          v_errors := array_append(v_errors, 'Space not found: ' || (v_row.raw->>'space_name'));
        else
          v_normalized := v_normalized || jsonb_build_object('space_id', v_space_id);
        end if;
      end if;

      if v_errors = '{}' then
        select id into v_target_id
        from public.events
        where org_id = v_org_id
          and hotel_id = (v_row.raw->>'hotel_id')::uuid
          and title = (v_row.raw->>'title')
          and starts_at = (v_row.raw->>'starts_at')::timestamptz;
        if v_target_id is not null then
          v_action := 'update';
          v_normalized := v_normalized || jsonb_build_object('event_id', v_target_id);
        end if;
      end if;

    elsif v_job.entity = 'products' then
      v_name := trim(coalesce(v_row.raw->>'name', v_row.raw->>'nombre', ''));
      if v_name = '' then
        v_errors := array_append(v_errors, 'Missing name');
      end if;

      v_base_unit := lower(trim(coalesce(
        v_row.raw->>'base_unit',
        v_row.raw->>'baseUnit',
        v_row.raw->>'unidad',
        v_row.raw->>'unidad_base',
        v_row.raw->>'unit',
        ''
      )));
      if v_base_unit in ('kg', 'kgs', 'kilo', 'kilogramo', 'kilogramos') then
        v_base_unit := 'kg';
      elsif v_base_unit in ('ud', 'uds', 'unidad', 'unidades', 'unit', 'units', 'pcs', 'pieza', 'pzas') then
        v_base_unit := 'ud';
      end if;

      if v_base_unit not in ('kg', 'ud') then
        v_errors := array_append(v_errors, 'Invalid base_unit (must be kg or ud)');
      end if;

      v_supplier_name := trim(coalesce(
        v_row.raw->>'supplier_name',
        v_row.raw->>'proveedor',
        v_row.raw->>'supplier',
        v_row.raw->>'provider',
        ''
      ));
      if v_supplier_name <> '' then
        select id into v_supplier_id
        from public.suppliers
        where org_id = v_org_id and name = v_supplier_name;
        v_normalized := v_normalized || jsonb_build_object('supplier_name', v_supplier_name);
        if v_supplier_id is not null then
          v_normalized := v_normalized || jsonb_build_object('supplier_id', v_supplier_id);
        end if;
      end if;

      v_purchase_unit := lower(trim(coalesce(
        v_row.raw->>'purchase_unit',
        v_row.raw->>'purchaseUnit',
        v_row.raw->>'unidad_compra',
        v_row.raw->>'unidad compra',
        ''
      )));
      if v_purchase_unit in ('kg', 'kgs', 'kilo', 'kilogramo', 'kilogramos') then
        v_purchase_unit := 'kg';
      elsif v_purchase_unit in ('ud', 'uds', 'unidad', 'unidades', 'unit', 'units', 'pcs', 'pieza', 'pzas') then
        v_purchase_unit := 'ud';
      elsif v_purchase_unit = '' then
        v_purchase_unit := v_base_unit;
      end if;

      if v_purchase_unit not in ('kg', 'ud') then
        v_errors := array_append(v_errors, 'Invalid purchase_unit (must be kg or ud)');
      end if;

      v_normalized := v_normalized || jsonb_build_object(
        'name', v_name,
        'base_unit', v_base_unit,
        'purchase_unit', v_purchase_unit
      );

      if v_errors = '{}' then
        select id into v_target_id
        from public.products
        where org_id = v_org_id and name = v_name;
        if v_target_id is not null then
          v_action := 'update';
          v_normalized := v_normalized || jsonb_build_object('id', v_target_id);
        end if;
      end if;

    elsif v_job.entity = 'staff' then
      if trim(coalesce(v_row.raw->>'full_name', '')) = '' then
        v_errors := array_append(v_errors, 'Missing full_name');
      end if;
      if v_errors = '{}' then
        select id into v_target_id
        from public.staff_members
        where org_id = v_org_id and full_name = (v_row.raw->>'full_name');
        if v_target_id is not null then
          v_action := 'update';
          v_normalized := v_normalized || jsonb_build_object('id', v_target_id);
        end if;
      end if;
    end if;

    update public.import_rows
    set errors = v_errors, normalized = v_normalized, action = v_action
    where id = v_row.id;

    if array_length(v_errors, 1) > 0 then
      c_error := c_error + 1;
    else
      c_ok := c_ok + 1;
      if v_action = 'insert' then c_insert := c_insert + 1; else c_update := c_update + 1; end if;
    end if;
  end loop;

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

create or replace function public.import_commit(p_job_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_job public.import_jobs%rowtype;
  v_row public.import_rows%rowtype;
  v_org_id uuid;
  v_event_id uuid;
  v_touched_ids uuid[] := '{}';
  v_min_date timestamptz;
  v_max_date timestamptz;
  v_hotel_id uuid;
  v_product_id uuid;
  v_supplier_id uuid;
  v_supplier_name text;
  v_purchase_unit text;
  v_rounding_rule text;
  v_is_primary boolean;
begin
  select * into v_job from public.import_jobs where id = p_job_id;
  v_org_id := v_job.org_id;

  if v_job.status <> 'validated' then raise exception 'Job must be validated'; end if;
  if (v_job.summary->>'errors')::int > 0 then raise exception 'Cannot commit with errors'; end if;

  for v_row in select * from public.import_rows where job_id = p_job_id order by row_number
  loop
    if v_job.entity = 'suppliers' then
      insert into public.suppliers (org_id, name)
      values (v_org_id, v_row.normalized->>'name')
      on conflict (org_id, name) do nothing;

    elsif v_job.entity = 'supplier_items' then
      insert into public.supplier_items (
        supplier_id,
        name,
        purchase_unit,
        pack_size,
        rounding_rule,
        price_per_unit,
        notes,
        product_id,
        is_primary
      )
      values (
        (v_row.normalized->>'supplier_id')::uuid,
        v_row.normalized->>'name',
        v_row.normalized->>'purchase_unit',
        (nullif(v_row.normalized->>'pack_size', ''))::numeric,
        coalesce(v_row.normalized->>'rounding_rule', 'none'),
        (nullif(v_row.normalized->>'price', ''))::numeric,
        v_row.normalized->>'notes',
        (v_row.normalized->>'product_id')::uuid,
        coalesce((v_row.normalized->>'is_primary')::boolean, false)
      )
      on conflict (supplier_id, name) do update
      set purchase_unit = excluded.purchase_unit,
          price_per_unit = excluded.price_per_unit,
          pack_size = excluded.pack_size,
          rounding_rule = excluded.rounding_rule,
          product_id = coalesce(supplier_items.product_id, excluded.product_id),
          is_primary = case when supplier_items.is_primary then true else excluded.is_primary end;

    elsif v_job.entity = 'events' then
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

      v_touched_ids := array_append(v_touched_ids, v_event_id);

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

    elsif v_job.entity = 'products' then
      insert into public.products (org_id, name, base_unit, category, active)
      values (
        v_org_id,
        v_row.normalized->>'name',
        v_row.normalized->>'base_unit',
        v_row.normalized->>'category',
        coalesce((v_row.normalized->>'active')::boolean, true)
      )
      on conflict (org_id, name) do update
      set base_unit = excluded.base_unit,
          category = excluded.category,
          active = excluded.active
      returning id into v_product_id;

      v_supplier_name := trim(coalesce(v_row.normalized->>'supplier_name', ''));
      if v_supplier_name <> '' then
        v_supplier_id := (v_row.normalized->>'supplier_id')::uuid;
        if v_supplier_id is null then
          insert into public.suppliers (org_id, name)
          values (v_org_id, v_supplier_name)
          on conflict (org_id, name) do nothing;

          select id into v_supplier_id
          from public.suppliers
          where org_id = v_org_id and name = v_supplier_name;
        end if;

        if v_supplier_id is not null then
          v_purchase_unit := coalesce(v_row.normalized->>'purchase_unit', v_row.normalized->>'base_unit', 'ud');
          v_rounding_rule := coalesce(v_row.normalized->>'rounding_rule', 'none');
          v_is_primary := coalesce((v_row.normalized->>'is_primary')::boolean, false);
          if not v_is_primary then
            perform 1 from public.supplier_items where product_id = v_product_id and is_primary = true;
            if not found then v_is_primary := true; end if;
          end if;

          insert into public.supplier_items (
            supplier_id,
            name,
            purchase_unit,
            pack_size,
            rounding_rule,
            price_per_unit,
            notes,
            product_id,
            is_primary
          )
          values (
            v_supplier_id,
            v_row.normalized->>'name',
            v_purchase_unit,
            (nullif(v_row.normalized->>'pack_size', ''))::numeric,
            v_rounding_rule,
            coalesce(
              (nullif(v_row.normalized->>'price', ''))::numeric,
              (nullif(v_row.normalized->>'price_per_unit', ''))::numeric,
              (nullif(v_row.normalized->>'precio', ''))::numeric
            ),
            v_row.normalized->>'notes',
            v_product_id,
            v_is_primary
          )
          on conflict (supplier_id, name) do update
          set purchase_unit = excluded.purchase_unit,
              price_per_unit = excluded.price_per_unit,
              pack_size = excluded.pack_size,
              rounding_rule = excluded.rounding_rule,
              product_id = coalesce(supplier_items.product_id, excluded.product_id),
              is_primary = case when supplier_items.is_primary then true else excluded.is_primary end;
        end if;
      end if;

    elsif v_job.entity = 'staff' then
      insert into public.staff_members (
        org_id,
        full_name,
        role,
        employment_type,
        home_hotel_id,
        notes,
        shift_pattern,
        max_shifts_per_week,
        active
      )
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

  if v_job.entity = 'events' and array_length(v_touched_ids, 1) > 0 then
    select min((normalized->>'starts_at')::timestamptz), max((normalized->>'starts_at')::timestamptz)
    into v_min_date, v_max_date
    from public.import_rows
    where job_id = p_job_id;

    delete from public.events
    where org_id = v_org_id
      and hotel_id = v_hotel_id
      and starts_at >= date_trunc('day', v_min_date)
      and starts_at < date_trunc('day', v_max_date) + interval '1 day'
      and id <> all(v_touched_ids);
  end if;

  update public.import_jobs set status = 'committed' where id = p_job_id;

  return v_job.summary;
end;
$$;
