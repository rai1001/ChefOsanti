
-- Grant execute permissions to authenticated users for the logging RPC
GRANT EXECUTE ON FUNCTION public.log_event(uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_event(uuid, text, text, jsonb) TO service_role;

-- Ensure audit_logs table is accessible (though RPC handles insertion)
GRANT SELECT, INSERT ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
