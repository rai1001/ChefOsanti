-- Org admin helpers: list org members with emails (admin/manager only)

create or replace function public.org_list_members(p_org_id uuid)
returns table (
  user_id uuid,
  email text,
  role text,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.has_org_role(p_org_id, array['admin','manager']) then
    raise exception 'not authorized';
  end if;

  return query
  select
    m.user_id,
    u.email,
    m.role,
    coalesce(m.is_active, false) as is_active,
    m.created_at
  from public.org_memberships m
  join auth.users u on u.id = m.user_id
  where m.org_id = p_org_id
  order by m.created_at asc;
end;
$$;

grant execute on function public.org_list_members(uuid) to authenticated;
