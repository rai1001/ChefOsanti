-- AI0 Slice: Daily Brief & Gating

-- 1. Tabla ai_briefs
create table if not exists public.ai_briefs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  period text not null check (period in ('today', 'tomorrow', 'week')),
  content_md text not null,
  sources jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.ai_briefs enable row level security;

drop policy if exists "briefs select member" on public.ai_briefs;
create policy "briefs select member" on public.ai_briefs
  for select
  using (exists (
    select 1 from public.org_memberships m
    where m.org_id = ai_briefs.org_id
      and m.user_id = auth.uid()
  ));

-- Solo inserción vía RPC (o admin), pero explícitamente protegida por can_use_feature
drop policy if exists "briefs insert with feature" on public.ai_briefs;
create policy "briefs insert with feature" on public.ai_briefs
  for insert
  with check (
    public.can_use_feature('daily_brief', org_id)
    and
    exists (
       select 1 from public.org_memberships m
       where m.org_id = ai_briefs.org_id
         and m.user_id = auth.uid()
    )
  );

-- 2. Seed feature configuration
insert into public.ai_features (key, min_plan, min_role, is_enabled)
values ('daily_brief', 'pro', 'manager', true)
on conflict (key) do update set
  min_plan = excluded.min_plan,
  min_role = excluded.min_role;

-- 3. RPC: generate_daily_brief
create or replace function public.generate_daily_brief(p_org_id uuid, p_period text)
returns uuid
language plpgsql
security definer -- Security definer necesario para leer tablas que podrían tener políticas estrictas, aunque el usuario ya debería tener acceso. Principalmente para asegurar consistencia.
as $$
declare
  v_brief_id uuid;
  v_user_id uuid;
  v_range_start timestamptz;
  v_range_end timestamptz;
  v_event_count int;
  v_pax_total int;
  v_pending_orders int;
  v_content text;
begin
  v_user_id := auth.uid();

  -- Auth check membership
  if not exists (select 1 from public.org_memberships where org_id = p_org_id and user_id = v_user_id) then
    raise exception 'Access denied: User is not a member of this organization';
  end if;

  -- Auth check feature
  if not public.can_use_feature('daily_brief', p_org_id) then
    raise exception 'Feature denied: daily_brief requires PRO plan';
  end if;

  -- Determine time range
  if p_period = 'today' then
    v_range_start := current_date;
    v_range_end := current_date + interval '1 day';
  elsif p_period = 'tomorrow' then
    v_range_start := current_date + interval '1 day';
    v_range_end := current_date + interval '2 days';
  else -- week
    v_range_start := current_date;
    v_range_end := current_date + interval '7 days';
  end if;

  -- Collect Data (Mock logic if tables missing, simplistic logic otherwise)
  -- Events summary
  select 
    count(*), 
    coalesce(sum((data->>'pax')::int), 0)
  into v_event_count, v_pax_total
  from public.events 
  where org_id = p_org_id 
    and date >= v_range_start 
    and date < v_range_end;

  -- Mock Orders (assuming table exists or defaulting to 0 if not robustly queried)
  -- Para AI0 asumimos que 'purchase_orders' existe si Batch 4 pasó. Si no, 0.
  begin
    select count(*) into v_pending_orders 
    from public.purchase_orders 
    where org_id = p_org_id and status = 'pending';
  exception when others then
    v_pending_orders := 0;
  end;

  -- Generate Markdown
  v_content := E'# Brief Operativo: ' || p_period || E'\n\n' ||
               E'Generado el ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || E'\n\n' ||
               E'## Resumen\n' ||
               E'- **Eventos**: ' || v_event_count || E'\n' ||
               E'- **PAX Total**: ' || v_pax_total || E'\n' ||
               E'- **Pedidos Pendientes**: ' || v_pending_orders || E'\n\n';

  if v_event_count = 0 then
     v_content := v_content || E'> [!NOTE]\n> No hay eventos programados para este periodo.\n\n';
  else
     v_content := v_content || E'## Acciones Recomendadas\n' ||
                  E'- [ ] Revisar mise en place para ' || v_pax_total || E' pax.\n' ||
                  E'- [ ] Confirmar personal para los ' || v_event_count || E' servicios.\n';
  end if;
  
  if v_pending_orders > 0 then
      v_content := v_content || E'## Bloqueos\n' ||
                   E'> [!WARNING]\n> Hay ' || v_pending_orders || E' pedidos pendientes de revisión.\n';
  end if;

  -- Insert
  insert into public.ai_briefs (org_id, created_by, period, content_md, sources)
  values (p_org_id, v_user_id, p_period, v_content, jsonb_build_object('events', v_event_count, 'orders', v_pending_orders))
  returning id into v_brief_id;

  return v_brief_id;
end;
$$;
