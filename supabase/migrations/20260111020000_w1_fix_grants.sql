
-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.waste_reasons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.waste_entries TO authenticated;

-- Grant access to service_role (just in case)
GRANT ALL ON TABLE public.waste_reasons TO service_role;
GRANT ALL ON TABLE public.waste_entries TO service_role;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
