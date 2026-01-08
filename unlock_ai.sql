
-- Ejecuta esto en el SQL Editor de Supabase (https://supabase.com/dashboard/project/nyxaofsiymhrpcywdzew/sql)

insert into public.org_plans(org_id, plan)
select org_id, 'vip'
from public.org_memberships
where user_id = (select id from auth.users where email = 'pagopaypal1974@gmail.com')
on conflict (org_id) do update set plan = 'vip';
