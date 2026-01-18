# RLS policies
Tables use `org_id` for tenant.
## Helper functions
create function current_org_id() returns uuid as $$
  select org_id from org_members where user_id = auth.uid() and is_active limit 1;
$$ language sql stable;
create function is_member(role text) returns boolean as $$
  select true from org_members where user_id=auth.uid() and org_id=current_org_id() and role=role and is_active limit 1;
$$ language sql stable;
## Policies
- `orgs`: select/update/delete if org_id = current_org_id() or is_member('admin').
- `org_members`: select if org_id=current_org_id(); insert/update/delete only admin.
- `hotels/events/spaces/event_services/production_*`: enable row security, policy `using (org_id=current_org_id())`.
- `products/purchase_*`: same `using` predicate; allow insert only for member roles (admin/manager).
