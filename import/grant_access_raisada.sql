-- Grant 'owner' access to raisada1001@gmail for Hotel Atlantico

DO $$
DECLARE
    target_email TEXT := 'raisada1001@gmail';
    target_user_id UUID;
    hotel_org_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
BEGIN
    -- 1. Get User ID
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User % not found. Please ensure they have signed up.', target_email;
    ELSE
        -- 2. Insert Membership
        INSERT INTO public.org_memberships (org_id, user_id, role)
        VALUES (hotel_org_id, target_user_id, 'owner')
        ON CONFLICT (org_id, user_id) 
        DO UPDATE SET role = 'owner';
        
        RAISE NOTICE 'Access granted for % to Hotel Atlantico as OWNER.', target_email;
    END IF;
END $$;
