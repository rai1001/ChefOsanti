
-- Grant access to reporting tables for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reporting_generated_reports TO authenticated;
GRANT ALL ON TABLE public.reporting_generated_reports TO service_role;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
