-- Phase 5: RBAC Hardening
-- Adds helpers for role-based access and updates RLS for core purchasing tables.

-- 1. Helpers
create or replace function public.has_org_role(p_org_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_memberships m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.role = any(p_roles)
  );
$$;

-- 2. Hardening Suppliers
-- Allow only high-privilege roles to write
drop policy if exists "Suppliers insert by membership" on public.suppliers;
create policy "Suppliers insert by membership"
  on public.suppliers for insert
  with check (public.has_org_role(org_id, array['owner', 'admin', 'manager', 'purchaser']));

drop policy if exists "Suppliers update by membership" on public.suppliers;
create policy "Suppliers update by membership"
  on public.suppliers for update
  using (public.has_org_role(org_id, array['owner', 'admin', 'manager', 'purchaser']))
  with check (public.has_org_role(org_id, array['owner', 'admin', 'manager', 'purchaser']));

drop policy if exists "Suppliers delete by membership" on public.suppliers;
create policy "Suppliers delete by membership"
  on public.suppliers for delete
  using (public.has_org_role(org_id, array['owner', 'admin', 'manager', 'purchaser']));

-- 3. Hardening ingredients
drop policy if exists "Ingredients write by membership" on public.ingredients;
create policy "Ingredients write by membership"
  on public.ingredients for all
  using (public.has_org_role(org_id, array['owner', 'admin', 'manager', 'purchaser']))
  with check (public.has_org_role(org_id, array['owner', 'admin', 'manager', 'purchaser']));

-- 4. Hardening Purchase Orders
drop policy if exists "PO insert by membership" on public.purchase_orders;
create policy "PO insert by membership"
  on public.purchase_orders for insert
  with check (public.has_org_role(org_id, array['owner', 'admin', 'manager', 'purchaser']));

drop policy if exists "PO update by membership" on public.purchase_orders;
create policy "PO update by membership"
  on public.purchase_orders for update
  using (public.has_org_role(org_id, array['owner', 'admin', 'manager', 'purchaser']))
  with check (public.has_org_role(org_id, array['owner', 'admin', 'manager', 'purchaser']));

drop policy if exists "PO delete by membership" on public.purchase_orders;
create policy "PO delete by membership"
  on public.purchase_orders for delete
  using (public.has_org_role(org_id, array['owner', 'admin', 'manager', 'purchaser']));
