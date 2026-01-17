-- S13: Recipes categories, search index, weighted cost, mise en place RPC

-- Ensure pg_trgm for indexed search
create extension if not exists pg_trgm with schema public;

-- Recipe categories constraint (enforced for new rows)
alter table public.recipes
  drop constraint if exists recipes_category_check;
alter table public.recipes
  add constraint recipes_category_check
  check (category is null or category in ('bases','salsas','platos','quinta_gama'))
  not valid;

-- Indexed search on recipe names
create index if not exists recipes_name_trgm_idx
  on public.recipes using gin (lower(name) gin_trgm_ops);

-- Weighted average cost by product (from received purchase orders)
create or replace view public.product_weighted_costs
with (security_invoker = true)
as
select
  p.org_id,
  p.id as product_id,
  p.base_unit,
  case
    when sum(pol.received_qty) filter (
      where po.status = 'received'
        and pol.unit_price is not null
        and pol.received_qty > 0
        and pol.purchase_unit = p.base_unit
    ) > 0
      then sum(pol.received_qty * pol.unit_price) filter (
        where po.status = 'received'
          and pol.unit_price is not null
          and pol.received_qty > 0
          and pol.purchase_unit = p.base_unit
      ) / nullif(
        sum(pol.received_qty) filter (
          where po.status = 'received'
            and pol.unit_price is not null
            and pol.received_qty > 0
            and pol.purchase_unit = p.base_unit
        ),
        0
      )
    else null
  end as unit_cost,
  max(pol.unit_price) filter (
    where po.status = 'received'
      and pol.unit_price is not null
      and pol.purchase_unit = p.base_unit
  ) as last_unit_price,
  max(po.received_at) filter (where po.status = 'received') as last_received_at
from public.products p
left join public.supplier_items si on si.product_id = p.id
left join public.purchase_order_lines pol on pol.supplier_item_id = si.id
left join public.purchase_orders po on po.id = pol.purchase_order_id
where public.is_org_member(p.org_id)
group by p.org_id, p.id, p.base_unit;

-- Use weighted cost in recipe cost breakdown
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
  coalesce(si.purchase_unit, p.base_unit) as purchase_unit,
  coalesce(pwc.unit_cost, si.price_per_unit) as price_per_unit,
  (coalesce(pwc.unit_cost, si.price_per_unit) is null) as missing_price,
  (p.base_unit is null or p.base_unit <> rl.unit) as unit_mismatch,
  case
    when p.base_unit is null or p.base_unit <> rl.unit then null
    when coalesce(pwc.unit_cost, si.price_per_unit) is null then null
    else rl.qty * coalesce(pwc.unit_cost, si.price_per_unit)
  end as line_cost
from public.recipes r
join public.recipe_lines rl on rl.recipe_id = r.id
join public.products p on p.id = rl.product_id
left join public.product_weighted_costs pwc on pwc.product_id = rl.product_id
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

grant select on public.product_weighted_costs to authenticated;

-- Mise en place RPC
create or replace function public.compute_recipe_mise_en_place(
  p_recipe_id uuid,
  p_servings numeric default null,
  p_packs numeric default null
) returns table (
  product_id uuid,
  product_name text,
  qty numeric,
  unit text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_recipe record;
  v_target numeric;
begin
  select id, default_servings into v_recipe
  from public.recipes
  where id = p_recipe_id;

  if not found then
    raise exception 'recipe not found';
  end if;

  if p_servings is null and p_packs is null then
    raise exception 'servings or packs required';
  end if;

  if p_servings is not null and p_packs is not null then
    raise exception 'choose servings or packs, not both';
  end if;

  if p_servings is not null then
    if p_servings <= 0 then
      raise exception 'servings must be > 0';
    end if;
    v_target := p_servings;
  else
    if p_packs <= 0 then
      raise exception 'packs must be > 0';
    end if;
    v_target := p_packs * v_recipe.default_servings;
  end if;

  return query
  select
    rl.product_id,
    p.name as product_name,
    (rl.qty * (v_target / v_recipe.default_servings)) as qty,
    rl.unit
  from public.recipe_lines rl
  join public.products p on p.id = rl.product_id
  where rl.recipe_id = v_recipe.id;
end;
$$;

grant execute on function public.compute_recipe_mise_en_place(uuid, numeric, numeric) to authenticated;
