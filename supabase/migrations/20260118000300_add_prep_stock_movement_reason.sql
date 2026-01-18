-- Add missing enum value for preparation runs
do $$
begin
  if not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'stock_movement_reason' and e.enumlabel = 'prep') then
    alter type public.stock_movement_reason add value 'prep';
  end if;
end$$;
