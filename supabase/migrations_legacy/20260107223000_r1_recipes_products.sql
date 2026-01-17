-- R1: productos y recetas globales por org

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  base_unit text not null check (base_unit in ('kg','ud')),
  category text null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (org_id, name)
);

create index if not exists products_org_idx on public.products (org_id);
create index if not exists products_category_idx on public.products (category);

-- ingredients: vinculo opcional a product
alter table public.ingredients
  add column if not exists product_id uuid null references public.products(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_indexes where tablename = 'ingredients' and indexname = 'ingredients_hotel_product_uniq'
  ) then
    execute 'create unique index ingredients_hotel_product_uniq on public.ingredients (hotel_id, product_id) where product_id is not null';
  end if;
end$$;

create or replace function public.validate_ingredient_product()
returns trigger
language plpgsql
as $$
declare
  prod_org uuid;
begin
  if new.product_id is null then
    return new;
  end if;
  select org_id into prod_org from public.products where id = new.product_id;
  if prod_org is null then
    raise exception 'product not found for ingredient';
  end if;
  if prod_org <> new.org_id then
    raise exception 'org mismatch between ingredient and product';
  end if;
  return new;
end;
$$;

drop trigger if exists ingredients_validate_product on public.ingredients;
create trigger ingredients_validate_product
before insert or update on public.ingredients
for each row execute function public.validate_ingredient_product();

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  category text null,
  default_servings int not null default 1 check (default_servings > 0),
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (org_id, name)
);

create index if not exists recipes_org_idx on public.recipes (org_id);
create index if not exists recipes_category_idx on public.recipes (category);

create table if not exists public.recipe_lines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  qty numeric not null check (qty >= 0),
  unit text not null check (unit in ('kg','ud')),
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (recipe_id, product_id)
);

create index if not exists recipe_lines_recipe_idx on public.recipe_lines (recipe_id);
create index if not exists recipe_lines_org_idx on public.recipe_lines (org_id);

create or replace function public.validate_recipe_line()
returns trigger
language plpgsql
as $$
declare
  recipe_org uuid;
  product_org uuid;
  product_unit text;
begin
  select org_id into recipe_org from public.recipes where id = new.recipe_id;
  select org_id, base_unit into product_org, product_unit from public.products where id = new.product_id;
  if recipe_org is null or product_org is null then
    raise exception 'recipe or product missing for recipe_line';
  end if;
  if recipe_org <> new.org_id or product_org <> new.org_id then
    raise exception 'org mismatch in recipe_line';
  end if;
  if product_unit is not null and product_unit <> new.unit then
    raise exception 'unit must match product base_unit';
  end if;
  return new;
end;
$$;

drop trigger if exists recipe_lines_validate on public.recipe_lines;
create trigger recipe_lines_validate
before insert or update on public.recipe_lines
for each row execute function public.validate_recipe_line();

-- RLS
alter table public.products enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_lines enable row level security;

drop policy if exists "Products by membership" on public.products;
create policy "Products by membership"
  on public.products
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "Recipes by membership" on public.recipes;
create policy "Recipes by membership"
  on public.recipes
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));

drop policy if exists "Recipe lines by membership" on public.recipe_lines;
create policy "Recipe lines by membership"
  on public.recipe_lines
  for all
  using (public.is_org_member(org_id))
  with check (public.is_org_member(org_id));
