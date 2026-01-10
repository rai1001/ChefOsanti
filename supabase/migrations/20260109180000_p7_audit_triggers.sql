-- Phase 7: Global Audit Triggers
-- Centralized function to log changes in master tables

create or replace function public.fn_audit_log_master_change()
returns trigger
language plpgsql
security definer
as $$
declare
  v_org_id uuid;
  v_metadata jsonb;
begin
  if (TG_OP = 'DELETE') then
    v_org_id := OLD.org_id;
    v_metadata := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'old', row_to_json(OLD)
    );
  else
    v_org_id := NEW.org_id;
    v_metadata := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'new', row_to_json(NEW)
    );
    if (TG_OP = 'UPDATE') then
      v_metadata := v_metadata || jsonb_build_object('old', row_to_json(OLD));
    end if;
  end if;

  insert into public.audit_logs (org_id, user_id, level, event, metadata)
  values (
    v_org_id,
    auth.uid(),
    'info',
    TG_TABLE_NAME || ' ' || lower(TG_OP),
    v_metadata
  );

  if (TG_OP = 'DELETE') then
    return OLD;
  end if;
  return NEW;
end;
$$;

-- Apply to master tables
drop trigger if exists tr_audit_suppliers on public.suppliers;
create trigger tr_audit_suppliers after insert or update or delete on public.suppliers
for each row execute function public.fn_audit_log_master_change();

-- drop trigger if exists tr_audit_supplier_items on public.supplier_items;
-- create trigger tr_audit_supplier_items after insert or update or delete on public.supplier_items
-- for each row execute function public.fn_audit_log_master_change();

drop trigger if exists tr_audit_products on public.products;
create trigger tr_audit_products after insert or update or delete on public.products
for each row execute function public.fn_audit_log_master_change();

drop trigger if exists tr_audit_recipes on public.recipes;
create trigger tr_audit_recipes after insert or update or delete on public.recipes
for each row execute function public.fn_audit_log_master_change();

drop trigger if exists tr_audit_staff_members on public.staff_members;
create trigger tr_audit_staff_members after insert or update or delete on public.staff_members
for each row execute function public.fn_audit_log_master_change();

drop trigger if exists tr_audit_events on public.events;
create trigger tr_audit_events after insert or update or delete on public.events
for each row execute function public.fn_audit_log_master_change();
