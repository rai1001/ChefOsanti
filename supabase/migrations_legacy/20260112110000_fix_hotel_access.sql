-- RPC to allow users to join Hotel Atlantico safely
-- Bypasses RLS using SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.join_hotel_atlantico()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hotel Atlantico ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
  INSERT INTO public.org_memberships (org_id, user_id, role)
  VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', auth.uid(), 'owner')
  ON CONFLICT (org_id, user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_hotel_atlantico() TO authenticated;
