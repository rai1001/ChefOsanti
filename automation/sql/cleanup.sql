-- Cleanup script to remove synthetic test data (use with caution).
truncate table public.event_purchase_orders, public.purchase_orders, public.products, public.production_tasks, public.production_plans, public.event_services, public.space_bookings, public.spaces, public.events, public.hotels, public.org_memberships, public.orgs cascade;
