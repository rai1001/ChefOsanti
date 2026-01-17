-- A1: Roles en org_memberships (admin/manager/staff)

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'org_memberships'
      and column_name = 'role'
  ) then
    alter table public.org_memberships
      add column role text not null default 'manager'
        check (role in ('admin','manager','staff'));
  else
    alter table public.org_memberships
      alter column role set default 'manager';
    alter table public.org_memberships
      drop constraint if exists org_memberships_role_check;
    alter table public.org_memberships
      add constraint org_memberships_role_check check (role in ('admin','manager','staff'));
  end if;
end $$;

create index if not exists org_memberships_role_idx on public.org_memberships (org_id, user_id, role);
