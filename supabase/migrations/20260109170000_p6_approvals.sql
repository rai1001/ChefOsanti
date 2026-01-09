-- P6: Approvals System

-- 1. Add approval columns to purchase_orders
alter table public.purchase_orders 
add column if not exists approval_status text not null check (approval_status in ('pending', 'approved', 'rejected')) default 'pending';

-- 2. Add approval columns to event_purchase_orders
alter table public.event_purchase_orders 
add column if not exists approval_status text not null check (approval_status in ('pending', 'approved', 'rejected')) default 'pending';

-- 3. Create approvals table
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  entity_type text not null check (entity_type in ('purchase_order', 'event_purchase_order')),
  entity_id uuid not null,
  approved_by uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('approved', 'rejected')),
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

-- 4. RLS for approvals
alter table public.approvals enable row level security;

create policy "Approvals select member" on public.approvals for select
  using (public.is_org_member(org_id));

-- Only owners/admins can insert approvals
-- Assuming 'owner' or 'admin' role exists in org_memberships.role
create policy "Approvals insert admin" on public.approvals for insert
  with check (
    public.is_org_member(org_id) and 
    exists (
      select 1 from public.org_memberships m 
      where m.org_id = approvals.org_id 
      and m.user_id = auth.uid() 
      and m.role in ('owner', 'admin')
    )
  );

-- 5. Helper function and Trigger to sync status from approvals back to entities
create or replace function public.sync_approval_status()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.entity_type = 'purchase_order' then
    update public.purchase_orders set approval_status = new.status where id = new.entity_id;
  elsif new.entity_type = 'event_purchase_order' then
    update public.event_purchase_orders set approval_status = new.status where id = new.entity_id;
  end if;
  return new;
end;
$$;

create trigger approvals_sync_trigger
after insert on public.approvals
for each row execute function public.sync_approval_status();
