-- Allow org admins/managers to manage hotels
-- Defensive: ensure has_org_role exists in case RBAC hardening migration was skipped.

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

drop policy if exists "Hotels insert by membership" on public.hotels;
create policy "Hotels insert by membership"
  on public.hotels for insert
  with check (public.has_org_role(org_id, array['admin','manager']));

drop policy if exists "Hotels update by membership" on public.hotels;
create policy "Hotels update by membership"
  on public.hotels for update
  using (public.has_org_role(org_id, array['admin','manager']))
  with check (public.has_org_role(org_id, array['admin','manager']));

drop policy if exists "Hotels delete by membership" on public.hotels;
create policy "Hotels delete by membership"
  on public.hotels for delete
  using (public.has_org_role(org_id, array['admin','manager']));
