
-- 1. Create Organization
INSERT INTO public.orgs (id, name, slug)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Hotel Atlantico', 'hotel-atlantico')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Hotel Entry
INSERT INTO public.hotels (org_id, name, city, country)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Hotel Atlantico', 'Vigo', 'Spain')
ON CONFLICT DO NOTHING;

-- 3. Link Current User (Run this in Supabase SQL Editor)
-- This assumes the user running the script wants to be a member
INSERT INTO public.org_memberships (org_id, user_id, role)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', auth.uid(), 'owner'
WHERE auth.uid() IS NOT NULL
ON CONFLICT (org_id, user_id) DO NOTHING;
