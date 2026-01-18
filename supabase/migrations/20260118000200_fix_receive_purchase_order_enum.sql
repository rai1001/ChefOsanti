-- Ensure receive_purchase_order casts enum values explicitly to avoid text/enum mismatch
create or replace function public.receive_purchase_order(
  p_order_id uuid,
  p_lines jsonb
) returns void
language plpgsql
as $$
declare
  po_org uuid;
  po_status public.purchase_order_status;
  line record;
  all_full boolean := true;
begin
  select org_id, status into po_org, po_status from public.purchase_orders where id = p_order_id;
  if po_org is null then
    raise exception 'purchase order not found';
  end if;
  if po_status <> 'ordered'::public.purchase_order_status then
    raise exception 'purchase order must be ordered to receive';
  end if;

  for line in select * from jsonb_to_recordset(p_lines) as (line_id uuid, received_qty numeric) loop
    update public.purchase_order_lines
    set received_qty = line.received_qty
    where id = line.line_id
      and purchase_order_id = p_order_id
      and org_id = po_org;
  end loop;

  update public.ingredients ing
  set stock = stock + sub.received_qty
  from (
    select pol.ingredient_id, pol.received_qty
    from public.purchase_order_lines pol
    where pol.purchase_order_id = p_order_id
      and pol.org_id = po_org
  ) sub
  where ing.id = sub.ingredient_id;

  select bool_and(received_qty >= requested_qty)
  into all_full
  from public.purchase_order_lines
  where purchase_order_id = p_order_id;

  update public.purchase_orders
  set status = 'received'::public.purchase_order_status,
      received_at = timezone('utc', now()),
      received_state = case when all_full then 'full'::public.purchase_order_received_state else 'partial'::public.purchase_order_received_state end
  where id = p_order_id;
end;
$$;
