-- IMP5: Dashboard metrics combining purchase orders and events

create view if not exists public.dashboard_purchase_event_metrics as
select
  coalesce(po.org_id, ev.org_id) as org_id,
  coalesce(po.hotel_id, ev.hotel_id) as hotel_id,
  date_trunc('day', coalesce(ev.event_date, po.created_at))::date as day,
  count(distinct ev.id) as events_count,
  count(distinct ev.id) filter (where ev.menu_status = 'confirmed') as confirmed_menus,
  count(*) filter (where po.status in ('draft', 'confirmed')) as pending_orders,
  count(*) filter (where po.status = 'received') as received_orders,
  coalesce(sum(po.total_estimated), 0) as total_order_value,
  coalesce(sum(po.total_estimated) filter (where po.status in ('draft', 'confirmed')), 0) as pending_value,
  coalesce(sum(po.total_estimated) filter (where po.status = 'received'), 0) as received_value
from public.purchase_orders po
left join public.events ev on ev.org_id = po.org_id and ev.hotel_id = po.hotel_id
group by coalesce(po.org_id, ev.org_id), coalesce(po.hotel_id, ev.hotel_id), day;

grant select on public.dashboard_purchase_event_metrics to authenticated;
grant select on public.dashboard_purchase_event_metrics to anon;

alter view public.dashboard_purchase_event_metrics enable row level security;

create policy "Dashboard metrics by membership"
  on public.dashboard_purchase_event_metrics
  for select
  using (public.is_org_member(org_id));
