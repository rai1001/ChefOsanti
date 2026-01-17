-- Allow org admins/managers to manage hotels

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
