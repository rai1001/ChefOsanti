-- Fix list_expiry_alerts: alias columns to avoid ambiguity and keep RLS-friendly shape
create or replace function public.list_expiry_alerts(
  p_org_id uuid,
  p_status public.expiry_alert_status default 'open'::public.expiry_alert_status
) returns table(
  id uuid,
  batch_id uuid,
  rule_id uuid,
  status public.expiry_alert_status,
  created_at timestamptz,
  sent_at timestamptz,
  days_before integer,
  expires_at timestamptz,
  qty numeric,
  unit text,
  product_name text,
  location_id uuid,
  location_name text,
  hotel_id uuid,
  lot_code text,
  source public.stock_batch_source
) language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'forbidden';
  end if;

  with rules as (
    select r.id as rule_id, r.days_before, r.product_type
    from public.expiry_rules r
    where r.org_id = p_org_id
      and r.is_enabled = true
  ),
  batches as (
    select
      b.id as batch_id,
      b.expires_at,
      b.qty,
      b.unit,
      b.lot_code,
      b.source,
      b.location_id,
      b.supplier_item_id,
      b.preparation_id,
      b.org_id,
      coalesce(
        case
          when b.preparation_id is not null then
            case pr.process_type
              when 'frozen' then 'frozen'::public.product_type
              when 'pasteurized_frozen' then 'frozen'::public.product_type
              when 'pasteurized' then 'pasteurized'::public.product_type
              when 'vacuum' then 'pasteurized'::public.product_type
              else 'fresh'::public.product_type
            end
          else null
        end,
        si.product_type_override,
        p.product_type,
        'fresh'::public.product_type
      ) as product_type
    from public.stock_batches b
    left join public.supplier_items si on si.id = b.supplier_item_id
    left join public.products p on p.id = si.product_id
    left join public.preparations prep on prep.id = b.preparation_id
    left join public.preparation_runs pr on pr.stock_batch_id = b.id
    where b.org_id = p_org_id
      and b.expires_at is not null
      and b.qty > 0
  ),
  applied_rules as (
    select b.batch_id, r.rule_id, r.days_before
    from batches b
    join rules r on r.product_type is not distinct from b.product_type
    union all
    select b.batch_id, r.rule_id, r.days_before
    from batches b
    join rules r on r.product_type is null
    where not exists (
      select 1 from rules r2 where r2.product_type is not distinct from b.product_type
    )
  ),
  due as (
    select ar.batch_id, ar.rule_id, ar.days_before
    from applied_rules ar
    join batches b on b.batch_id = ar.batch_id
    where b.expires_at <= (now() + (ar.days_before || ' days')::interval)
  )
  insert into public.expiry_alerts (org_id, batch_id, rule_id, status)
  select p_org_id, d.batch_id, d.rule_id, 'open'::public.expiry_alert_status
  from due d
  on conflict (org_id, batch_id, rule_id) do nothing;

  return query
  select
    ea.id,
    ea.batch_id,
    ea.rule_id,
    ea.status,
    ea.created_at,
    ea.sent_at,
    r.days_before,
    b.expires_at,
    b.qty,
    b.unit,
    coalesce(si.name, prep.name, 'Lote') as product_name,
    loc.id as location_id,
    loc.name as location_name,
    loc.hotel_id,
    b.lot_code,
    b.source
  from public.expiry_alerts ea
  join rules r on r.rule_id = ea.rule_id
  join batches b on b.batch_id = ea.batch_id
  left join public.supplier_items si on si.id = b.supplier_item_id
  left join public.preparations prep on prep.id = b.preparation_id
  left join public.inventory_locations loc on loc.id = b.location_id
  where ea.org_id = p_org_id
    and ea.status = p_status
  order by ea.created_at desc;
end;
$$;
