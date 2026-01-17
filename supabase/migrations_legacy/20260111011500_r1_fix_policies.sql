-- Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- Re-apply Grants to be sure
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reporting_generated_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reporting_generated_reports TO service_role;

-- Ensure RLS is on
ALTER TABLE reporting_generated_reports ENABLE ROW LEVEL SECURITY;

-- Re-create policies (Drop first to avoid errors if they partially exist)
DROP POLICY IF EXISTS "Users can view reports for their orgs" ON reporting_generated_reports;
DROP POLICY IF EXISTS "Users can insert reports for their orgs" ON reporting_generated_reports;

CREATE POLICY "Users can view reports for their orgs"
  ON reporting_generated_reports
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert reports for their orgs"
  ON reporting_generated_reports
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_memberships 
      WHERE user_id = auth.uid()
    )
  );
