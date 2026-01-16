-- S4: Escandallo de recetas (costes por linea y resumen)

create or replace view public.recipe_cost_breakdown
with (security_invoker = true)
as
select
  r.org_id,
  r.id as recipe_id,
  rl.id as line_id,
  rl.product_id,
  p.name as product_name,
  rl.qty,
  rl.unit,
  si.id as supplier_item_id,
  si.purchase_unit,
  si.price_per_unit,
  (si.price_per_unit is null) as missing_price,
  (si.purchase_unit is null or si.purchase_unit <> rl.unit) as unit_mismatch,
  case
    when si.price_per_unit is null or si.purchase_unit <> rl.unit then null
    else rl.qty * si.price_per_unit
  end as line_cost
from public.recipes r
join public.recipe_lines rl on rl.recipe_id = r.id
join public.products p on p.id = rl.product_id
left join public.supplier_items si
  on si.product_id = rl.product_id
  and si.is_primary = true
where public.is_org_member(r.org_id);

create or replace view public.recipe_cost_summary
with (security_invoker = true)
as
select
  r.org_id,
  r.id as recipe_id,
  r.default_servings,
  coalesce(sum(b.line_cost), 0) as total_cost,
  case
    when r.default_servings > 0 then coalesce(sum(b.line_cost), 0) / r.default_servings
    else 0
  end as cost_per_serving,
  count(*) filter (where b.missing_price) as missing_prices,
  count(*) filter (where b.unit_mismatch) as unit_mismatches
from public.recipes r
left join public.recipe_cost_breakdown b on b.recipe_id = r.id
where public.is_org_member(r.org_id)
group by r.org_id, r.id, r.default_servings;

grant select on public.recipe_cost_breakdown to authenticated;
grant select on public.recipe_cost_breakdown to anon;
grant select on public.recipe_cost_summary to authenticated;
grant select on public.recipe_cost_summary to anon;
